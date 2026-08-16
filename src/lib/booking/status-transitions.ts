import type { StaffRole } from "@/lib/admin/permissions";

export const BOOKING_STATUSES = [
  "draft", "quotation_requested", "pending_approval", "confirmed", "deposit_paid", "scheduled",
  "equipment_prepared", "out_for_delivery", "installed", "event_running", "dismantling", "completed", "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  draft: ["quotation_requested", "cancelled"],
  quotation_requested: ["pending_approval", "confirmed", "cancelled"],
  pending_approval: ["confirmed", "cancelled"],
  confirmed: ["deposit_paid", "scheduled", "cancelled"],
  deposit_paid: ["scheduled", "cancelled"],
  scheduled: ["equipment_prepared", "cancelled"],
  equipment_prepared: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["installed", "cancelled"],
  installed: ["event_running", "dismantling"],
  event_running: ["dismantling"],
  dismantling: ["completed"],
  completed: [],
  cancelled: [],
};

const TECHNICIAN_TARGETS = new Set<BookingStatus>(["equipment_prepared", "installed", "event_running", "dismantling", "completed"]);

export function allowedBookingTransitions(current: BookingStatus): readonly BookingStatus[] {
  return TRANSITIONS[current];
}

export function canTransitionBooking(current: BookingStatus, next: BookingStatus, role: StaffRole): boolean {
  return TRANSITIONS[current].includes(next) && (role !== "technician" || TECHNICIAN_TARGETS.has(next));
}
