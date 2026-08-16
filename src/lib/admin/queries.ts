import "server-only";

import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  bookingAddons,
  bookingAssignments,
  bookingDocuments,
  bookingNotes,
  bookings,
  bookingStatusHistory,
  contactSubmissions,
  contentRevisions,
  customers,
  equipment,
  faqs,
  inventoryBlocks,
  invoices,
  ledProducts,
  mediaAssets,
  pageSections,
  payments,
  pricingSettings,
  projects,
  siteSettings,
  siteStats,
  staffMfa,
  testimonials,
  users,
} from "@/db/schema";
import { requireAdmin, type AdminActor } from "@/lib/admin/authz";
import type { Permission } from "@/lib/admin/permissions";

export interface PageInput {
  page?: string | string[];
  pageSize?: string | string[];
  q?: string | string[];
  status?: string | string[];
  from?: string | string[];
  to?: string | string[];
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function pageOptions(input: PageInput) {
  const page = Math.max(1, Number.parseInt(one(input.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(10, Number.parseInt(one(input.pageSize), 10) || 25));
  return { page, pageSize, offset: (page - 1) * pageSize, q: one(input.q).trim(), status: one(input.status), from: one(input.from), to: one(input.to) };
}

async function assignedBookingIds(actor: AdminActor): Promise<number[] | null> {
  if (actor.role !== "technician") return null;
  const rows = await db.select({ bookingId: bookingAssignments.bookingId }).from(bookingAssignments)
    .where(and(eq(bookingAssignments.userId, actor.id), sql`${bookingAssignments.removedAt} IS NULL`));
  return rows.map((row) => row.bookingId);
}

export async function getAdminDashboard(input: PageInput) {
  const actor = await requireAdmin("dashboard.read");
  const { from, to } = pageOptions(input);
  const fromDate = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const toDate = to || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
  if (actor.role === "technician") {
    const assigned = await assignedBookingIds(actor) ?? [];
    const scoped = assigned.length ? await db.select().from(bookings).where(inArray(bookings.id, assigned)).orderBy(asc(bookings.installationDate)) : [];
    const today = new Date().toISOString().slice(0, 10);
    const metrics = {
      total_bookings: scoped.length,
      upcoming_bookings: scoped.filter((item) => item.eventDate && item.eventDate >= today && !["cancelled", "draft"].includes(item.status)).length,
      pending_bookings: 0,
      confirmed_bookings: scoped.filter((item) => ["confirmed", "deposit_paid", "scheduled", "equipment_prepared", "out_for_delivery", "installed", "event_running", "dismantling"].includes(item.status)).length,
      completed_bookings: scoped.filter((item) => item.status === "completed").length,
      booked_revenue: "0",
      outstanding: "0",
    };
    const upcomingJobs = scoped.filter((item) => item.dismantlingDate && item.dismantlingDate >= today && !["draft", "cancelled", "completed"].includes(item.status)).slice(0, 8).map((item) => ({ id: item.id, bookingNumber: item.bookingNumber, eventName: item.eventName, installationDate: item.installationDate, dismantlingDate: item.dismantlingDate, status: item.status }));
    const activity = await db.select().from(auditLogs).where(eq(auditLogs.actorUserId, actor.id)).orderBy(desc(auditLogs.occurredAt)).limit(10);
    return { metrics, receivedRevenue: 0, upcomingJobs, activity, utilization: [], fromDate, toDate };
  }
  const [metrics] = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total_bookings,
      COUNT(*) FILTER (WHERE event_date >= CURRENT_DATE AND status NOT IN ('cancelled','draft'))::int AS upcoming_bookings,
      COUNT(*) FILTER (WHERE status IN ('quotation_requested','pending_approval'))::int AS pending_bookings,
      COUNT(*) FILTER (WHERE status IN ('confirmed','deposit_paid','scheduled','equipment_prepared','out_for_delivery','installed','event_running','dismantling'))::int AS confirmed_bookings,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_bookings,
      COALESCE(SUM(total) FILTER (WHERE status NOT IN ('draft','cancelled') AND event_date BETWEEN ${fromDate}::date AND ${toDate}::date), 0)::numeric AS booked_revenue,
      COALESCE(SUM(GREATEST(total - amount_paid, 0)) FILTER (WHERE payment_status IN ('unpaid','partially_paid','overdue')), 0)::numeric AS outstanding
    FROM bookings
  `) as unknown as [{ total_bookings: number; upcoming_bookings: number; pending_bookings: number; confirmed_bookings: number; completed_bookings: number; booked_revenue: string; outstanding: string }];
  const [received] = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0)::numeric AS amount
    FROM payments
    WHERE record_status = 'completed' AND paid_at::date BETWEEN ${fromDate}::date AND ${toDate}::date
  `) as unknown as [{ amount: string }];
  const upcomingJobs = await db.select({
    id: bookings.id, bookingNumber: bookings.bookingNumber, eventName: bookings.eventName,
    installationDate: bookings.installationDate, dismantlingDate: bookings.dismantlingDate, status: bookings.status,
  }).from(bookings).where(and(gte(bookings.dismantlingDate, new Date().toISOString().slice(0, 10)), sql`${bookings.status} NOT IN ('draft','cancelled','completed')`))
    .orderBy(asc(bookings.installationDate)).limit(8);
  const activity = await db.select().from(auditLogs).orderBy(desc(auditLogs.occurredAt)).limit(10);
  const utilization = await db.execute(sql`
    SELECT p.id, p.name, p.total_cabinets,
      COALESCE(SUM(b.total_cabinets * (b.dismantling_date - b.installation_date + 1)) FILTER (
        WHERE b.status NOT IN ('draft','cancelled') AND b.installation_date <= ${toDate}::date AND b.dismantling_date >= ${fromDate}::date
      ), 0)::int AS reserved_cabinet_days
    FROM led_products p
    LEFT JOIN bookings b ON b.led_product_id = p.id
    WHERE p.is_active = true
    GROUP BY p.id, p.name, p.total_cabinets
    ORDER BY p.name
  `);
  return { metrics, receivedRevenue: Number(received?.amount ?? 0), upcomingJobs, activity, utilization, fromDate, toDate };
}

export async function listProducts(input: PageInput) {
  await requireAdmin("products.read");
  const options = pageOptions(input);
  const conditions: SQL[] = [];
  if (options.q) conditions.push(or(ilike(ledProducts.name, `%${options.q}%`), ilike(ledProducts.slug, `%${options.q}%`))!);
  if (options.status === "active") conditions.push(eq(ledProducts.isActive, true));
  if (options.status === "inactive") conditions.push(eq(ledProducts.isActive, false));
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db.select().from(ledProducts).where(where).orderBy(desc(ledProducts.isActive), asc(ledProducts.name)).limit(options.pageSize).offset(options.offset);
  const [{ total }] = await db.select({ total: count() }).from(ledProducts).where(where);
  const blocks = await db.select().from(inventoryBlocks).where(sql`${inventoryBlocks.archivedAt} IS NULL`).orderBy(asc(inventoryBlocks.startDate));
  return { rows, blocks, total, ...options };
}

export async function getProductDetail(id: number) {
  await requireAdmin("products.read");
  const [product] = await db.select().from(ledProducts).where(eq(ledProducts.id, id)).limit(1);
  if (!product) return null;
  const blocks = await db.select().from(inventoryBlocks).where(eq(inventoryBlocks.ledProductId, id)).orderBy(desc(inventoryBlocks.createdAt));
  return { product, blocks };
}

export async function listPricing() {
  await requireAdmin("pricing.read");
  const [settings, products, history] = await Promise.all([
    db.select().from(pricingSettings).orderBy(asc(pricingSettings.category), asc(pricingSettings.key)),
    db.select().from(ledProducts).where(eq(ledProducts.isActive, true)).orderBy(asc(ledProducts.name)),
    db.select({ log: auditLogs, actorName: users.name, actorEmail: users.email }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorUserId)).where(eq(auditLogs.entityType, "pricing")).orderBy(desc(auditLogs.occurredAt)).limit(20),
  ]);
  return { settings, products, history };
}

export async function listBookings(input: PageInput) {
  const actor = await requireAdmin("bookings.read");
  const options = pageOptions(input);
  const conditions: SQL[] = [];
  if (options.q) conditions.push(or(ilike(bookings.bookingNumber, `%${options.q}%`), ilike(bookings.eventName, `%${options.q}%`), ilike(customers.fullName, `%${options.q}%`))!);
  if (options.status) conditions.push(eq(bookings.status, options.status as typeof bookings.status.enumValues[number]));
  if (options.from) conditions.push(gte(bookings.eventDate, options.from));
  if (options.to) conditions.push(lte(bookings.eventDate, options.to));
  const assigned = await assignedBookingIds(actor);
  if (assigned) conditions.push(assigned.length ? inArray(bookings.id, assigned) : sql`false`);
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db.select({
    id: bookings.id, bookingNumber: bookings.bookingNumber, eventName: bookings.eventName, eventDate: bookings.eventDate,
    installationDate: bookings.installationDate, dismantlingDate: bookings.dismantlingDate, status: bookings.status,
    paymentStatus: bookings.paymentStatus, total: bookings.total, amountPaid: bookings.amountPaid,
    customerName: customers.fullName, productName: ledProducts.name,
  }).from(bookings).leftJoin(customers, eq(customers.id, bookings.customerId)).leftJoin(ledProducts, eq(ledProducts.id, bookings.ledProductId))
    .where(where).orderBy(desc(bookings.createdAt)).limit(options.pageSize).offset(options.offset);
  const [{ total }] = await db.select({ total: count() }).from(bookings).leftJoin(customers, eq(customers.id, bookings.customerId)).where(where);
  return { rows, total, ...options };
}

export async function getBookingDetail(id: number) {
  const actor = await requireAdmin("bookings.read");
  const assigned = await assignedBookingIds(actor);
  if (assigned && !assigned.includes(id)) return null;
  const [booking] = await db.select({ booking: bookings, customer: customers, product: ledProducts })
    .from(bookings).leftJoin(customers, eq(customers.id, bookings.customerId)).leftJoin(ledProducts, eq(ledProducts.id, bookings.ledProductId))
    .where(eq(bookings.id, id)).limit(1);
  if (!booking) return null;
  const [addons, documents, history, notes, assignments, invoiceRows, paymentRows, staff] = await Promise.all([
    db.select({ addon: bookingAddons, equipmentName: equipment.name }).from(bookingAddons).leftJoin(equipment, eq(equipment.id, bookingAddons.equipmentId)).where(eq(bookingAddons.bookingId, id)),
    db.select().from(bookingDocuments).where(eq(bookingDocuments.bookingId, id)),
    db.select({ history: bookingStatusHistory, actorName: users.name }).from(bookingStatusHistory).leftJoin(users, eq(users.id, bookingStatusHistory.changedByUserId)).where(eq(bookingStatusHistory.bookingId, id)).orderBy(asc(bookingStatusHistory.changedAtUtc)),
    db.select({ note: bookingNotes, authorName: users.name }).from(bookingNotes).leftJoin(users, eq(users.id, bookingNotes.authorUserId)).where(eq(bookingNotes.bookingId, id)).orderBy(desc(bookingNotes.createdAt)),
    db.select({ assignment: bookingAssignments, userName: users.name, userRole: users.role }).from(bookingAssignments).leftJoin(users, eq(users.id, bookingAssignments.userId)).where(eq(bookingAssignments.bookingId, id)),
    db.select().from(invoices).where(eq(invoices.bookingId, id)),
    db.select().from(payments).where(eq(payments.bookingId, id)).orderBy(desc(payments.recordedAtUtc)),
    db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(and(eq(users.isActive, true), inArray(users.role, ["operations", "technician"]))),
  ]);
  return { ...booking, addons, documents, history, notes, assignments, invoices: invoiceRows, payments: paymentRows, staff };
}

export async function listCustomers(input: PageInput) {
  await requireAdmin("customers.read");
  const options = pageOptions(input);
  const conditions: SQL[] = [];
  if (options.q) conditions.push(or(ilike(customers.fullName, `%${options.q}%`), ilike(customers.companyName, `%${options.q}%`), ilike(users.email, `%${options.q}%`))!);
  if (options.status) conditions.push(eq(customers.type, options.status as "individual" | "corporate"));
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db.select({ customer: customers, email: users.email, isActive: users.isActive }).from(customers)
    .innerJoin(users, eq(users.id, customers.userId)).where(where).orderBy(desc(customers.createdAt)).limit(options.pageSize).offset(options.offset);
  const [{ total }] = await db.select({ total: count() }).from(customers).innerJoin(users, eq(users.id, customers.userId)).where(where);
  return { rows, total, ...options };
}

export async function getCustomerDetail(id: number) {
  await requireAdmin("customers.read");
  const [customer] = await db.select({ customer: customers, user: users }).from(customers).innerJoin(users, eq(users.id, customers.userId)).where(eq(customers.id, id)).limit(1);
  if (!customer) return null;
  const bookingRows = await db.select().from(bookings).where(eq(bookings.customerId, id)).orderBy(desc(bookings.createdAt));
  const ids = bookingRows.map((row) => row.id);
  const [invoiceRows, paymentRows] = ids.length ? await Promise.all([
    db.select().from(invoices).where(inArray(invoices.bookingId, ids)), db.select().from(payments).where(inArray(payments.bookingId, ids)),
  ]) : [[], []];
  return { ...customer, bookings: bookingRows, invoices: invoiceRows, payments: paymentRows };
}

export async function listFinance(type: "payments" | "invoices", input: PageInput) {
  const permission: Permission = type === "payments" ? "payments.read" : "invoices.read";
  await requireAdmin(permission);
  const options = pageOptions(input);
  if (type === "payments") {
    const rows = await db.select({ payment: payments, bookingNumber: bookings.bookingNumber, customerName: customers.fullName })
      .from(payments).innerJoin(bookings, eq(bookings.id, payments.bookingId)).leftJoin(customers, eq(customers.id, bookings.customerId))
      .orderBy(desc(payments.recordedAtUtc)).limit(options.pageSize).offset(options.offset);
    const [{ total }] = await db.select({ total: count() }).from(payments);
    return { type: "payments" as const, rows, total, ...options };
  }
  const rows = await db.select({ invoice: invoices, bookingNumber: bookings.bookingNumber, customerName: customers.fullName, amountPaid: bookings.amountPaid })
    .from(invoices).innerJoin(bookings, eq(bookings.id, invoices.bookingId)).leftJoin(customers, eq(customers.id, bookings.customerId))
    .orderBy(desc(invoices.issuedAt)).limit(options.pageSize).offset(options.offset);
  const [{ total }] = await db.select({ total: count() }).from(invoices);
  return { type: "invoices" as const, rows, total, ...options };
}

export async function getContentAdminData() {
  await requireAdmin("content.read");
  const [sections, faqRows, testimonialRows, projectRows, statRows, revisions] = await Promise.all([
    db.select().from(pageSections).orderBy(asc(pageSections.page), asc(pageSections.sortOrder)),
    db.select().from(faqs).orderBy(asc(faqs.sortOrder)),
    db.select().from(testimonials).orderBy(asc(testimonials.sortOrder)),
    db.select().from(projects).orderBy(asc(projects.sortOrder)),
    db.select().from(siteStats).orderBy(asc(siteStats.sortOrder)),
    db.select().from(contentRevisions).orderBy(desc(contentRevisions.createdAt)).limit(100),
  ]);
  return { sections, faqs: faqRows, testimonials: testimonialRows, projects: projectRows, stats: statRows, revisions };
}

export async function listMedia(input: PageInput) {
  await requireAdmin("media.read");
  const options = pageOptions(input);
  const rows = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).limit(options.pageSize).offset(options.offset);
  const [{ total }] = await db.select({ total: count() }).from(mediaAssets);
  return { rows, total, ...options };
}

export async function listStaff() {
  await requireAdmin("users.read");
  return db.select({ id: users.id, email: users.email, name: users.name, role: users.role, isActive: users.isActive, lastLoginAt: users.lastLoginAt, sessionVersion: users.sessionVersion, mfaEnabled: sql<boolean>`${staffMfa.enabledAt} IS NOT NULL` })
    .from(users).leftJoin(staffMfa, eq(staffMfa.userId, users.id))
    .where(inArray(users.role, ["super_admin", "sales", "operations", "technician", "finance"])).orderBy(asc(users.name));
}

export async function getSettingsAdminData() {
  await requireAdmin("settings.read");
  const [settings, contacts] = await Promise.all([
    db.select().from(siteSettings).orderBy(asc(siteSettings.category), asc(siteSettings.key)),
    db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt)).limit(100),
  ]);
  return { settings, contacts };
}

export async function listAudit(input: PageInput) {
  await requireAdmin("audit.read");
  const options = pageOptions(input);
  const conditions: SQL[] = [];
  if (options.q) conditions.push(or(ilike(auditLogs.action, `%${options.q}%`), ilike(auditLogs.entityType, `%${options.q}%`), ilike(auditLogs.entityId, `%${options.q}%`))!);
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db.select({ log: auditLogs, actorName: users.name, actorEmail: users.email }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .where(where).orderBy(desc(auditLogs.occurredAt)).limit(options.pageSize).offset(options.offset);
  const [{ total }] = await db.select({ total: count() }).from(auditLogs).where(where);
  return { rows, total, ...options };
}
