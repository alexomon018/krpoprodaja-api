import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 50 }),
  lastName: varchar('last_name', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Habits table
export const habits = pgTable('habits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  frequency: varchar('frequency', { length: 20 }).notNull(), // daily, weekly, monthly
  targetCount: integer('target_count').default(1), // how many times per frequency period
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Habit entries table
export const entries = pgTable('entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  habitId: uuid('habit_id')
    .references(() => habits.id, { onDelete: 'cascade' })
    .notNull(),
  completion_date: timestamp('completion_date').defaultNow().notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Tags table
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  color: varchar('color', { length: 7 }).default('#6B7280'), // hex color
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Habit-Tags junction table (many-to-many)
export const habitTags = pgTable('habit_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  habitId: uuid('habit_id')
    .references(() => habits.id, { onDelete: 'cascade' })
    .notNull(),
  tagId: uuid('tag_id')
    .references(() => tags.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  habits: many(habits),
}))

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, {
    fields: [habits.userId],
    references: [users.id],
  }),
  entries: many(entries),
  habitTags: many(habitTags),
}))

export const entriesRelations = relations(entries, ({ one }) => ({
  habit: one(habits, {
    fields: [entries.habitId],
    references: [habits.id],
  }),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  habitTags: many(habitTags),
}))

export const habitTagsRelations = relations(habitTags, ({ one }) => ({
  habit: one(habits, {
    fields: [habitTags.habitId],
    references: [habits.id],
  }),
  tag: one(tags, {
    fields: [habitTags.tagId],
    references: [tags.id],
  }),
}))

// Zod schemas for validation (optional but recommended)
export const insertUserSchema = createInsertSchema(users)
export const selectUserSchema = createSelectSchema(users)

export const insertHabitSchema = createInsertSchema(habits)
export const selectHabitSchema = createSelectSchema(habits)

export const insertEntrySchema = createInsertSchema(entries)
export const selectEntrySchema = createSelectSchema(entries)

export const insertTagSchema = createInsertSchema(tags)
export const selectTagSchema = createSelectSchema(tags)

export const insertHabitTagSchema = createInsertSchema(habitTags)
export const selectHabitTagSchema = createSelectSchema(habitTags)

// Type exports
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Habit = typeof habits.$inferSelect
export type NewHabit = typeof habits.$inferInsert

export type Entry = typeof entries.$inferSelect
export type NewEntry = typeof entries.$inferInsert

export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert

export type HabitTag = typeof habitTags.$inferSelect
export type NewHabitTag = typeof habitTags.$inferInsert
