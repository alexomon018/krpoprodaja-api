ALTER TABLE "users" ADD COLUMN "phone_verification_code" varchar(6);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verification_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verified" boolean DEFAULT false NOT NULL;