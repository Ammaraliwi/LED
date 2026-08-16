import assert from "node:assert/strict";
import test, { after } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bookingAddons, bookingDocuments, bookingStatusHistory, bookings, customers, invoices, ledProducts, payments, pricingSettings, users } from "@/db/schema";
import { createCustomerBooking } from "./booking-service";
import { recordPayment, refundPayment } from "@/lib/finance/service";

after(async () => { await global.__ledwave_pg_client__?.end({ timeout: 1 }); });

test("concurrent booking creation cannot overbook and preserves a price snapshot", { skip: process.env.RUN_INTEGRATION_TESTS !== "true", timeout: 20_000 }, async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const [user] = await db.insert(users).values({ email: `concurrency-${suffix}@example.test`, passwordHash: "integration-test-only", name: "Concurrency Test", role: "customer" }).returning();
  const [customer] = await db.insert(customers).values({ userId: user.id, fullName: "Concurrency Test" }).returning();
  const [product] = await db.insert(ledProducts).values({ name: `P2.6 CI ${suffix}`, slug: `p2-6-ci-${suffix}`, screenType: "indoor", pixelPitch: "2.6", cabinetWidthMm: 500, cabinetHeightMm: 500, totalCabinets: 24, pricePerCabinetPerDay: "50" }).returning();
  await db.insert(pricingSettings).values([
    { key: "installation_fee_per_cabinet", value: 5 }, { key: "dismantling_fee_per_cabinet", value: 3 }, { key: "transport_fee_base", value: 200 }, { key: "transport_fee_per_cabinet", value: 1 }, { key: "technician_daily_rate", value: 100 }, { key: "processor_daily_rate", value: 150 }, { key: "minimum_rental_price", value: 1000 }, { key: "vat_percent", value: 5 }, { key: "weekend_multiplier", value: 1.1 }, { key: "corporate_discount_percent", value: 5 }, { key: "multi_day_discount_curve", value: { day1: 1, day2: 0.85, day3: 0.75, day4Plus: 0.65 }, valueType: "object" },
  ]).onConflictDoNothing();

  const input = { ledProductId: product.id, widthM: 3, heightM: 2, eventDate: "2034-08-21", installationDate: "2034-08-21", dismantlingDate: "2034-08-21", eventName: "Concurrent event", eventType: "conference" as const, venueName: "CI venue", venueAddress: "Doha", indoorOutdoor: "indoor" as const, includeInstallation: true, includeDismantling: true, includeTransport: true, includeProcessor: true, addons: [], documents: [], action: "confirmed" as const };
  let bookingIds: number[] = [];
  try {
    const attempts = await Promise.allSettled([createCustomerBooking(input, { userId: user.id, customerId: customer.id }), createCustomerBooking(input, { userId: user.id, customerId: customer.id })]);
    const fulfilled = attempts.filter((item): item is PromiseFulfilledResult<Awaited<ReturnType<typeof createCustomerBooking>>> => item.status === "fulfilled");
    const rejected = attempts.filter((item) => item.status === "rejected");
    assert.equal(fulfilled.length, 1); assert.equal(rejected.length, 1);
    const booking = fulfilled[0].value; bookingIds = [booking.id];
    assert.equal(booking.totalCabinets, 24); assert.ok(booking.pricingSnapshot); assert.ok(booking.pricingFormulaVersion); assert.equal((booking.pricingSnapshot as { breakdown?: { total?: number } }).breakdown?.total, Number(booking.total));

    const [invoice] = await db.select().from(invoices).where(eq(invoices.bookingId, booking.id)).limit(1); assert.ok(invoice);
    const paymentResult = await recordPayment({ actorUserId: user.id, bookingId: booking.id, invoiceId: invoice.id, amount: Number(booking.total), method: "bank_transfer", notes: "Integration test" });
    assert.equal(paymentResult.reconciliation.paymentStatus, "paid");
    const refundResult = await refundPayment({ actorUserId: user.id, paymentId: paymentResult.payment.id, amount: Number(booking.total), notes: "Integration reversal" });
    assert.equal(refundResult.reconciliation.paymentStatus, "refunded");
  } finally {
    if (bookingIds.length) {
      await db.delete(payments).where(inArray(payments.bookingId, bookingIds)); await db.delete(invoices).where(inArray(invoices.bookingId, bookingIds)); await db.delete(bookingStatusHistory).where(inArray(bookingStatusHistory.bookingId, bookingIds)); await db.delete(bookingDocuments).where(inArray(bookingDocuments.bookingId, bookingIds)); await db.delete(bookingAddons).where(inArray(bookingAddons.bookingId, bookingIds)); await db.delete(bookings).where(inArray(bookings.id, bookingIds));
    }
    await db.delete(ledProducts).where(eq(ledProducts.id, product.id)); await db.delete(customers).where(eq(customers.id, customer.id)); await db.delete(users).where(eq(users.id, user.id));
  }
});
