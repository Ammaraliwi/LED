import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookingDocuments, bookings, mediaAssets } from "@/db/schema";
import { auth } from "@/auth";
import { requireAdmin, requireCustomer } from "@/lib/admin/authz";
import { isStaffRole } from "@/lib/admin/permissions";
import { presignObject } from "@/lib/storage/s3";
import { customerCanAccessPrivateMedia } from "@/lib/storage/access";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mediaId = Number(id);
  if (!Number.isInteger(mediaId)) return new Response("Not found", { status: 404 });
  const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, mediaId), eq(mediaAssets.status, "ready"))).limit(1);
  if (!asset) return new Response("Not found", { status: 404 });

  if (asset.visibility === "private") {
    const session = await auth();
    if (isStaffRole(session?.user?.role)) {
      await requireAdmin("media.read");
    } else {
      const identity = await requireCustomer();
      const [linkedDocument] = await db
        .select({ id: bookingDocuments.id })
        .from(bookingDocuments)
        .innerJoin(bookings, eq(bookings.id, bookingDocuments.bookingId))
        .where(and(eq(bookingDocuments.mediaAssetId, asset.id), eq(bookings.customerId, identity.customerId)))
        .limit(1);
      if (!customerCanAccessPrivateMedia({ uploaderUserId: asset.uploadedByUserId, currentUserId: identity.userId, linkedToCustomerBooking: Boolean(linkedDocument) })) return new Response("Not found", { status: 404 });
    }
  }

  redirect(presignObject({
    bucket: asset.bucket,
    objectKey: asset.objectKey,
    method: "GET",
    expiresSeconds: asset.visibility === "public" ? 300 : 60,
    responseContentDisposition: asset.visibility === "private" && asset.mimeType === "application/pdf"
      ? `attachment; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`
      : undefined,
  }));
}
