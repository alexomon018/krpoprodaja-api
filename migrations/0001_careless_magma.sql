CREATE UNIQUE INDEX "conversation_participants_conversation_user_idx" ON "conversation_participants" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX "conversation_participants_user_id_idx" ON "conversation_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_participants_conversation_id_idx" ON "conversation_participants" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversations_product_id_idx" ON "conversations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "conversations_updated_at_idx" ON "conversations" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_product_idx" ON "favorites" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "favorites_user_created_at_idx" ON "favorites" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "favorites_product_id_idx" ON "favorites" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_at_idx" ON "messages" USING btree ("conversation_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "messages_sender_id_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "messages_read_idx" ON "messages" USING btree ("read");--> statement-breakpoint
CREATE INDEX "offers_product_id_idx" ON "offers" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "offers_buyer_id_idx" ON "offers" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "offers_seller_id_idx" ON "offers" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "offers_product_status_idx" ON "offers" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "offers_seller_status_idx" ON "offers" USING btree ("seller_id","status");--> statement-breakpoint
CREATE INDEX "offers_expires_at_idx" ON "offers" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "products_status_created_at_idx" ON "products" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "products_seller_id_idx" ON "products" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_price_idx" ON "products" USING btree ("price");--> statement-breakpoint
CREATE INDEX "products_size_idx" ON "products" USING btree ("size");--> statement-breakpoint
CREATE INDEX "products_condition_idx" ON "products" USING btree ("condition");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "products_location_idx" ON "products" USING btree ("location");--> statement-breakpoint
CREATE INDEX "products_status_category_created_at_idx" ON "products" USING btree ("status","category_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "purchases_buyer_id_idx" ON "purchases" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "purchases_seller_id_idx" ON "purchases" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "purchases_product_id_idx" ON "purchases" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "purchases_buyer_status_created_at_idx" ON "purchases" USING btree ("buyer_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "purchases_seller_status_created_at_idx" ON "purchases" USING btree ("seller_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "purchases_status_idx" ON "purchases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "purchases_payment_intent_id_idx" ON "purchases" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX "reviews_product_id_idx" ON "reviews" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "reviews_reviewer_id_idx" ON "reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "reviews_product_created_at_idx" ON "reviews" USING btree ("product_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reviews_rating_idx" ON "reviews" USING btree ("rating");