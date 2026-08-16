import assert from "node:assert/strict";
import test from "node:test";
import { allowedBookingTransitions, canTransitionBooking } from "./status-transitions";

test("unsafe booking status jumps are rejected", () => {
  assert.equal(canTransitionBooking("quotation_requested", "completed", "super_admin"), false);
  assert.equal(canTransitionBooking("quotation_requested", "confirmed", "sales"), true);
  assert.deepEqual(allowedBookingTransitions("completed"), []);
});

test("technicians can only advance assigned operational stages", () => {
  assert.equal(canTransitionBooking("scheduled", "equipment_prepared", "technician"), true);
  assert.equal(canTransitionBooking("quotation_requested", "confirmed", "technician"), false);
});
