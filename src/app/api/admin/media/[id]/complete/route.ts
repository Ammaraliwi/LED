import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { requireAdmin } from "@/lib/admin/authz";
import { errorResponse, ValidationError } from "@/lib/admin/errors";
import { assertSameOrigin } from "@/lib/security/request";
import { inspectObject } from "@/lib/storage/s3";
import { imageDimensions, MAX_PRIVATE_MEDIA_BYTES, MAX_PUBLIC_MEDIA_BYTES, validateMediaBytes } from "@/lib/storage/validation";
import { writeAudit, requestAuditMetadata } from "@/lib/admin/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let mediaId = 0;
  try {
    assertSameOrigin(request);
    const actor = await requireAdmin("media.write");
    mediaId = Number((await params).id);
    const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, mediaId), eq(mediaAssets.status, "pending"))).limit(1);
    if (!asset || (asset.uploadedByUserId !== actor.id && actor.role !== "super_admin")) throw new ValidationError("Pending media asset not found");
    const inspected = await inspectObject(asset.bucket, asset.objectKey);
    const max = asset.visibility === "public" ? MAX_PUBLIC_MEDIA_BYTES : MAX_PRIVATE_MEDIA_BYTES;
    if (inspected.size !== asset.sizeBytes || inspected.size > max || inspected.contentType !== asset.mimeType) throw new ValidationError("Uploaded object metadata does not match the request");
    validateMediaBytes(inspected.bytes, asset.mimeType, asset.visibility);
    const dimensions = imageDimensions(inspected.bytes, asset.mimeType);
    const checksumSha256 = createHash("sha256").update(inspected.bytes).digest("hex");
    await db.update(mediaAssets).set({
      status: "ready",
      checksumSha256,
      widthPx: dimensions?.width ?? null,
      heightPx: dimensions?.height ?? null,
    }).where(eq(mediaAssets.id, asset.id));
    await writeAudit({ actorUserId: actor.id, action: "media.uploaded", entityType: "media_asset", entityId: asset.id, after: { visibility: asset.visibility, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes }, metadata: requestAuditMetadata(request) });
    return Response.json({ success: true, mediaAssetId: asset.id, fileUrl: `/api/media/${asset.id}/content` });
  } catch (error) {
    if (mediaId) await db.update(mediaAssets).set({ status: "quarantined" }).where(eq(mediaAssets.id, mediaId)).catch(() => undefined);
    return errorResponse(error);
  }
}
