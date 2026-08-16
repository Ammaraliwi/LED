import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { requireAdmin, requireCustomer } from "@/lib/admin/authz";
import { errorResponse, ValidationError } from "@/lib/admin/errors";
import { isStaffRole } from "@/lib/admin/permissions";
import { assertSameOrigin, clientAddress } from "@/lib/security/request";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { bucketForVisibility, deleteObject, generateObjectKey, putObject } from "@/lib/storage/s3";
import {
  MAX_PRIVATE_MEDIA_BYTES,
  MAX_PUBLIC_MEDIA_BYTES,
  validatedImageDimensions,
  validateMediaBytes,
} from "@/lib/storage/validation";

export async function POST(request: Request) {
  let mediaId: number | null = null;
  let uploadedObject: { bucket: string; objectKey: string } | null = null;
  try {
    assertSameOrigin(request);
    const session = await auth();
    const role = session?.user?.role;
    let userId: number;
    let requestedVisibility: "public" | "private" = "private";
    if (isStaffRole(role)) {
      const actor = await requireAdmin("media.write");
      userId = actor.id;
    } else {
      const customer = await requireCustomer();
      userId = customer.userId;
    }

    const limit = await consumeRateLimit("upload", `${clientAddress(request)}:${userId}`);
    if (!limit.allowed) return NextResponse.json({ error: "Upload rate limit exceeded" }, { status: 429 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ValidationError("No file provided");
    if (isStaffRole(role) && formData.get("visibility") === "public") requestedVisibility = "public";
    const maxBytes = requestedVisibility === "public" ? MAX_PUBLIC_MEDIA_BYTES : MAX_PRIVATE_MEDIA_BYTES;
    if (file.size <= 0 || file.size > maxBytes) throw new ValidationError(`File exceeds the ${Math.floor(maxBytes / 1024 / 1024)}MB limit`);

    const bytes = new Uint8Array(await file.arrayBuffer());
    validateMediaBytes(bytes, file.type, requestedVisibility);
    const dimensions = validatedImageDimensions(bytes, file.type);
    const bucket = bucketForVisibility(requestedVisibility);
    const objectKey = generateObjectKey(requestedVisibility, file.type, randomUUID());
    const originalName = path.basename(file.name).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 255) || "upload";
    const checksumSha256 = createHash("sha256").update(bytes).digest("hex");

    const [asset] = await db.insert(mediaAssets).values({
      bucket,
      objectKey,
      originalName,
      mimeType: file.type,
      sizeBytes: file.size,
      checksumSha256,
      widthPx: dimensions?.width ?? null,
      heightPx: dimensions?.height ?? null,
      visibility: requestedVisibility,
      status: "pending",
      uploadedByUserId: userId,
    }).returning();
    mediaId = asset.id;

    await putObject(bucket, objectKey, bytes, file.type);
    uploadedObject = { bucket, objectKey };
    await db.update(mediaAssets).set({ status: "ready" }).where(eq(mediaAssets.id, asset.id));
    return NextResponse.json({
      success: true,
      mediaAssetId: asset.id,
      fileUrl: `/api/media/${asset.id}/content`,
      fileName: originalName,
      fileType: file.type,
    });
  } catch (error) {
    if (uploadedObject) {
      await deleteObject(uploadedObject.bucket, uploadedObject.objectKey).catch(() => undefined);
    }
    if (mediaId) {
      await db.update(mediaAssets).set({ status: "quarantined" }).where(eq(mediaAssets.id, mediaId)).catch(() => undefined);
    }
    return errorResponse(error);
  }
}
