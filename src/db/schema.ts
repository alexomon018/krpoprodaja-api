import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== USERS ====================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }), // Optional for OAuth users
  firstName: varchar("first_name", { length: 50 }),
  lastName: varchar("last_name", { length: 50 }),
  name: varchar("name", { length: 100 }), // Display name
  phone: varchar("phone", { length: 20 }),
  avatar: text("avatar"), // URL to avatar image
  bio: text("bio"), // Max 500 characters (validated in Zod schema)
  location: varchar("location", { length: 100 }), // City/region
  verified: boolean("verified").default(false).notNull(), // Email verification
  verifiedSeller: boolean("verified_seller").default(false).notNull(), // Trusted seller badge
  responseTime: varchar("response_time", { length: 100 }), // e.g., "Usually responds within hours"
  // OAuth provider fields
  googleId: varchar("google_id", { length: 255 }), // Google OAuth ID
  facebookId: varchar("facebook_id", { length: 255 }), // Facebook OAuth ID
  authProvider: varchar("auth_provider", { length: 20 }).default("email"), // email|google|facebook - primary auth method
  linkedProviders: json("linked_providers").$type<string[]>().default([]), // Array of linked providers ['email', 'google']
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==================== CATEGORIES ====================

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 50 }), // Icon name/identifier
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==================== PRODUCTS ====================

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 100 }).notNull(),
    description: text("description"),
    price: integer("price").notNull(), // In RSD (integer)
    originalPrice: integer("original_price"), // Original price before discount
    images: json("images").$type<string[]>().notNull(), // Array of image URLs
    size: varchar("size", { length: 10 }).notNull(), // XS|S|M|L|XL|XXL|XXXL
    condition: varchar("condition", { length: 20 }).notNull(), // new|very-good|good|satisfactory
    brand: varchar("brand", { length: 100 }),
    color: varchar("color", { length: 50 }),
    material: varchar("material", { length: 100 }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    location: varchar("location", { length: 100 }).notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(), // active|reserved|sold|deleted
    viewCount: integer("view_count").default(0).notNull(),
    favoriteCount: integer("favorite_count").default(0).notNull(),
    sellerId: uuid("seller_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // Most important: composite index for listing queries
    index("products_status_created_at_idx").on(
      table.status,
      table.createdAt.desc()
    ),

    // Foreign key indexes for joins
    index("products_seller_id_idx").on(table.sellerId),
    index("products_category_id_idx").on(table.categoryId),

    // Filter indexes
    index("products_price_idx").on(table.price),
    index("products_size_idx").on(table.size),
    index("products_condition_idx").on(table.condition),
    index("products_brand_idx").on(table.brand),
    index("products_location_idx").on(table.location),

    // Composite index for popular queries (active products sorted by date)
    index("products_status_category_created_at_idx").on(
      table.status,
      table.categoryId,
      table.createdAt.desc()
    ),
  ]
);

// ==================== REVIEWS ====================

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
    reviewerId: uuid("reviewer_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    rating: integer("rating").notNull(), // 1-5 stars
    comment: text("comment").notNull(),
    reviewType: varchar("review_type", { length: 50 }), // this-item|appearance|delivery-packaging|seller-service|condition
    images: json("images").$type<string[]>(), // Optional review images
    helpful: integer("helpful").default(0).notNull(), // Helpful vote count
    sellerResponseComment: text("seller_response_comment"),
    sellerResponseCreatedAt: timestamp("seller_response_created_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // Foreign key indexes for joins
    index("reviews_product_id_idx").on(table.productId),
    index("reviews_reviewer_id_idx").on(table.reviewerId),

    // Composite index for product reviews sorted by date
    index("reviews_product_created_at_idx").on(
      table.productId,
      table.createdAt.desc()
    ),

    // Rating index for filtering/sorting
    index("reviews_rating_idx").on(table.rating),
  ]
);

// ==================== FAVORITES ====================

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Composite unique index to prevent duplicate favorites
    uniqueIndex("favorites_user_product_idx").on(table.userId, table.productId),

    // Index for querying user's favorites sorted by date
    index("favorites_user_created_at_idx").on(
      table.userId,
      table.createdAt.desc()
    ),

    // Index for querying product's favorites
    index("favorites_product_id_idx").on(table.productId),
  ]
);

// ==================== CONVERSATIONS ====================

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // Index for product-related conversations
    index("conversations_product_id_idx").on(table.productId),

    // Index for sorting by recent activity
    index("conversations_updated_at_idx").on(table.updatedAt.desc()),
  ]
);

// ==================== CONVERSATION PARTICIPANTS ====================

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    unreadCount: integer("unread_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Unique index to prevent duplicate participants
    uniqueIndex("conversation_participants_conversation_user_idx").on(
      table.conversationId,
      table.userId
    ),

    // Index for querying user's conversations
    index("conversation_participants_user_id_idx").on(table.userId),

    // Index for conversation lookups
    index("conversation_participants_conversation_id_idx").on(
      table.conversationId
    ),
  ]
);

// ==================== MESSAGES ====================

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    senderId: uuid("sender_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    type: varchar("type", { length: 20 }).default("text").notNull(), // text|offer|system
    metadata: json("metadata").$type<{
      offerAmount?: number;
      offerStatus?: string;
    }>(),
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Most important: composite index for conversation messages sorted by time
    index("messages_conversation_created_at_idx").on(
      table.conversationId,
      table.createdAt.desc()
    ),

    // Index for sender queries
    index("messages_sender_id_idx").on(table.senderId),

    // Index for unread messages
    index("messages_read_idx").on(table.read),
  ]
);

// ==================== RELATIONS ====================

export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
  reviews: many(reviews),
  favorites: many(favorites),
  sentMessages: many(messages),
  conversationParticipants: many(conversationParticipants),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(users, {
    fields: [products.sellerId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  reviews: many(reviews),
  favorites: many(favorites),
  conversations: many(conversations),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [favorites.productId],
    references: [products.id],
  }),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    product: one(products, {
      fields: [conversations.productId],
      references: [products.id],
    }),
    participants: many(conversationParticipants),
    messages: many(messages),
  })
);

export const conversationParticipantsRelations = relations(
  conversationParticipants,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationParticipants.conversationId],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [conversationParticipants.userId],
      references: [users.id],
    }),
  })
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

// ==================== ZOD SCHEMAS ====================

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: "Invalid email address",
  }),
  username: z.string().min(3).max(50),
  password: z.string().min(8).optional(), // Optional for OAuth users
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .refine((val) => /^\+?[1-9]\d{1,14}$/.test(val), {
      message: "Phone number must be in E.164 format",
    })
    .optional(), // E.164 format
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  authProvider: z.enum(["email", "google", "facebook"]).optional(),
  linkedProviders: z.array(z.string()).optional(),
});
export const selectUserSchema = createSelectSchema(users);

export const insertCategorySchema = createInsertSchema(categories, {
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
});
export const selectCategorySchema = createSelectSchema(categories);

export const insertProductSchema = createInsertSchema(products, {
  title: z.string().min(10).max(100),
  description: z.string().max(2000).optional(),
  price: z.number().int().positive(),
  originalPrice: z.number().int().positive().optional(),
  images: z.array(z.string()).min(1).max(10),
  size: z.enum(["XS", "S", "M", "L", "XL", "XXL", "XXXL"]),
  condition: z.enum(["new", "very-good", "good", "satisfactory"]),
  brand: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  material: z.string().max(100).optional(),
  location: z.string().min(1).max(100),
  status: z.enum(["active", "reserved", "sold", "deleted"]).optional(),
});
export const selectProductSchema = createSelectSchema(products);

export const insertReviewSchema = createInsertSchema(reviews, {
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
  reviewType: z
    .enum([
      "this-item",
      "appearance",
      "delivery-packaging",
      "seller-service",
      "condition",
    ])
    .optional(),
  images: z.array(z.string().url()).max(5).optional(),
});
export const selectReviewSchema = createSelectSchema(reviews);

export const insertFavoriteSchema = createInsertSchema(favorites);
export const selectFavoriteSchema = createSelectSchema(favorites);

export const insertConversationSchema = createInsertSchema(conversations);
export const selectConversationSchema = createSelectSchema(conversations);

export const insertMessageSchema = createInsertSchema(messages, {
  content: z.string().min(1).max(2000),
  type: z.enum(["text", "offer", "system"]).optional(),
});
export const selectMessageSchema = createSelectSchema(messages);

// ==================== TYPE EXPORTS ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type ConversationParticipant =
  typeof conversationParticipants.$inferSelect;
export type NewConversationParticipant =
  typeof conversationParticipants.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
