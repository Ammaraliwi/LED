import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  time,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- ENUMS ----------
export const userRoleEnum = pgEnum("user_role", [
  "customer",
  "super_admin",
  "sales",
  "operations",
  "technician",
  "finance",
]);

export const customerTypeEnum = pgEnum("customer_type", ["individual", "corporate"]);

export const screenTypeEnum = pgEnum("screen_type", ["indoor", "outdoor"]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "draft",
  "quotation_requested",
  "pending_approval",
  "confirmed",
  "deposit_paid",
  "scheduled",
  "equipment_prepared",
  "out_for_delivery",
  "installed",
  "event_running",
  "dismantling",
  "completed",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "partially_paid",
  "paid",
  "overdue",
  "refunded",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "conference",
  "exhibition",
  "wedding",
  "corporate_event",
  "product_launch",
  "festival",
  "private_event",
  "other",
]);

export const documentCategoryEnum = pgEnum("document_category", [
  "venue_photo",
  "floor_plan",
  "stage_drawing",
  "reference_image",
  "pdf",
  "other",
]);

// ---------- USERS / AUTH ----------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("customer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  type: customerTypeEnum("type").notNull().default("individual"),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  companyName: varchar("company_name", { length: 255 }),
  companyRegNumber: varchar("company_reg_number", { length: 100 }),
  taxNumber: varchar("tax_number", { length: 100 }),
  mobileNumber: varchar("mobile_number", { length: 50 }),
  whatsappNumber: varchar("whatsapp_number", { length: 50 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  billingAddress: text("billing_address"),
  internalNotes: text("internal_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- LED PRODUCTS / CATALOG ----------
export const ledProducts = pgTable("led_products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  screenType: screenTypeEnum("screen_type").notNull(),
  pixelPitch: numeric("pixel_pitch", { precision: 4, scale: 2 }).notNull(), // e.g. 2.6
  cabinetWidthMm: integer("cabinet_width_mm").notNull().default(500),
  cabinetHeightMm: integer("cabinet_height_mm").notNull().default(500),
  brightnessNits: integer("brightness_nits"),
  refreshRateHz: integer("refresh_rate_hz"),
  totalCabinets: integer("total_cabinets").notNull().default(0),
  pricePerCabinetPerDay: numeric("price_per_cabinet_per_day", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  description: text("description"),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  pricePerDay: numeric("price_per_day", { precision: 10, scale: 2 }).notNull(),
  totalQuantity: integer("total_quantity").notNull().default(10),
  icon: varchar("icon", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  startingPrice: numeric("starting_price", { precision: 10, scale: 2 }).notNull(),
  recommendedEventSize: varchar("recommended_event_size", { length: 255 }),
  includes: jsonb("includes").$type<string[]>().notNull().default([]),
  imageUrl: text("image_url"),
  screenTypeSuggestion: varchar("screen_type_suggestion", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- PRICING CONFIG (admin-editable, key/value) ----------
export const pricingSettings = pgTable("pricing_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value").notNull(),
  label: varchar("label", { length: 255 }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- BOOKINGS ----------
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  bookingNumber: varchar("booking_number", { length: 50 }).notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),

  // Screen configuration
  ledProductId: integer("led_product_id").references(() => ledProducts.id),
  screenType: screenTypeEnum("screen_type"),
  pixelPitch: numeric("pixel_pitch", { precision: 4, scale: 2 }),
  widthM: numeric("width_m", { precision: 6, scale: 2 }),
  heightM: numeric("height_m", { precision: 6, scale: 2 }),
  totalCabinets: integer("total_cabinets"),
  areaM2: numeric("area_m2", { precision: 8, scale: 2 }),
  aspectRatio: varchar("aspect_ratio", { length: 20 }),
  resolutionEstimate: varchar("resolution_estimate", { length: 50 }),

  // Package (optional, if booked via package instead of custom configurator)
  packageId: integer("package_id").references(() => packages.id),

  // Rental duration
  eventDate: date("event_date"),
  installationDate: date("installation_date"),
  installationTime: time("installation_time"),
  eventStartTime: time("event_start_time"),
  eventEndTime: time("event_end_time"),
  dismantlingDate: date("dismantling_date"),
  dismantlingTime: time("dismantling_time"),
  rentalDays: integer("rental_days").notNull().default(1),

  // Event info
  eventName: varchar("event_name", { length: 255 }),
  eventType: eventTypeEnum("event_type"),
  venueName: varchar("venue_name", { length: 255 }),
  venueAddress: text("venue_address"),
  venueLat: numeric("venue_lat", { precision: 10, scale: 7 }),
  venueLng: numeric("venue_lng", { precision: 10, scale: 7 }),
  indoorOutdoor: varchar("indoor_outdoor", { length: 20 }),
  additionalNotes: text("additional_notes"),

  // Services selected (booleans + qty stored in booking_addons for equipment;
  // core services flagged here for pricing engine)
  includeInstallation: boolean("include_installation").notNull().default(true),
  includeDismantling: boolean("include_dismantling").notNull().default(true),
  includeTransport: boolean("include_transport").notNull().default(true),
  includeProcessor: boolean("include_processor").notNull().default(true),
  includeTechnician: boolean("include_technician").notNull().default(true),

  // Pricing
  rentalSubtotal: numeric("rental_subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  installationFee: numeric("installation_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  dismantlingFee: numeric("dismantling_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  transportFee: numeric("transport_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  processorFee: numeric("processor_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  technicianFee: numeric("technician_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  addonsTotal: numeric("addons_total", { precision: 10, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  discountLabel: varchar("discount_label", { length: 255 }),
  vatAmount: numeric("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  vatPercent: numeric("vat_percent", { precision: 5, scale: 2 }).notNull().default("5"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: varchar("currency", { length: 10 }).notNull().default("QAR"),

  status: bookingStatusEnum("status").notNull().default("draft"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
  amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }).notNull().default("0"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const bookingAddons = pgTable("booking_addons", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  equipmentId: integer("equipment_id")
    .notNull()
    .references(() => equipment.id),
  quantity: integer("quantity").notNull().default(1),
  priceEach: numeric("price_each", { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
});

export const bookingDocuments = pgTable("booking_documents", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 100 }),
  category: documentCategoryEnum("category").notNull().default("other"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const bookingStatusHistory = pgTable("booking_status_history", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  status: bookingStatusEnum("status").notNull(),
  note: text("note"),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").notNull().default("unpaid"),
  dueDate: date("due_date"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  method: varchar("method", { length: 50 }).notNull().default("bank_transfer"),
  reference: varchar("reference", { length: 255 }),
  paidAt: timestamp("paid_at").notNull().defaultNow(),
});

// ---------- CONTENT (homepage, editable later via admin) ----------
export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  quote: text("quote").notNull(),
  avatarUrl: text("avatar_url"),
  rating: integer("rating").notNull().default(5),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  imageUrl: text("image_url").notNull(),
  description: text("description"),
  eventDate: date("event_date"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const siteStats = pgTable("site_stats", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 255 }).notNull(),
  value: varchar("value", { length: 50 }).notNull(),
  suffix: varchar("suffix", { length: 20 }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------- RELATIONS ----------
export const usersRelations = relations(users, ({ one }) => ({
  customer: one(customers, { fields: [users.id], references: [customers.userId] }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, { fields: [customers.userId], references: [users.id] }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  customer: one(customers, { fields: [bookings.customerId], references: [customers.id] }),
  ledProduct: one(ledProducts, { fields: [bookings.ledProductId], references: [ledProducts.id] }),
  package: one(packages, { fields: [bookings.packageId], references: [packages.id] }),
  addons: many(bookingAddons),
  documents: many(bookingDocuments),
  statusHistory: many(bookingStatusHistory),
  invoices: many(invoices),
  payments: many(payments),
}));

export const bookingAddonsRelations = relations(bookingAddons, ({ one }) => ({
  booking: one(bookings, { fields: [bookingAddons.bookingId], references: [bookings.id] }),
  equipment: one(equipment, { fields: [bookingAddons.equipmentId], references: [equipment.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  booking: one(bookings, { fields: [invoices.bookingId], references: [bookings.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
}));
