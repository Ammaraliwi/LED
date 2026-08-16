import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");
const timeOnly = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour HH:MM time");
const optionalTime = z.union([timeOnly, z.literal("")]).transform((value) => value || undefined).optional();

export const addonSelectionSchema = z.object({
  equipmentId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(100),
}).strict();

export const trustedQuoteRequestSchema = z.object({
  ledProductId: z.number().int().positive(),
  widthM: z.number().positive().max(100),
  heightM: z.number().positive().max(100),
  eventDate: dateOnly,
  installationDate: dateOnly,
  dismantlingDate: dateOnly,
  includeInstallation: z.boolean().default(true),
  includeDismantling: z.boolean().default(true),
  includeTransport: z.boolean().default(true),
  includeProcessor: z.boolean().default(true),
  addons: z.array(addonSelectionSchema).max(30).default([]),
}).strict().superRefine((value, ctx) => {
  if (value.installationDate > value.eventDate || value.eventDate > value.dismantlingDate) {
    ctx.addIssue({ code: "custom", message: "Installation, event, and dismantling dates are not in a valid order" });
  }
});

export const bookingDocumentSelectionSchema = z.object({
  mediaAssetId: z.number().int().positive(),
  category: z.enum(["venue_photo", "floor_plan", "stage_drawing", "reference_image", "pdf", "other"]).default("other"),
}).strict();

export const trustedBookingRequestSchema = z.object({
  ledProductId: z.number().int().positive(),
  packageId: z.number().int().positive().nullable().optional(),
  widthM: z.number().positive().max(100),
  heightM: z.number().positive().max(100),
  eventDate: dateOnly,
  installationDate: dateOnly,
  installationTime: optionalTime,
  eventStartTime: optionalTime,
  eventEndTime: optionalTime,
  dismantlingDate: dateOnly,
  dismantlingTime: optionalTime,
  eventName: z.string().trim().min(1).max(255),
  eventType: z.enum(["conference", "exhibition", "wedding", "corporate_event", "product_launch", "festival", "private_event", "other"]),
  venueName: z.string().trim().min(1).max(255),
  venueAddress: z.string().trim().min(1).max(4_000),
  venueLat: z.number().min(-90).max(90).nullable().optional(),
  venueLng: z.number().min(-180).max(180).nullable().optional(),
  indoorOutdoor: z.enum(["indoor", "outdoor"]),
  additionalNotes: z.string().trim().max(8_000).optional(),
  includeInstallation: z.boolean().default(true),
  includeDismantling: z.boolean().default(true),
  includeTransport: z.boolean().default(true),
  includeProcessor: z.boolean().default(true),
  addons: z.array(addonSelectionSchema).max(30).default([]),
  documents: z.array(bookingDocumentSelectionSchema).max(20).default([]),
  action: z.enum(["draft", "quotation_requested", "confirmed"]).default("quotation_requested"),
}).strict().superRefine((value, ctx) => {
  if (value.installationDate > value.eventDate || value.eventDate > value.dismantlingDate) {
    ctx.addIssue({ code: "custom", message: "Installation, event, and dismantling dates are not in a valid order" });
  }
});

export type TrustedQuoteRequest = z.infer<typeof trustedQuoteRequestSchema>;
export type TrustedBookingRequest = z.infer<typeof trustedBookingRequestSchema>;

export function rentalDaysBetween(start: string, end: string): number {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) throw new Error("Invalid rental dates");
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

export function isQatarWeekend(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 5 || day === 6;
}
