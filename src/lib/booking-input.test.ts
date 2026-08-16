import assert from "node:assert/strict";
import test from "node:test";
import { isQatarWeekend, rentalDaysBetween, trustedBookingRequestSchema, trustedQuoteRequestSchema } from "./booking-input";

const quote = { ledProductId: 1, widthM: 3, heightM: 2, eventDate: "2026-08-21", installationDate: "2026-08-21", dismantlingDate: "2026-08-21", includeInstallation: true, includeDismantling: true, includeTransport: true, includeProcessor: true, addons: [] };

test("quote rejects client-controlled cabinet counts and prices", () => {
  for (const field of ["totalCabinets", "pricePerCabinetPerDay", "rentalDays", "isWeekend", "isCorporate", "total"]) {
    assert.equal(trustedQuoteRequestSchema.safeParse({ ...quote, [field]: 1 }).success, false, field);
  }
});

test("booking accepts only a media ID and category for documents", () => {
  const result = trustedBookingRequestSchema.safeParse({ ...quote, eventName: "Test event", eventType: "conference", venueName: "Venue", venueAddress: "Doha", indoorOutdoor: "indoor", documents: [{ mediaAssetId: 9, category: "pdf" }], action: "quotation_requested" });
  assert.equal(result.success, true);
  assert.equal(trustedBookingRequestSchema.safeParse({ ...quote, eventName: "Test event", eventType: "conference", venueName: "Venue", venueAddress: "Doha", indoorOutdoor: "indoor", documents: [{ mediaAssetId: 9, category: "pdf", fileUrl: "https://attacker.invalid" }] }).success, false);
});

test("rental dates and Qatar weekend are derived consistently", () => {
  assert.equal(rentalDaysBetween("2026-08-20", "2026-08-22"), 3);
  assert.equal(isQatarWeekend("2026-08-21"), true);
  assert.equal(isQatarWeekend("2026-08-23"), false);
  assert.equal(trustedQuoteRequestSchema.safeParse({ ...quote, installationDate: "2026-08-22", eventDate: "2026-08-21" }).success, false);
});
