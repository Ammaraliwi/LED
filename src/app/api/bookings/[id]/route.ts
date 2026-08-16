import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, bookingAddons, bookingDocuments, bookingStatusHistory, equipment, ledProducts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireCustomer } from "@/lib/admin/authz";
import { errorResponse } from "@/lib/admin/errors";
import { assertSameOrigin } from "@/lib/security/request";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const { customerId } = await requireCustomer();
  const { id } = await params;
  const bookingId = Number(id);

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking || booking.customerId !== customerId) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const [addons, documents, statusHistory, product] = await Promise.all([
    db.select().from(bookingAddons).where(eq(bookingAddons.bookingId, bookingId)),
    db.select().from(bookingDocuments).where(eq(bookingDocuments.bookingId, bookingId)),
    db.select().from(bookingStatusHistory).where(eq(bookingStatusHistory.bookingId, bookingId)),
    booking.ledProductId
      ? db.select().from(ledProducts).where(eq(ledProducts.id, booking.ledProductId)).limit(1)
      : Promise.resolve([]),
  ]);

  const equipmentIds = addons.map((a) => a.equipmentId);
  const equipmentRows = equipmentIds.length
    ? await db.select().from(equipment)
    : [];

  return NextResponse.json({
    booking,
    product: product[0] ?? null,
    addons: addons.map((a) => ({
      ...a,
      equipmentName: equipmentRows.find((e) => e.id === a.equipmentId)?.name ?? "Add-on",
    })),
    documents,
    statusHistory: statusHistory.sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime()),
  });
  } catch (error) {
    return errorResponse(error);
  }
}

const patchSchema = z.object({
  action: z.enum(["cancel"]),
});

const CANCELLABLE_STATUSES = ["draft", "quotation_requested", "pending_approval", "confirmed", "deposit_paid", "scheduled"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  assertSameOrigin(req);
  const { customerId, userId } = await requireCustomer();
  const { id } = await params;
  const bookingId = Number(id);

  const body = patchSchema.parse(await req.json());

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking || booking.customerId !== customerId) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (body.action === "cancel") {
    if (!CANCELLABLE_STATUSES.includes(booking.status)) {
      return NextResponse.json({ error: "This booking can no longer be cancelled per our policy." }, { status: 400 });
    }
    await db.transaction(async (tx) => {
      await tx.update(bookings).set({ status: "cancelled", updatedAt: new Date() }).where(eq(bookings.id, bookingId));
      await tx.insert(bookingStatusHistory).values({
        bookingId,
        previousStatus: booking.status,
        status: "cancelled",
        changedByUserId: userId,
        source: "customer",
        note: "Cancelled by customer.",
      });
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
