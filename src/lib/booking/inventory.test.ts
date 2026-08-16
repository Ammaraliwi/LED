import assert from "node:assert/strict";
import test from "node:test";
import { availableCabinets, canReserve } from "./inventory";

test("availability subtracts bookings and maintenance blocks", () => {
  assert.equal(availableCabinets(100, { reservedCabinets: 55, blockedCabinets: 20 }), 25);
  assert.equal(canReserve(100, 25, { reservedCabinets: 55, blockedCabinets: 20 }), true);
  assert.equal(canReserve(100, 26, { reservedCabinets: 55, blockedCabinets: 20 }), false);
});

test("availability never reports a negative number", () => {
  assert.equal(availableCabinets(24, { reservedCabinets: 24, blockedCabinets: 5 }), 0);
});
