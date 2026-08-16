import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { requireAdmin } from "@/lib/admin/authz";
import { errorResponse, ValidationError } from "@/lib/admin/errors";
import { assertSameOrigin, clientAddress } from "@/lib/security/request";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { bucketForVisibility, generateObjectKey, presignObject } from "@/lib/storage/s3";
import { MAX_PRIVATE_MEDIA_BYTES, MAX_PUBLIC_MEDIA_BYTES, PRIVATE_MEDIA_TYPES, PUBLIC_MEDIA_TYPES } from "@/lib/storage/validation";

const schema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(100),
  sizeBytes: z.number().int().positive(),
  visibility: z.enum(["public", "private"]),
}).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdmin("media.write");
    const rateLimit = await consumeRateLimit("upload", `${clientAddress(request)}:${actor.id}`);
    if (!rateLimit.allowed) return Response.json({ error: "Upload rate limit exceeded" }, { status: 429 });
    const input = schema.parse(await request.json());
    const allowed = input.visibility === "public" ? PUBLIC_MEDIA_TYPES : PRIVATE_MEDIA_TYPES;
    const max = input.visibility === "public" ? MAX_PUBLIC_MEDIA_BYTES : MAX_PRIVATE_MEDIA_BYTES;
    if (!(allowed as readonly string[]).includes(input.mimeType) || input.sizeBytes > max) throw new ValidationError("Unsupported file type or size");
    const bucket = bucketForVisibility(input.visibility);
    const objectKey = generateObjectKey(input.visibility, input.mimeType, randomUUID());
    const [asset] = await db.insert(mediaAssets).values({
      bucket,
      objectKey,
      originalName: path.basename(input.fileName).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 255),
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      visibility: input.visibility,
      status: "pending",
      uploadedByUserId: actor.id,
    }).returning();
    return Response.json({
      mediaAssetId: asset.id,
      objectKey,
      uploadUrl: presignObject({ bucket, objectKey, method: "PUT", expiresSeconds: 180 }),
      expiresIn: 180,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
