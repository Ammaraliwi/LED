CREATE TYPE "public"."contact_status" AS ENUM('unread', 'read', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('pending', 'ready', 'quarantined', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."media_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."payment_kind" AS ENUM('payment', 'refund', 'reversal');--> statement-breakpoint
CREATE TYPE "public"."payment_record_status" AS ENUM('completed', 'refunded', 'reversed');--> statement-breakpoint
CREATE TABLE "admin_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "user_role" NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"invited_by_user_id" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" integer,
	"action" varchar(120) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" varchar(120),
	"before_value" jsonb,
	"after_value" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"assignment_role" varchar(50) NOT NULL,
	"assigned_by_user_id" integer NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "booking_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"author_user_id" integer NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(60),
	"message" text NOT NULL,
	"status" "contact_status" DEFAULT 'unread' NOT NULL,
	"internal_note" text,
	"resolved_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" integer NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"led_product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"reason" varchar(100) NOT NULL,
	"note" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"storage_provider" varchar(50) DEFAULT 's3' NOT NULL,
	"bucket" varchar(255) NOT NULL,
	"object_key" text NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum_sha256" varchar(64),
	"width_px" integer,
	"height_px" integer,
	"visibility" "media_visibility" DEFAULT 'private' NOT NULL,
	"status" "media_status" DEFAULT 'pending' NOT NULL,
	"uploaded_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "page_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"page" varchar(100) NOT NULL,
	"section_key" varchar(120) NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"content" jsonb NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by_user_id" integer,
	"published_by_user_id" integer,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" varchar(80) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(120) NOT NULL,
	"value" jsonb NOT NULL,
	"label" varchar(255),
	"category" varchar(80) DEFAULT 'general' NOT NULL,
	"updated_by_user_id" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_mfa" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"secret_encrypted" text NOT NULL,
	"recovery_code_hashes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_documents" ADD COLUMN "media_asset_id" integer;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD COLUMN "previous_status" "booking_status";--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD COLUMN "changed_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD COLUMN "source" varchar(50) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD COLUMN "changed_at_utc" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "booking_status_history" ALTER COLUMN "changed_at_utc" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "pricing_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "pricing_formula_version" varchar(50);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "equipment" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "equipment" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "equipment" ADD COLUMN "updated_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "updated_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "created_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "led_products" ADD COLUMN "media_asset_id" integer;--> statement-breakpoint
ALTER TABLE "led_products" ADD COLUMN "specifications" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "led_products" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "led_products" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "led_products" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "led_products" ADD COLUMN "updated_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "updated_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "kind" "payment_kind" DEFAULT 'payment' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "record_status" "payment_record_status" DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "recorded_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "reversal_of_payment_id" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "recorded_at_utc" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "recorded_at_utc" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "category" varchar(80) DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "value_type" varchar(30) DEFAULT 'number' NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "updated_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "media_asset_id" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "site_stats" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "site_stats" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "site_stats" ADD COLUMN "updated_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "updated_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_invites" ADD CONSTRAINT "admin_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_assignments" ADD CONSTRAINT "booking_assignments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_assignments" ADD CONSTRAINT "booking_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_assignments" ADD CONSTRAINT "booking_assignments_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_notes" ADD CONSTRAINT "booking_notes_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_notes" ADD CONSTRAINT "booking_notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_blocks" ADD CONSTRAINT "inventory_blocks_led_product_id_led_products_id_fk" FOREIGN KEY ("led_product_id") REFERENCES "public"."led_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_blocks" ADD CONSTRAINT "inventory_blocks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_mfa" ADD CONSTRAINT "staff_mfa_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_invites_token_hash_uidx" ON "admin_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_invites_email_idx" ON "admin_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "admin_invites_expires_at_idx" ON "admin_invites" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_time_idx" ON "audit_logs" USING btree ("actor_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_time_idx" ON "audit_logs" USING btree ("entity_type","entity_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_logs_action_time_idx" ON "audit_logs" USING btree ("action","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_assignments_booking_user_role_uidx" ON "booking_assignments" USING btree ("booking_id","user_id","assignment_role");--> statement-breakpoint
CREATE INDEX "booking_assignments_user_active_idx" ON "booking_assignments" USING btree ("user_id","removed_at");--> statement-breakpoint
CREATE INDEX "booking_notes_booking_time_idx" ON "booking_notes" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE INDEX "contact_submissions_status_time_idx" ON "contact_submissions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "contact_submissions_email_idx" ON "contact_submissions" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "content_revisions_entity_version_uidx" ON "content_revisions" USING btree ("entity_type","entity_id","version");--> statement-breakpoint
CREATE INDEX "content_revisions_entity_time_idx" ON "content_revisions" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_blocks_product_dates_idx" ON "inventory_blocks" USING btree ("led_product_id","start_date","end_date");--> statement-breakpoint
CREATE INDEX "inventory_blocks_active_idx" ON "inventory_blocks" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_object_key_uidx" ON "media_assets" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "media_assets_status_visibility_idx" ON "media_assets" USING btree ("status","visibility");--> statement-breakpoint
CREATE INDEX "media_assets_uploaded_by_idx" ON "media_assets" USING btree ("uploaded_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "page_sections_page_key_locale_uidx" ON "page_sections" USING btree ("page","section_key","locale");--> statement-breakpoint
CREATE INDEX "page_sections_publish_idx" ON "page_sections" USING btree ("page","status","is_visible","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_hash_uidx" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limit_scope_key_uidx" ON "rate_limit_buckets" USING btree ("scope","key_hash");--> statement-breakpoint
CREATE INDEX "rate_limit_expires_at_idx" ON "rate_limit_buckets" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "site_settings_key_uidx" ON "site_settings" USING btree ("key");--> statement-breakpoint
ALTER TABLE "booking_documents" ADD CONSTRAINT "booking_documents_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "led_products" ADD CONSTRAINT "led_products_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "led_products" ADD CONSTRAINT "led_products_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reversal_of_payment_id_payments_id_fk" FOREIGN KEY ("reversal_of_payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD CONSTRAINT "pricing_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_stats" ADD CONSTRAINT "site_stats_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_status_history_booking_time_idx" ON "booking_status_history" USING btree ("booking_id","changed_at_utc");--> statement-breakpoint
CREATE INDEX "bookings_customer_created_idx" ON "bookings" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_payment_status_idx" ON "bookings" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "bookings_event_date_idx" ON "bookings" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "bookings_installation_date_idx" ON "bookings" USING btree ("installation_date");--> statement-breakpoint
CREATE INDEX "bookings_dismantling_date_idx" ON "bookings" USING btree ("dismantling_date");--> statement-breakpoint
CREATE INDEX "bookings_product_dates_idx" ON "bookings" USING btree ("led_product_id","installation_date","dismantling_date");--> statement-breakpoint
CREATE INDEX "customers_type_idx" ON "customers" USING btree ("type");--> statement-breakpoint
CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "invoices_booking_idx" ON "invoices" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "invoices_status_due_idx" ON "invoices" USING btree ("status","due_date");--> statement-breakpoint
CREATE INDEX "led_products_active_featured_idx" ON "led_products" USING btree ("is_active","is_featured");--> statement-breakpoint
CREATE INDEX "led_products_screen_type_idx" ON "led_products" USING btree ("screen_type");--> statement-breakpoint
CREATE INDEX "payments_booking_time_idx" ON "payments" USING btree ("booking_id","recorded_at_utc");--> statement-breakpoint
CREATE INDEX "payments_invoice_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payments_status_kind_idx" ON "payments" USING btree ("record_status","kind");
