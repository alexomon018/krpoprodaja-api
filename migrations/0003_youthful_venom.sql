ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "facebook_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_provider" varchar(20) DEFAULT 'email';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "linked_providers" json DEFAULT '[]'::json;