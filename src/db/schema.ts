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
  index,
  uniqueIndex,
  type AnyPgColumn,
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

export const mediaVisibilityEnum = pgEnum("media_visibility", ["public", "private"]);
export const mediaStatusEnum = pgEnum("media_status", ["pending", "ready", "quarantined", "deleted"]);
export const contentStatusEnum = pgEnum("content_status", ["draft", "published", "archived"]);
export const paymentRecordStatusEnum = pgEnum("payment_record_status", ["completed", "refunded", "reversed"]);
export const paymentKindEnum = pgEnum("payment_kind", ["payment", "refund", "reversal"]);
export const contactStatusEnum = pgEnum("contact_status", ["unread", "read", "resolved"]);

// ---------- USERS / AUTH ----------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("customer"),
  isActive: boolean("is_active").notNull().default(true),
  sessionVersion: integer("session_version").notNull().default(1),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const adminInvites = pgTable(
  "admin_invites",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    invitedByUserId: integer("invited_by_user_id")
      .references(() => users.id, { onDelete: "restrict" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("admin_invites_token_hash_uidx").on(table.tokenHash),
    index("admin_invites_email_idx").on(table.email),
    index("admin_invites_expires_at_idx").on(table.expiresAt),
  ],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("password_reset_tokens_hash_uidx").on(table.tokenHash),
    index("password_reset_tokens_user_idx").on(table.userId),
    index("password_reset_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

export const staffMfa = pgTable("staff_mfa", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  secretEncrypted: text("secret_encrypted").notNull(),
  recoveryCodeHashes: jsonb("recovery_code_hashes").$type<string[]>().notNull().default([]),
  enabledAt: timestamp("enabled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    id: serial("id").primaryKey(),
    scope: varchar("scope", { length: 80 }).notNull(),
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(1),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("rate_limit_scope_key_uidx").on(table.scope, table.keyHash),
    index("rate_limit_expires_at_idx").on(table.expiresAt),
  ],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: serial("id").primaryKey(),
    storageProvider: varchar("storage_provider", { length: 50 }).notNull().default("s3"),
    bucket: varchar("bucket", { length: 255 }).notNull(),
    objectKey: text("object_key").notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksumSha256: varchar("checksum_sha256", { length: 64 }),
    widthPx: integer("width_px"),
    heightPx: integer("height_px"),
    visibility: mediaVisibilityEnum("visibility").notNull().default("private"),
    status: mediaStatusEnum("status").notNull().default("pending"),
    uploadedByUserId: integer("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("media_assets_object_key_uidx").on(table.objectKey),
    index("media_assets_status_visibility_idx").on(table.status, table.visibility),
    index("media_assets_uploaded_by_idx").on(table.uploadedByUserId),
  ],
);

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
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("customers_type_idx").on(table.type),
  index("customers_created_at_idx").on(table.createdAt),
]);

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
  mediaAssetId: integer("media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  description: text("description"),
  specifications: jsonb("specifications").$type<Record<string, string | number | boolean>>().notNull().default({}),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("led_products_active_featured_idx").on(table.isActive, table.isFeatured),
  index("led_products_screen_type_idx").on(table.screenType),
]);

export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  pricePerDay: numeric("price_per_day", { precision: 10, scale: 2 }).notNull(),
  totalQuantity: integer("total_quantity").notNull().default(10),
  icon: varchar("icon", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
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
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inventoryBlocks = pgTable(
  "inventory_blocks",
  {
    id: serial("id").primaryKey(),
    ledProductId: integer("led_product_id")
      .notNull()
      .references(() => ledProducts.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    reason: varchar("reason", { length: 100 }).notNull(),
    note: text("note"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    createdByUserId: integer("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("inventory_blocks_product_dates_idx").on(table.ledProductId, table.startDate, table.endDate),
    index("inventory_blocks_active_idx").on(table.archivedAt),
  ],
);

// ---------- PRICING CONFIG (admin-editable, key/value) ----------
export const pricingSettings = pgTable("pricing_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value").notNull(),
  label: varchar("label", { length: 255 }),
  category: varchar("category", { length: 80 }).notNull().default("general"),
  description: text("description"),
  valueType: varchar("value_type", { length: 30 }).notNull().default("number"),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  // Preserve the original timezone-naive column for backward compatibility; new audit timestamps are timezone-aware.
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
  pricingSnapshot: jsonb("pricing_snapshot").$type<Record<string, unknown>>(),
  pricingFormulaVersion: varchar("pricing_formula_version", { length: 50 }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("bookings_customer_created_idx").on(table.customerId, table.createdAt),
  index("bookings_status_idx").on(table.status),
  index("bookings_payment_status_idx").on(table.paymentStatus),
  index("bookings_event_date_idx").on(table.eventDate),
  index("bookings_installation_date_idx").on(table.installationDate),
  index("bookings_dismantling_date_idx").on(table.dismantlingDate),
  index("bookings_product_dates_idx").on(table.ledProductId, table.installationDate, table.dismantlingDate),
]);

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
  mediaAssetId: integer("media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
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
  previousStatus: bookingStatusEnum("previous_status"),
  changedByUserId: integer("changed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  source: varchar("source", { length: 50 }).notNull().default("legacy"),
  note: text("note"),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  // Null on historical rows; new writes receive the timezone-aware database default.
  changedAtUtc: timestamp("changed_at_utc", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("booking_status_history_booking_time_idx").on(table.bookingId, table.changedAtUtc),
]);

export const bookingNotes = pgTable(
  "booking_notes",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    authorUserId: integer("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    note: text("note").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("booking_notes_booking_time_idx").on(table.bookingId, table.createdAt)],
);

export const bookingAssignments = pgTable(
  "booking_assignments",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assignmentRole: varchar("assignment_role", { length: 50 }).notNull(),
    assignedByUserId: integer("assigned_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("booking_assignments_booking_user_role_uidx").on(table.bookingId, table.userId, table.assignmentRole),
    index("booking_assignments_user_active_idx").on(table.userId, table.removedAt),
  ],
);

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").notNull().default("unpaid"),
  dueDate: date("due_date"),
  notes: text("notes"),
  createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("invoices_booking_idx").on(table.bookingId),
  index("invoices_status_due_idx").on(table.status, table.dueDate),
]);

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  method: varchar("method", { length: 50 }).notNull().default("bank_transfer"),
  reference: varchar("reference", { length: 255 }),
  kind: paymentKindEnum("kind").notNull().default("payment"),
  status: paymentRecordStatusEnum("record_status").notNull().default("completed"),
  notes: text("notes"),
  recordedByUserId: integer("recorded_by_user_id").references(() => users.id, { onDelete: "set null" }),
  reversalOfPaymentId: integer("reversal_of_payment_id").references((): AnyPgColumn => payments.id, { onDelete: "restrict" }),
  paidAt: timestamp("paid_at").notNull().defaultNow(),
  // Null on historical rows; new finance writes receive the timezone-aware database default.
  recordedAtUtc: timestamp("recorded_at_utc", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("payments_booking_time_idx").on(table.bookingId, table.recordedAtUtc),
  index("payments_invoice_idx").on(table.invoiceId),
  index("payments_status_kind_idx").on(table.status, table.kind),
]);

// ---------- CONTENT (homepage, editable later via admin) ----------
export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  quote: text("quote").notNull(),
  avatarUrl: text("avatar_url"),
  rating: integer("rating").notNull().default(5),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  imageUrl: text("image_url").notNull(),
  mediaAssetId: integer("media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  description: text("description"),
  eventDate: date("event_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
});

export const siteStats = pgTable("site_stats", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 255 }).notNull(),
  value: varchar("value", { length: 50 }).notNull(),
  suffix: varchar("suffix", { length: 20 }),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
});

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
});

export const siteSettings = pgTable(
  "site_settings",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 120 }).notNull(),
    value: jsonb("value").notNull(),
    label: varchar("label", { length: 255 }),
    category: varchar("category", { length: 80 }).notNull().default("general"),
    updatedByUserId: integer("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("site_settings_key_uidx").on(table.key)],
);

export const pageSections = pgTable(
  "page_sections",
  {
    id: serial("id").primaryKey(),
    page: varchar("page", { length: 100 }).notNull(),
    sectionKey: varchar("section_key", { length: 120 }).notNull(),
    locale: varchar("locale", { length: 10 }).notNull().default("en"),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    publishedContent: jsonb("published_content").$type<Record<string, unknown>>(),
    publishedVersion: integer("published_version"),
    publishedIsVisible: boolean("published_is_visible").notNull().default(false),
    status: contentStatusEnum("status").notNull().default("draft"),
    isVisible: boolean("is_visible").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    version: integer("version").notNull().default(1),
    updatedByUserId: integer("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
    publishedByUserId: integer("published_by_user_id").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("page_sections_page_key_locale_uidx").on(table.page, table.sectionKey, table.locale),
    index("page_sections_publish_idx").on(table.page, table.status, table.isVisible, table.sortOrder),
  ],
);

export const contentRevisions = pgTable(
  "content_revisions",
  {
    id: serial("id").primaryKey(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: integer("entity_id").notNull(),
    version: integer("version").notNull(),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("content_revisions_entity_version_uidx").on(table.entityType, table.entityId, table.version),
    index("content_revisions_entity_time_idx").on(table.entityType, table.entityId, table.createdAt),
  ],
);

export const contactSubmissions = pgTable(
  "contact_submissions",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 60 }),
    message: text("message").notNull(),
    status: contactStatusEnum("status").notNull().default("unread"),
    internalNote: text("internal_note"),
    resolvedByUserId: integer("resolved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("contact_submissions_status_time_idx").on(table.status, table.createdAt),
    index("contact_submissions_email_idx").on(table.email),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorUserId: integer("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: varchar("entity_id", { length: 120 }),
    beforeValue: jsonb("before_value").$type<Record<string, unknown>>(),
    afterValue: jsonb("after_value").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_actor_time_idx").on(table.actorUserId, table.occurredAt),
    index("audit_logs_entity_time_idx").on(table.entityType, table.entityId, table.occurredAt),
    index("audit_logs_action_time_idx").on(table.action, table.occurredAt),
  ],
);

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
