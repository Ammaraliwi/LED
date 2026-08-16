import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, bookings, invoices, payments } from "@/db/schema";
import { ConflictError, ValidationError } from "@/lib/admin/errors";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function reconcileBookingFinance(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  bookingId: number,
): Promise<{ netPaid: number; paymentStatus: "unpaid" | "partially_paid" | "paid" | "overdue" | "refunded" }> {
  const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) throw new ValidationError("Booking not found");
  const paymentRows = await tx.select().from(payments).where(and(eq(payments.bookingId, bookingId), eq(payments.status, "completed")));
  const netPaid = round2(paymentRows.reduce((sum, payment) => sum + Number(payment.amount), 0));
  const total = Number(booking.total);
  const hasRefund = paymentRows.some((payment) => payment.kind !== "payment");
  let paymentStatus: "unpaid" | "partially_paid" | "paid" | "overdue" | "refunded";
  if (netPaid <= 0) paymentStatus = hasRefund ? "refunded" : "unpaid";
  else if (netPaid + 0.005 >= total) paymentStatus = "paid";
  else paymentStatus = "partially_paid";

  await tx.update(bookings).set({ amountPaid: String(Math.max(0, netPaid)), paymentStatus, updatedAt: new Date() }).where(eq(bookings.id, bookingId));
  const invoiceRows = await tx.select().from(invoices).where(eq(invoices.bookingId, bookingId));
  for (const invoice of invoiceRows) {
    const invoicePayments = paymentRows.filter((payment) => payment.invoiceId === invoice.id);
    const paid = round2(invoicePayments.reduce((sum, payment) => sum + Number(payment.amount), 0));
    // Business due dates close at 23:59:59 Asia/Qatar (UTC+03:00, no DST).
    const due = invoice.dueDate ? new Date(`${invoice.dueDate}T20:59:59.999Z`) : null;
    const status = paid <= 0
      ? hasRefund && invoicePayments.length ? "refunded" : due && due < new Date() ? "overdue" : "unpaid"
      : paid + 0.005 >= Number(invoice.amount) ? "paid"
      : due && due < new Date() ? "overdue" : "partially_paid";
    await tx.update(invoices).set({ status, updatedAt: new Date() }).where(eq(invoices.id, invoice.id));
  }
  return { netPaid: Math.max(0, netPaid), paymentStatus };
}

export async function recordPayment(input: {
  actorUserId: number;
  bookingId: number;
  invoiceId?: number | null;
  amount: number;
  method: string;
  reference?: string | null;
  notes?: string | null;
  paidAt?: Date;
  metadata?: Record<string, unknown>;
}) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(918275, ${input.bookingId})`);
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, input.bookingId)).limit(1);
    if (!booking) throw new ValidationError("Booking not found");
    if (input.amount <= 0 || !Number.isFinite(input.amount)) throw new ValidationError("Payment amount must be greater than zero");
    if (input.invoiceId) {
      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, input.invoiceId)).limit(1);
      if (!invoice || invoice.bookingId !== input.bookingId) throw new ValidationError("Invoice does not belong to this booking");
    }
    const [payment] = await tx.insert(payments).values({
      bookingId: input.bookingId,
      invoiceId: input.invoiceId ?? null,
      amount: String(round2(input.amount)),
      method: input.method,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      kind: "payment",
      status: "completed",
      recordedByUserId: input.actorUserId,
      paidAt: input.paidAt ?? new Date(),
    }).returning();
    const reconciliation = await reconcileBookingFinance(tx, input.bookingId);
    await tx.insert(auditLogs).values({
      actorUserId: input.actorUserId,
      action: "payment.recorded",
      entityType: "payment",
      entityId: String(payment.id),
      afterValue: { bookingId: input.bookingId, invoiceId: input.invoiceId ?? null, amount: round2(input.amount), method: input.method },
      metadata: input.metadata ?? {},
    });
    return { payment, reconciliation };
  });
}

export async function refundPayment(input: {
  actorUserId: number;
  paymentId: number;
  amount: number;
  notes: string;
  metadata?: Record<string, unknown>;
}) {
  return db.transaction(async (tx) => {
    const [original] = await tx.select().from(payments).where(eq(payments.id, input.paymentId)).limit(1);
    if (!original || original.kind !== "payment" || original.status !== "completed") throw new ValidationError("Refundable payment not found");
    await tx.execute(sql`SELECT pg_advisory_xact_lock(918275, ${original.bookingId})`);
    const existing = await tx.select().from(payments).where(and(eq(payments.reversalOfPaymentId, original.id), eq(payments.status, "completed")));
    const refunded = Math.abs(existing.reduce((sum, row) => sum + Number(row.amount), 0));
    if (input.amount <= 0 || refunded + input.amount > Number(original.amount) + 0.005) throw new ConflictError("Refund exceeds the remaining refundable amount");
    const [refund] = await tx.insert(payments).values({
      bookingId: original.bookingId,
      invoiceId: original.invoiceId,
      amount: String(-round2(input.amount)),
      method: original.method,
      reference: original.reference,
      notes: input.notes,
      kind: "refund",
      status: "completed",
      recordedByUserId: input.actorUserId,
      reversalOfPaymentId: original.id,
    }).returning();
    const reconciliation = await reconcileBookingFinance(tx, original.bookingId);
    await tx.insert(auditLogs).values({
      actorUserId: input.actorUserId,
      action: "payment.refunded",
      entityType: "payment",
      entityId: String(refund.id),
      beforeValue: { originalPaymentId: original.id, originalAmount: Number(original.amount) },
      afterValue: { refundAmount: round2(input.amount), bookingId: original.bookingId },
      metadata: input.metadata ?? {},
    });
    return { refund, reconciliation };
  });
}
