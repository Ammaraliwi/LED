CREATE TYPE "public"."booking_status" AS ENUM('draft', 'quotation_requested', 'pending_approval', 'confirmed', 'deposit_paid', 'scheduled', 'equipment_prepared', 'out_for_delivery', 'installed', 'event_running', 'dismantling', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('individual', 'corporate');--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('venue_photo', 'floor_plan', 'stage_drawing', 'reference_image', 'pdf', 'other');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('conference', 'exhibition', 'wedding', 'corporate_event', 'product_launch', 'festival', 'private_event', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'partially_paid', 'paid', 'overdue', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."screen_type" AS ENUM('indoor', 'outdoor');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'super_admin', 'sales', 'operations', 'technician', 'finance');--> statement-breakpoint
CREATE TABLE "booking_addons" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"equipment_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price_each" numeric(10, 2) NOT NULL,
	"line_total" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"file_type" varchar(100),
	"category" "document_category" DEFAULT 'other' NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"status" "booking_status" NOT NULL,
	"note" text,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_number" varchar(50) NOT NULL,
	"customer_id" integer,
	"led_product_id" integer,
	"screen_type" "screen_type",
	"pixel_pitch" numeric(4, 2),
	"width_m" numeric(6, 2),
	"height_m" numeric(6, 2),
	"total_cabinets" integer,
	"area_m2" numeric(8, 2),
	"aspect_ratio" varchar(20),
	"resolution_estimate" varchar(50),
	"package_id" integer,
	"event_date" date,
	"installation_date" date,
	"installation_time" time,
	"event_start_time" time,
	"event_end_time" time,
	"dismantling_date" date,
	"dismantling_time" time,
	"rental_days" integer DEFAULT 1 NOT NULL,
	"event_name" varchar(255),
	"event_type" "event_type",
	"venue_name" varchar(255),
	"venue_address" text,
	"venue_lat" numeric(10, 7),
	"venue_lng" numeric(10, 7),
	"indoor_outdoor" varchar(20),
	"additional_notes" text,
	"include_installation" boolean DEFAULT true NOT NULL,
	"include_dismantling" boolean DEFAULT true NOT NULL,
	"include_transport" boolean DEFAULT true NOT NULL,
	"include_processor" boolean DEFAULT true NOT NULL,
	"include_technician" boolean DEFAULT true NOT NULL,
	"rental_subtotal" numeric(10, 2) DEFAULT '0' NOT NULL,
	"installation_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"dismantling_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"transport_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"processor_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"technician_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"addons_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount_label" varchar(255),
	"vat_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"vat_percent" numeric(5, 2) DEFAULT '5' NOT NULL,
	"total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(10) DEFAULT 'QAR' NOT NULL,
	"status" "booking_status" DEFAULT 'draft' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"amount_paid" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_booking_number_unique" UNIQUE("booking_number")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "customer_type" DEFAULT 'individual' NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"company_name" varchar(255),
	"company_reg_number" varchar(100),
	"tax_number" varchar(100),
	"mobile_number" varchar(50),
	"whatsapp_number" varchar(50),
	"country" varchar(100),
	"city" varchar(100),
	"billing_address" text,
	"internal_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"price_per_day" numeric(10, 2) NOT NULL,
	"total_quantity" integer DEFAULT 10 NOT NULL,
	"icon" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"booking_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"due_date" date,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "led_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"screen_type" "screen_type" NOT NULL,
	"pixel_pitch" numeric(4, 2) NOT NULL,
	"cabinet_width_mm" integer DEFAULT 500 NOT NULL,
	"cabinet_height_mm" integer DEFAULT 500 NOT NULL,
	"brightness_nits" integer,
	"refresh_rate_hz" integer,
	"total_cabinets" integer DEFAULT 0 NOT NULL,
	"price_per_cabinet_per_day" numeric(10, 2) NOT NULL,
	"image_url" text,
	"description" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "led_products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"starting_price" numeric(10, 2) NOT NULL,
	"recommended_event_size" varchar(255),
	"includes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_url" text,
	"screen_type_suggestion" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "packages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"invoice_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"method" varchar(50) DEFAULT 'bank_transfer' NOT NULL,
	"reference" varchar(255),
	"paid_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"label" varchar(255),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"image_url" text NOT NULL,
	"description" text,
	"event_date" date,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(255) NOT NULL,
	"value" varchar(50) NOT NULL,
	"suffix" varchar(20),
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"company" varchar(255),
	"quote" text NOT NULL,
	"avatar_url" text,
	"rating" integer DEFAULT 5 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "booking_addons" ADD CONSTRAINT "booking_addons_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_addons" ADD CONSTRAINT "booking_addons_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_documents" ADD CONSTRAINT "booking_documents_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_led_product_id_led_products_id_fk" FOREIGN KEY ("led_product_id") REFERENCES "public"."led_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;