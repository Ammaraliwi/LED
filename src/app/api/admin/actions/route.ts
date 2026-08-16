import { and, count, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  adminInvites,
  auditLogs,
  bookingAssignments,
  bookingDocuments,
  bookingNotes,
  bookings,
  bookingStatusHistory,
  contactSubmissions,
  contentRevisions,
  customers,
  faqs,
  inventoryBlocks,
  invoices,
  ledProducts,
  mediaAssets,
  pageSections,
  pricingSettings,
  projects,
  siteSettings,
  siteStats,
  staffMfa,
  testimonials,
  users,
} from "@/db/schema";
import { adminActionSchema, type AdminAction } from "@/lib/admin/action-schema";
import { requireAdmin, type AdminActor } from "@/lib/admin/authz";
import { ConflictError, errorResponse, ValidationError } from "@/lib/admin/errors";
import type { Permission } from "@/lib/admin/permissions";
import { hasPermission } from "@/lib/admin/permissions";
import { requestAuditMetadata, sanitizeAuditValue } from "@/lib/admin/audit";
import { canTransitionBooking } from "@/lib/booking/status-transitions";
import { parsePageSection, parseSiteSetting, SITE_SETTING_DEFINITIONS } from "@/lib/cms/schemas";
import { reconcileBookingFinance, recordPayment, refundPayment } from "@/lib/finance/service";
import { PRICING_DEFINITIONS, parsePricingValue } from "@/lib/pricing-catalog";
import { sendNotification } from "@/lib/notifications";
import { assertSameOrigin, clientAddress, randomToken, sha256 } from "@/lib/security/request";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { generateInvoiceNumber } from "@/lib/settings";
import { deleteObject } from "@/lib/storage/s3";

function permissionFor(action: AdminAction["action"]): Permission {
  if (action.startsWith("product.")) return "products.write";
  if (action.startsWith("inventory.")) return "inventory.write";
  if (action === "pricing.update") return "pricing.write";
  if (action === "booking.update_status") return "bookings.update_status";
  if (action.startsWith("booking.")) return "bookings.write";
  if (action === "customer.update") return "customers.write";
  if (action.startsWith("payment.")) return "payments.record";
  if (action.startsWith("invoice.")) return "invoices.write";
  if (action === "content.section_save" || action === "content.record_save" || action === "content.record_archive") return "content.write";
  if (action === "media.archive") return "media.write";
  if (action === "staff.invite" || action === "staff.update") return "users.manage";
  if (action === "setting.update") return "settings.write";
  return "content.write";
}

function auditValues(input: {
  actor: AdminActor;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  before?: unknown;
  after?: unknown;
  metadata: Record<string, unknown>;
}) {
  return {
    actorUserId: input.actor.id,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId == null ? null : String(input.entityId),
    beforeValue: sanitizeAuditValue(input.before),
    afterValue: sanitizeAuditValue(input.after),
    metadata: input.metadata,
  };
}

async function requirePublicMedia(mediaAssetId: number | null | undefined) {
  if (!mediaAssetId) return null;
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaAssetId)).limit(1);
  if (!asset || asset.status !== "ready" || asset.visibility !== "public" || !asset.mimeType.startsWith("image/")) {
    throw new ValidationError("A ready public image is required");
  }
  return asset;
}

async function archiveMediaAsset(id: number, actor: AdminActor, metadata: Record<string, unknown>) {
  const before = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(918281, ${id})`);
    const [asset] = await tx.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
    if (!asset) throw new ValidationError("Media asset not found");
    if (asset.status === "deleted") return asset;
    const [{ productReferences }] = await tx.select({ productReferences: count() }).from(ledProducts).where(eq(ledProducts.mediaAssetId, id));
    const [{ projectReferences }] = await tx.select({ projectReferences: count() }).from(projects).where(eq(projects.mediaAssetId, id));
    const [{ documentReferences }] = await tx.select({ documentReferences: count() }).from(bookingDocuments).where(eq(bookingDocuments.mediaAssetId, id));
    const referenceCount = productReferences + projectReferences + documentReferences;
    if (referenceCount > 0) throw new ConflictError(`This asset is still referenced by ${referenceCount} record(s). Replace those references before deleting it.`);
    await tx.update(mediaAssets).set({ status: "quarantined" }).where(eq(mediaAssets.id, id));
    return asset;
  });
  if (before.status === "deleted") return { asset: before };
  try {
    await deleteObject(before.bucket, before.objectKey);
  } catch {
    await db.insert(auditLogs).values(auditValues({ actor, action: "media.deletion_failed", entityType: "media_asset", entityId: before.id, before, after: { status: "quarantined" }, metadata }));
    throw new ConflictError("The object could not be deleted from storage and remains quarantined. Retry after checking the bucket connection.");
  }
  return db.transaction(async (tx) => {
    const [asset] = await tx.update(mediaAssets).set({ status: "deleted", deletedAt: new Date() }).where(and(eq(mediaAssets.id, id), eq(mediaAssets.status, "quarantined"))).returning();
    if (!asset) throw new ConflictError("Media deletion state changed; refresh and try again.");
    await tx.insert(auditLogs).values(auditValues({ actor, action: "media.deleted", entityType: "media_asset", entityId: asset.id, before, after: asset, metadata }));
    return { asset };
  });
}

async function peakCommittedInventory(executor: { execute: typeof db.execute }, productId: number): Promise<number> {
  const result = await executor.execute(sql`
    SELECT COALESCE(MAX(usage.reserved + usage.blocked), 0)::int AS peak
    FROM (
      SELECT day.value::date,
        COALESCE((SELECT SUM(total_cabinets) FROM bookings b WHERE b.led_product_id = ${productId} AND b.status NOT IN ('draft','cancelled') AND b.installation_date <= day.value::date AND b.dismantling_date >= day.value::date), 0)::int AS reserved,
        COALESCE((SELECT SUM(quantity) FROM inventory_blocks i WHERE i.led_product_id = ${productId} AND i.archived_at IS NULL AND i.start_date <= day.value::date AND i.end_date >= day.value::date), 0)::int AS blocked
      FROM generate_series(CURRENT_DATE - interval '1 year', CURRENT_DATE + interval '3 years', interval '1 day') day(value)
    ) usage
  `);
  return Number((result[0] as { peak?: number } | undefined)?.peak ?? 0);
}

async function handleProduct(action: Extract<AdminAction, { action: `product.${string}` }>, actor: AdminActor, metadata: Record<string, unknown>) {
  if (action.action === "product.create") {
    const asset = await requirePublicMedia(action.data.mediaAssetId);
    const [product] = await db.insert(ledProducts).values({
      ...action.data,
      pixelPitch: String(action.data.pixelPitch),
      pricePerCabinetPerDay: String(action.data.pricePerCabinetPerDay),
      imageUrl: asset ? `/api/media/${asset.id}/content` : null,
      updatedByUserId: actor.id,
    }).returning();
    await db.insert(auditLogs).values(auditValues({ actor, action: "product.created", entityType: "led_product", entityId: product.id, after: product, metadata }));
    return { product };
  }
  if (action.action === "product.archive") {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(918273, ${action.id})`);
      const [before] = await tx.select().from(ledProducts).where(eq(ledProducts.id, action.id)).limit(1);
      if (!before) throw new ValidationError("Product not found");
      const [product] = await tx.update(ledProducts).set({ isActive: false, archivedAt: new Date(), updatedAt: new Date(), updatedByUserId: actor.id }).where(eq(ledProducts.id, action.id)).returning();
      await tx.insert(auditLogs).values(auditValues({ actor, action: "product.archived", entityType: "led_product", entityId: product.id, before, after: product, metadata }));
      return { product };
    });
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(918273, ${action.id})`);
    const [before] = await tx.select().from(ledProducts).where(eq(ledProducts.id, action.id)).limit(1);
    if (!before) throw new ValidationError("Product not found");
    const structuralChange = before.screenType !== action.data.screenType || Number(before.pixelPitch) !== action.data.pixelPitch || before.cabinetWidthMm !== action.data.cabinetWidthMm || before.cabinetHeightMm !== action.data.cabinetHeightMm;
    if (structuralChange) {
      const [{ total }] = await tx.select({ total: count() }).from(bookings).where(eq(bookings.ledProductId, before.id));
      if (total > 0) throw new ConflictError("Pitch, type, and cabinet dimensions cannot change after a product has booking history. Archive it and create a new product.");
    }
    const peak = await peakCommittedInventory(tx, before.id);
    if (action.data.totalCabinets < peak) throw new ConflictError(`Inventory cannot be lower than the committed peak of ${peak} cabinets`);
    let imageUrl = before.imageUrl;
    let mediaAssetId = before.mediaAssetId;
    if (action.data.mediaAssetId) {
      const [asset] = await tx.select().from(mediaAssets).where(eq(mediaAssets.id, action.data.mediaAssetId)).limit(1);
      if (!asset || asset.status !== "ready" || asset.visibility !== "public" || !asset.mimeType.startsWith("image/")) throw new ValidationError("A ready public image is required");
      imageUrl = `/api/media/${asset.id}/content`;
      mediaAssetId = asset.id;
    } else if (action.data.mediaAssetId === null) {
      imageUrl = null;
      mediaAssetId = null;
    }
    const [product] = await tx.update(ledProducts).set({ ...action.data, mediaAssetId, pixelPitch: String(action.data.pixelPitch), pricePerCabinetPerDay: String(action.data.pricePerCabinetPerDay), imageUrl, archivedAt: action.data.isActive ? null : before.archivedAt ?? new Date(), updatedAt: new Date(), updatedByUserId: actor.id }).where(eq(ledProducts.id, action.id)).returning();
    await tx.insert(auditLogs).values(auditValues({ actor, action: "product.updated", entityType: "led_product", entityId: product.id, before, after: product, metadata }));
    return { product };
  });
}

async function handleInventory(action: Extract<AdminAction, { action: `inventory.${string}` }>, actor: AdminActor, metadata: Record<string, unknown>) {
  if (action.action === "inventory.block_archive") {
    const [before] = await db.select().from(inventoryBlocks).where(eq(inventoryBlocks.id, action.id)).limit(1);
    if (!before) throw new ValidationError("Inventory block not found");
    const [block] = await db.update(inventoryBlocks).set({ archivedAt: new Date() }).where(eq(inventoryBlocks.id, action.id)).returning();
    await db.insert(auditLogs).values(auditValues({ actor, action: "inventory.block_archived", entityType: "inventory_block", entityId: block.id, before, after: block, metadata }));
    return { block };
  }
  if (action.startDate > action.endDate) throw new ValidationError("Inventory block dates are invalid");
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(918273, ${action.productId})`);
    const [product] = await tx.select().from(ledProducts).where(eq(ledProducts.id, action.productId)).limit(1);
    if (!product) throw new ValidationError("Product not found");
    const usage = await tx.execute(sql`
      SELECT COALESCE(MAX(reserved + blocked), 0)::int AS peak
      FROM (
        SELECT
          COALESCE((SELECT SUM(total_cabinets) FROM bookings b WHERE b.led_product_id = ${action.productId} AND b.status NOT IN ('draft','cancelled') AND b.installation_date <= day.value::date AND b.dismantling_date >= day.value::date), 0)::int AS reserved,
          COALESCE((SELECT SUM(quantity) FROM inventory_blocks i WHERE i.led_product_id = ${action.productId} AND i.archived_at IS NULL AND i.start_date <= day.value::date AND i.end_date >= day.value::date), 0)::int AS blocked
        FROM generate_series(${action.startDate}::date, ${action.endDate}::date, interval '1 day') day(value)
      ) daily
    `);
    const peak = Number((usage[0] as { peak?: number } | undefined)?.peak ?? 0);
    if (peak + action.quantity > product.totalCabinets) throw new ConflictError(`Only ${Math.max(0, product.totalCabinets - peak)} cabinets can be blocked for this period`);
    const [block] = await tx.insert(inventoryBlocks).values({
      ledProductId: action.productId, quantity: action.quantity, reason: action.reason, note: action.note ?? null,
      startDate: action.startDate, endDate: action.endDate, createdByUserId: actor.id,
    }).returning();
    await tx.insert(auditLogs).values(auditValues({ actor, action: "inventory.block_created", entityType: "inventory_block", entityId: block.id, after: block, metadata }));
    return { block };
  });
}

async function handlePricing(action: Extract<AdminAction, { action: "pricing.update" }>, actor: AdminActor, metadata: Record<string, unknown>) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(918274, 1)`);
    const beforeSettings = await tx.select().from(pricingSettings);
    const beforeProducts = action.productRates.length ? await tx.select().from(ledProducts).where(inArray(ledProducts.id, action.productRates.map((item) => item.productId))) : [];
    for (const setting of action.settings) {
      const parsed = parsePricingValue(setting.key, setting.value);
      const definition = PRICING_DEFINITIONS[setting.key as keyof typeof PRICING_DEFINITIONS];
      await tx.insert(pricingSettings).values({
        key: setting.key, value: parsed, label: definition.label, category: definition.category,
        description: `${definition.label}. Managed through the Admin Portal.`, valueType: setting.key === "multi_day_discount_curve" ? "object" : "number", updatedByUserId: actor.id,
      }).onConflictDoUpdate({ target: pricingSettings.key, set: { value: parsed, label: definition.label, category: definition.category, updatedByUserId: actor.id, updatedAt: new Date() } });
    }
    for (const rate of action.productRates) {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(918273, ${rate.productId})`);
      await tx.update(ledProducts).set({ pricePerCabinetPerDay: String(rate.value), updatedByUserId: actor.id, updatedAt: new Date() }).where(eq(ledProducts.id, rate.productId));
    }
    await tx.insert(auditLogs).values(auditValues({
      actor, action: "pricing.updated", entityType: "pricing", entityId: "global",
      before: { settings: beforeSettings.map((row) => ({ key: row.key, value: row.value })), products: beforeProducts.map((row) => ({ id: row.id, rate: row.pricePerCabinetPerDay })) },
      after: { settings: action.settings, productRates: action.productRates }, metadata,
    }));
    return { success: true };
  });
}

async function handleBooking(action: Extract<AdminAction, { action: `booking.${string}` }>, actor: AdminActor, metadata: Record<string, unknown>) {
  if (action.action === "booking.add_note") {
    const [booking] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.id, action.id)).limit(1);
    if (!booking) throw new ValidationError("Booking not found");
    const [note] = await db.insert(bookingNotes).values({ bookingId: action.id, authorUserId: actor.id, note: action.note }).returning();
    await db.insert(auditLogs).values(auditValues({ actor, action: "booking.note_added", entityType: "booking", entityId: action.id, after: { noteId: note.id }, metadata }));
    return { note };
  }
  if (action.action === "booking.assign") {
    const [staff] = await db.select().from(users).where(and(eq(users.id, action.userId), eq(users.isActive, true))).limit(1);
    if (!staff || staff.role !== action.assignmentRole) throw new ValidationError("Selected staff member does not match the assignment role");
    const [assignment] = await db.insert(bookingAssignments).values({ bookingId: action.id, userId: action.userId, assignmentRole: action.assignmentRole, assignedByUserId: actor.id })
      .onConflictDoUpdate({ target: [bookingAssignments.bookingId, bookingAssignments.userId, bookingAssignments.assignmentRole], set: { removedAt: null, assignedByUserId: actor.id, assignedAt: new Date() } }).returning();
    await db.insert(auditLogs).values(auditValues({ actor, action: "booking.assigned", entityType: "booking", entityId: action.id, after: assignment, metadata }));
    return { assignment };
  }
  if (action.action === "booking.unassign") {
    const [before] = await db.select().from(bookingAssignments).where(and(eq(bookingAssignments.id, action.assignmentId), eq(bookingAssignments.bookingId, action.id))).limit(1);
    if (!before) throw new ValidationError("Assignment not found");
    const [assignment] = await db.update(bookingAssignments).set({ removedAt: new Date() }).where(eq(bookingAssignments.id, before.id)).returning();
    await db.insert(auditLogs).values(auditValues({ actor, action: "booking.unassigned", entityType: "booking", entityId: action.id, before, after: assignment, metadata }));
    return { assignment };
  }
  return db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, action.id)).limit(1);
    if (!booking) throw new ValidationError("Booking not found");
    if (actor.role === "technician") {
      const [assignment] = await tx.select().from(bookingAssignments).where(and(eq(bookingAssignments.bookingId, booking.id), eq(bookingAssignments.userId, actor.id), isNull(bookingAssignments.removedAt))).limit(1);
      if (!assignment) throw new ValidationError("Technicians can update only assigned bookings");
    }
    if (!canTransitionBooking(booking.status, action.status, actor.role)) throw new ConflictError(`Transition from ${booking.status} to ${action.status} is not allowed`);
    const [updated] = await tx.update(bookings).set({ status: action.status, updatedAt: new Date() }).where(eq(bookings.id, booking.id)).returning();
    await tx.insert(bookingStatusHistory).values({ bookingId: booking.id, previousStatus: booking.status, status: action.status, changedByUserId: actor.id, source: "admin", note: action.note ?? null });
    await tx.insert(auditLogs).values(auditValues({ actor, action: "booking.status_changed", entityType: "booking", entityId: booking.id, before: { status: booking.status }, after: { status: updated.status, note: action.note ?? null }, metadata }));
    return { booking: updated };
  });
}

async function handleInvoice(action: Extract<AdminAction, { action: `invoice.${string}` }>, actor: AdminActor, metadata: Record<string, unknown>) {
  return db.transaction(async (tx) => {
    if (action.action === "invoice.create") {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(918275, ${action.bookingId})`);
      const [booking] = await tx.select().from(bookings).where(eq(bookings.id, action.bookingId)).limit(1);
      if (!booking) throw new ValidationError("Booking not found");
      const [invoice] = await tx.insert(invoices).values({ invoiceNumber: generateInvoiceNumber(), bookingId: action.bookingId, amount: String(action.amount), dueDate: action.dueDate ?? null, notes: action.notes ?? null, createdByUserId: actor.id }).returning();
      await reconcileBookingFinance(tx, booking.id);
      await tx.insert(auditLogs).values(auditValues({ actor, action: "invoice.created", entityType: "invoice", entityId: invoice.id, after: invoice, metadata }));
      return { invoice };
    }
    const [initial] = await tx.select().from(invoices).where(eq(invoices.id, action.id)).limit(1);
    if (!initial) throw new ValidationError("Invoice not found");
    await tx.execute(sql`SELECT pg_advisory_xact_lock(918275, ${initial.bookingId})`);
    const [before] = await tx.select().from(invoices).where(eq(invoices.id, action.id)).limit(1);
    if (!before) throw new ValidationError("Invoice not found");
    const paid = await tx.execute(sql`SELECT COALESCE(SUM(amount), 0)::numeric AS amount FROM payments WHERE invoice_id = ${before.id} AND record_status = 'completed'`);
    if (action.amount + 0.005 < Number((paid[0] as { amount?: string } | undefined)?.amount ?? 0)) throw new ConflictError("Invoice amount cannot be lower than its net recorded payments");
    const [invoice] = await tx.update(invoices).set({ amount: String(action.amount), dueDate: action.dueDate ?? null, notes: action.notes ?? null, updatedAt: new Date() }).where(eq(invoices.id, action.id)).returning();
    await reconcileBookingFinance(tx, before.bookingId);
    await tx.insert(auditLogs).values(auditValues({ actor, action: "invoice.updated", entityType: "invoice", entityId: invoice.id, before, after: invoice, metadata }));
    return { invoice };
  });
}

const faqSchema = z.object({ question: z.string().trim().min(2).max(5_000), answer: z.string().trim().min(2).max(10_000), sortOrder: z.number().int().min(0), isActive: z.boolean() }).strict();
const testimonialSchema = z.object({ name: z.string().trim().min(2).max(255), company: z.string().trim().max(255).nullable().optional(), quote: z.string().trim().min(2).max(5_000), rating: z.number().int().min(1).max(5), sortOrder: z.number().int().min(0), isActive: z.boolean() }).strict();
const projectSchema = z.object({ title: z.string().trim().min(2).max(255), category: z.string().trim().min(2).max(100), description: z.string().trim().max(8_000).nullable().optional(), imageUrl: z.string().trim().max(2_000), mediaAssetId: z.number().int().positive().nullable().optional(), eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), sortOrder: z.number().int().min(0), isActive: z.boolean() }).strict();
const statSchema = z.object({ label: z.string().trim().min(1).max(255), value: z.string().trim().min(1).max(50), suffix: z.string().trim().max(20).nullable().optional(), sortOrder: z.number().int().min(0), isActive: z.boolean() }).strict();

async function handleContent(action: Extract<AdminAction, { action: `content.${string}` }>, actor: AdminActor, metadata: Record<string, unknown>) {
  if (action.action === "content.section_save") {
    if (action.publish && !hasPermission(actor.role, "content.publish")) throw new ValidationError("Publishing permission is required");
    const parsed = parsePageSection(action.page, action.sectionKey, action.content);
    return db.transaction(async (tx) => {
      const [before] = await tx.select().from(pageSections).where(and(eq(pageSections.page, action.page), eq(pageSections.sectionKey, action.sectionKey), eq(pageSections.locale, action.locale))).limit(1);
      if (before) await tx.insert(contentRevisions).values({ entityType: "page_section", entityId: before.id, version: before.version, content: before.content, createdByUserId: actor.id }).onConflictDoNothing();
      const nextVersion = (before?.version ?? 0) + 1;
      const [section] = await tx.insert(pageSections).values({
        page: action.page, sectionKey: action.sectionKey, locale: action.locale, content: parsed,
        publishedContent: action.publish ? parsed : null, publishedVersion: action.publish ? nextVersion : null, publishedIsVisible: action.publish ? action.isVisible : false,
        status: action.publish ? "published" : "draft", isVisible: action.isVisible, sortOrder: action.sortOrder,
        version: nextVersion, updatedByUserId: actor.id, publishedByUserId: action.publish ? actor.id : null, publishedAt: action.publish ? new Date() : null,
      }).onConflictDoUpdate({ target: [pageSections.page, pageSections.sectionKey, pageSections.locale], set: {
        content: parsed,
        publishedContent: action.publish ? parsed : before?.publishedContent ?? null,
        publishedVersion: action.publish ? nextVersion : before?.publishedVersion ?? null,
        publishedIsVisible: action.publish ? action.isVisible : before?.publishedIsVisible ?? false,
        status: action.publish ? "published" : "draft", isVisible: action.isVisible, sortOrder: action.sortOrder,
        version: nextVersion, updatedByUserId: actor.id, updatedAt: new Date(), publishedByUserId: action.publish ? actor.id : before?.publishedByUserId ?? null, publishedAt: action.publish ? new Date() : before?.publishedAt ?? null,
      } }).returning();
      await tx.insert(auditLogs).values(auditValues({ actor, action: action.publish ? "content.published" : "content.saved", entityType: "page_section", entityId: section.id, before, after: section, metadata }));
      return { section };
    });
  }
  if (action.action === "content.record_archive") {
    const table = action.entity === "faq" ? faqs : action.entity === "testimonial" ? testimonials : action.entity === "project" ? projects : siteStats;
    const [record] = await db.update(table).set({ isActive: false, updatedAt: new Date(), updatedByUserId: actor.id }).where(eq(table.id, action.id)).returning();
    if (!record) throw new ValidationError("Content record not found");
    await db.insert(auditLogs).values(auditValues({ actor, action: "content.record_archived", entityType: action.entity, entityId: action.id, after: record, metadata }));
    return { record };
  }
  if (action.entity === "faq") {
    const data = faqSchema.parse(action.data);
    const [record] = action.id ? await db.update(faqs).set({ ...data, updatedAt: new Date(), updatedByUserId: actor.id }).where(eq(faqs.id, action.id)).returning() : await db.insert(faqs).values({ ...data, updatedByUserId: actor.id }).returning();
    await db.insert(auditLogs).values(auditValues({ actor, action: "content.faq_saved", entityType: "faq", entityId: record.id, after: record, metadata })); return { record };
  }
  if (action.entity === "testimonial") {
    const data = testimonialSchema.parse(action.data);
    const [record] = action.id ? await db.update(testimonials).set({ ...data, updatedAt: new Date(), updatedByUserId: actor.id }).where(eq(testimonials.id, action.id)).returning() : await db.insert(testimonials).values({ ...data, updatedByUserId: actor.id }).returning();
    await db.insert(auditLogs).values(auditValues({ actor, action: "content.testimonial_saved", entityType: "testimonial", entityId: record.id, after: record, metadata })); return { record };
  }
  if (action.entity === "project") {
    const data = projectSchema.parse(action.data);
    if (data.mediaAssetId) await requirePublicMedia(data.mediaAssetId);
    const normalized = { ...data, imageUrl: data.mediaAssetId ? `/api/media/${data.mediaAssetId}/content` : data.imageUrl, updatedByUserId: actor.id };
    const [record] = action.id ? await db.update(projects).set({ ...normalized, updatedAt: new Date() }).where(eq(projects.id, action.id)).returning() : await db.insert(projects).values(normalized).returning();
    await db.insert(auditLogs).values(auditValues({ actor, action: "content.project_saved", entityType: "project", entityId: record.id, after: record, metadata })); return { record };
  }
  const data = statSchema.parse(action.data);
  const [record] = action.id ? await db.update(siteStats).set({ ...data, updatedAt: new Date(), updatedByUserId: actor.id }).where(eq(siteStats.id, action.id)).returning() : await db.insert(siteStats).values({ ...data, updatedByUserId: actor.id }).returning();
  await db.insert(auditLogs).values(auditValues({ actor, action: "content.stat_saved", entityType: "stat", entityId: record.id, after: record, metadata })); return { record };
}

async function handleStaff(action: Extract<AdminAction, { action: `staff.${string}` }>, actor: AdminActor, metadata: Record<string, unknown>) {
  if (!hasPermission(actor.role, "users.manage_roles")) throw new ValidationError("Role management permission is required");
  if (action.action === "staff.invite") {
    const email = action.email.toLowerCase();
    const token = randomToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const invite = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(918280, hashtext(${email}))`);
      const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing) throw new ConflictError("An account already exists for this email");
      const [openInvite] = await tx.select({ id: adminInvites.id }).from(adminInvites).where(and(eq(adminInvites.email, email), isNull(adminInvites.acceptedAt), isNull(adminInvites.revokedAt), gt(adminInvites.expiresAt, new Date()))).limit(1);
      if (openInvite) throw new ConflictError("An active invitation already exists for this email");
      const [created] = await tx.insert(adminInvites).values({ email, role: action.role, tokenHash: sha256(token), invitedByUserId: actor.id, expiresAt }).returning();
      await tx.insert(auditLogs).values(auditValues({ actor, action: "staff.invited", entityType: "admin_invite", entityId: created.id, after: { email, role: action.role, expiresAt: expiresAt.toISOString() }, metadata }));
      return created;
    });
    const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const invitationLink = `${appUrl}/accept-invite?token=${encodeURIComponent(token)}`;
    const delivery = await sendNotification({ type: "staff_invite", recipient: email, link: invitationLink, expiresAt: expiresAt.toISOString() }).catch(() => "failed" as const);
    return { invite: { id: invite.id, email, role: action.role, expiresAt }, invitationLink, delivery };
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(918280, 1)`);
    const [target] = await tx.select().from(users).where(eq(users.id, action.id)).limit(1);
    if (!target || target.role === "customer") throw new ValidationError("Staff account not found");
    if ((action.operation === "deactivate" || action.operation === "change_role") && target.id === actor.id) throw new ConflictError("You cannot deactivate or change your own role");
    if (target.role === "super_admin" && (action.operation === "deactivate" || (action.operation === "change_role" && action.role !== "super_admin"))) {
      const [{ total }] = await tx.select({ total: count() }).from(users).where(and(eq(users.role, "super_admin"), eq(users.isActive, true)));
      if (total <= 1) throw new ConflictError("The last active super administrator cannot be removed");
    }
    const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (action.operation === "activate") updates.isActive = true;
    if (action.operation === "deactivate") { updates.isActive = false; updates.sessionVersion = target.sessionVersion + 1; }
    if (action.operation === "revoke_sessions") updates.sessionVersion = target.sessionVersion + 1;
    if (action.operation === "change_role") { if (!action.role) throw new ValidationError("A role is required"); updates.role = action.role; updates.sessionVersion = target.sessionVersion + 1; }
    if (action.operation === "reset_mfa") { await tx.delete(staffMfa).where(eq(staffMfa.userId, target.id)); updates.sessionVersion = target.sessionVersion + 1; }
    const [updated] = await tx.update(users).set(updates).where(eq(users.id, target.id)).returning({ id: users.id, email: users.email, name: users.name, role: users.role, isActive: users.isActive, sessionVersion: users.sessionVersion });
    await tx.insert(auditLogs).values(auditValues({ actor, action: `staff.${action.operation}`, entityType: "user", entityId: target.id, before: { role: target.role, isActive: target.isActive, sessionVersion: target.sessionVersion }, after: updated, metadata }));
    return { user: updated };
  });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const action = adminActionSchema.parse(await request.json());
    const actor = await requireAdmin(permissionFor(action.action));
    const metadata = requestAuditMetadata(request);
    if (["pricing.update", "payment.record", "payment.refund", "staff.invite", "staff.update"].includes(action.action)) {
      const rateLimit = await consumeRateLimit("sensitiveAdmin", `${clientAddress(request)}:${actor.id}`);
      if (!rateLimit.allowed) return Response.json({ error: "Sensitive action rate limit exceeded" }, { status: 429 });
    }

    let result: unknown;
    if (action.action.startsWith("product.")) result = await handleProduct(action as Extract<AdminAction, { action: `product.${string}` }>, actor, metadata);
    else if (action.action.startsWith("inventory.")) result = await handleInventory(action as Extract<AdminAction, { action: `inventory.${string}` }>, actor, metadata);
    else if (action.action === "pricing.update") result = await handlePricing(action, actor, metadata);
    else if (action.action.startsWith("booking.")) result = await handleBooking(action as Extract<AdminAction, { action: `booking.${string}` }>, actor, metadata);
    else if (action.action === "customer.update") {
      const [before] = await db.select().from(customers).where(eq(customers.id, action.id)).limit(1);
      if (!before) throw new ValidationError("Customer not found");
      const [customer] = await db.update(customers).set({ ...action.data, updatedAt: new Date() }).where(eq(customers.id, action.id)).returning();
      await db.insert(auditLogs).values(auditValues({ actor, action: "customer.updated", entityType: "customer", entityId: action.id, before, after: customer, metadata })); result = { customer };
    } else if (action.action === "payment.record") result = await recordPayment({ actorUserId: actor.id, bookingId: action.bookingId, invoiceId: action.invoiceId, amount: action.amount, method: action.method, reference: action.reference, notes: action.notes, paidAt: action.paidAt ? new Date(action.paidAt) : undefined, metadata });
    else if (action.action === "payment.refund") result = await refundPayment({ actorUserId: actor.id, paymentId: action.paymentId, amount: action.amount, notes: action.notes, metadata });
    else if (action.action.startsWith("invoice.")) result = await handleInvoice(action as Extract<AdminAction, { action: `invoice.${string}` }>, actor, metadata);
    else if (action.action.startsWith("content.")) result = await handleContent(action as Extract<AdminAction, { action: `content.${string}` }>, actor, metadata);
    else if (action.action === "media.archive") result = await archiveMediaAsset(action.id, actor, metadata);
    else if (action.action.startsWith("staff.")) result = await handleStaff(action as Extract<AdminAction, { action: `staff.${string}` }>, actor, metadata);
    else if (action.action === "setting.update") {
      const value = parseSiteSetting(action.key, action.value);
      const definition = SITE_SETTING_DEFINITIONS[action.key as keyof typeof SITE_SETTING_DEFINITIONS];
      const [setting] = await db.insert(siteSettings).values({ key: action.key, value, label: definition.label, category: definition.category, updatedByUserId: actor.id }).onConflictDoUpdate({ target: siteSettings.key, set: { value, label: definition.label, category: definition.category, updatedByUserId: actor.id, updatedAt: new Date() } }).returning();
      await db.insert(auditLogs).values(auditValues({ actor, action: "setting.updated", entityType: "site_setting", entityId: setting.id, after: { key: setting.key, value: setting.value }, metadata })); result = { setting };
    } else if (action.action === "contact.update") {
      const [submission] = await db.update(contactSubmissions).set({ status: action.status, internalNote: action.internalNote ?? null, resolvedByUserId: action.status === "resolved" ? actor.id : null, updatedAt: new Date() }).where(eq(contactSubmissions.id, action.id)).returning();
      if (!submission) throw new ValidationError("Contact submission not found");
      await db.insert(auditLogs).values(auditValues({ actor, action: "contact.updated", entityType: "contact_submission", entityId: submission.id, after: { status: submission.status }, metadata })); result = { submission };
    } else {
      throw new ValidationError("Unsupported administrative action");
    }
    return Response.json({ success: true, result });
  } catch (error) {
    return errorResponse(error);
  }
}
