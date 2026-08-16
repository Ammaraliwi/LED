ALTER TABLE "page_sections" ADD COLUMN "published_content" jsonb;--> statement-breakpoint
ALTER TABLE "page_sections" ADD COLUMN "published_version" integer;--> statement-breakpoint
ALTER TABLE "page_sections" ADD COLUMN "published_is_visible" boolean DEFAULT false NOT NULL;