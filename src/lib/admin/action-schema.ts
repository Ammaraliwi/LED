import { z } from "zod";
import { BOOKING_STATUSES } from "@/lib/booking/status-transitions";
import { staffRoleSchema } from "@/lib/security/schemas";

const id = z.number().int().positive();
const money = z.number().finite().min(0).max(10_000_000);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const productData = z.object({
  name: z.string().trim().min(2).max(255),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(255),
  screenType: z.enum(["indoor", "outdoor"]),
  pixelPitch: z.number().positive().max(50),
  cabinetWidthMm: z.number().int().min(100).max(5_000),
  cabinetHeightMm: z.number().int().min(100).max(5_000),
  brightnessNits: z.number().int().min(0).max(100_000).nullable().optional(),
  refreshRateHz: z.number().int().min(0).max(100_000).nullable().optional(),
  totalCabinets: z.number().int().min(0).max(100_000),
  pricePerCabinetPerDay: money,
  description: z.string().trim().max(8_000).nullable().optional(),
  mediaAssetId: id.nullable().optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  specifications: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
}).strict();

export const adminActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("product.create"), data: productData }).strict(),
  z.object({ action: z.literal("product.update"), id, data: productData }).strict(),
  z.object({ action: z.literal("product.archive"), id }).strict(),
  z.object({ action: z.literal("inventory.block_create"), productId: id, quantity: z.number().int().positive(), reason: z.string().trim().min(2).max(100), note: z.string().trim().max(2_000).nullable().optional(), startDate: dateOnly, endDate: dateOnly }).strict(),
  z.object({ action: z.literal("inventory.block_archive"), id }).strict(),
  z.object({ action: z.literal("pricing.update"), settings: z.array(z.object({ key: z.string().max(100), value: z.unknown() }).strict()).max(50), productRates: z.array(z.object({ productId: id, value: money }).strict()).max(100) }).strict(),
  z.object({ action: z.literal("booking.update_status"), id, status: z.enum(BOOKING_STATUSES), note: z.string().trim().max(2_000).nullable().optional() }).strict(),
  z.object({ action: z.literal("booking.add_note"), id, note: z.string().trim().min(1).max(8_000) }).strict(),
  z.object({ action: z.literal("booking.assign"), id, userId: id, assignmentRole: z.enum(["operations", "technician"]) }).strict(),
  z.object({ action: z.literal("booking.unassign"), id, assignmentId: id }).strict(),
  z.object({ action: z.literal("customer.update"), id, data: z.object({ type: z.enum(["individual", "corporate"]), fullName: z.string().trim().min(2).max(255), companyName: z.string().trim().max(255).nullable().optional(), companyRegNumber: z.string().trim().max(100).nullable().optional(), taxNumber: z.string().trim().max(100).nullable().optional(), mobileNumber: z.string().trim().max(50).nullable().optional(), whatsappNumber: z.string().trim().max(50).nullable().optional(), country: z.string().trim().max(100).nullable().optional(), city: z.string().trim().max(100).nullable().optional(), billingAddress: z.string().trim().max(4_000).nullable().optional(), internalNotes: z.string().trim().max(8_000).nullable().optional() }).strict() }).strict(),
  z.object({ action: z.literal("payment.record"), bookingId: id, invoiceId: id.nullable().optional(), amount: money.positive(), method: z.string().trim().min(2).max(50), reference: z.string().trim().max(255).nullable().optional(), notes: z.string().trim().max(2_000).nullable().optional(), paidAt: z.string().datetime().nullable().optional() }).strict(),
  z.object({ action: z.literal("payment.refund"), paymentId: id, amount: money.positive(), notes: z.string().trim().min(2).max(2_000) }).strict(),
  z.object({ action: z.literal("invoice.create"), bookingId: id, amount: money.positive(), dueDate: dateOnly.nullable().optional(), notes: z.string().trim().max(2_000).nullable().optional() }).strict(),
  z.object({ action: z.literal("invoice.update"), id, amount: money.positive(), dueDate: dateOnly.nullable().optional(), notes: z.string().trim().max(2_000).nullable().optional() }).strict(),
  z.object({ action: z.literal("content.section_save"), page: z.string().trim().min(1).max(100), sectionKey: z.string().trim().min(1).max(120), locale: z.string().trim().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).default("en"), content: z.record(z.string(), z.unknown()), isVisible: z.boolean(), sortOrder: z.number().int().min(0).max(10_000), publish: z.boolean().default(false) }).strict(),
  z.object({ action: z.literal("content.record_save"), entity: z.enum(["faq", "testimonial", "project", "stat"]), id: z.number().int().positive().optional(), data: z.record(z.string(), z.unknown()) }).strict(),
  z.object({ action: z.literal("content.record_archive"), entity: z.enum(["faq", "testimonial", "project", "stat"]), id }).strict(),
  z.object({ action: z.literal("media.archive"), id }).strict(),
  z.object({ action: z.literal("staff.invite"), email: z.string().trim().email().max(255), role: staffRoleSchema }).strict(),
  z.object({ action: z.literal("staff.update"), id, operation: z.enum(["activate", "deactivate", "revoke_sessions", "reset_mfa", "change_role"]), role: staffRoleSchema.optional() }).strict(),
  z.object({ action: z.literal("setting.update"), key: z.string().trim().min(1).max(120), value: z.unknown() }).strict(),
  z.object({ action: z.literal("contact.update"), id, status: z.enum(["unread", "read", "resolved"]), internalNote: z.string().trim().max(4_000).nullable().optional() }).strict(),
]);

export type AdminAction = z.infer<typeof adminActionSchema>;
