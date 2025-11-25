ALTER TABLE "categories" DROP CONSTRAINT "categories_slug_unique";--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "category_id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "icon";