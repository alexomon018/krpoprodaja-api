import { db } from '../../src/db/connection.ts'
import {
  users,
  categories,
  products,
  reviews,
  favorites,
  conversations,
  conversationParticipants,
  messages,
} from '../../src/db/schema.ts'
import { sql } from 'drizzle-orm'
import { execSync } from 'child_process'

export default async function setup() {
  console.log('🗄️  Setting up test database...')

  try {
    // Drop all tables if they exist to ensure clean state
    // Order matters: drop child tables first (those with foreign keys), then parent tables
    await db.execute(sql`DROP TABLE IF EXISTS ${messages} CASCADE`)
    await db.execute(sql`DROP TABLE IF EXISTS ${conversationParticipants} CASCADE`)
    await db.execute(sql`DROP TABLE IF EXISTS ${conversations} CASCADE`)
    await db.execute(sql`DROP TABLE IF EXISTS ${favorites} CASCADE`)
    await db.execute(sql`DROP TABLE IF EXISTS ${reviews} CASCADE`)
    await db.execute(sql`DROP TABLE IF EXISTS ${products} CASCADE`)
    await db.execute(sql`DROP TABLE IF EXISTS ${categories} CASCADE`)
    await db.execute(sql`DROP TABLE IF EXISTS ${users} CASCADE`)

    // Use drizzle-kit CLI to push schema to database
    console.log('🚀 Pushing schema using drizzle-kit...')
    execSync(
      `npx drizzle-kit push --url="${process.env.DATABASE_URL}" --schema="./src/db/schema.ts" --dialect="postgresql"`,
      {
        stdio: 'inherit',
        cwd: process.cwd(),
      }
    )

    console.log('✅ Test database setup complete')
  } catch (error) {
    console.error('❌ Failed to setup test database:', error)
    throw error
  }

  return async () => {
    console.log('🧹 Tearing down test database...')

    try {
      // Final cleanup - drop all test data
      // Order matters: drop child tables first (those with foreign keys), then parent tables
      await db.execute(sql`DROP TABLE IF EXISTS ${messages} CASCADE`)
      await db.execute(sql`DROP TABLE IF EXISTS ${conversationParticipants} CASCADE`)
      await db.execute(sql`DROP TABLE IF EXISTS ${conversations} CASCADE`)
      await db.execute(sql`DROP TABLE IF EXISTS ${favorites} CASCADE`)
      await db.execute(sql`DROP TABLE IF EXISTS ${reviews} CASCADE`)
      await db.execute(sql`DROP TABLE IF EXISTS ${products} CASCADE`)
      await db.execute(sql`DROP TABLE IF EXISTS ${categories} CASCADE`)
      await db.execute(sql`DROP TABLE IF EXISTS ${users} CASCADE`)

      console.log('✅ Test database teardown complete')
      process.exit(0)
    } catch (error) {
      console.error('❌ Failed to teardown test database:', error)
    }
  }
}
