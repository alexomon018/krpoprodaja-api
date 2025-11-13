import { db } from './connection.ts'
import { users, habits, entries, tags, habitTags } from './schema.ts'
import { hashPassword } from '../utils/password.ts'

async function seed() {
  console.log('🌱 Starting database seed...')

  try {
    // Clear existing data
    console.log('Clearing existing data...')
    await db.delete(entries)
    await db.delete(habitTags)
    await db.delete(habits)
    await db.delete(tags)
    await db.delete(users)

    // Create demo users
    console.log('Creating demo users...')
    const hashedPassword = await hashPassword('demo123')

    const [demoUser] = await db
      .insert(users)
      .values({
        email: 'demo@habittracker.com',
        username: 'demouser',
        password: hashedPassword,
        firstName: 'Demo',
        lastName: 'User',
      })
      .returning()

    const [johnDoe] = await db
      .insert(users)
      .values({
        email: 'john@example.com',
        username: 'johndoe',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
      })
      .returning()

    // Create tags
    console.log('Creating tags...')

    const [healthTag] = await db
      .insert(tags)
      .values({
        name: 'Health',
        color: '#10B981',
      })
      .returning()

    const [productivityTag] = await db
      .insert(tags)
      .values({
        name: 'Productivity',
        color: '#3B82F6',
      })
      .returning()

    const [mindfulnessTag] = await db
      .insert(tags)
      .values({
        name: 'Mindfulness',
        color: '#8B5CF6',
      })
      .returning()

    const [fitnessTag] = await db
      .insert(tags)
      .values({
        name: 'Fitness',
        color: '#EF4444',
      })
      .returning()

    const [learningTag] = await db
      .insert(tags)
      .values({
        name: 'Learning',
        color: '#F59E0B',
      })
      .returning()

    const [personalTag] = await db
      .insert(tags)
      .values({
        name: 'Personal',
        color: '#EC4899',
      })
      .returning()

    // Create habits for demo user
    console.log('Creating demo habits...')

    const [exerciseHabit] = await db
      .insert(habits)
      .values({
        userId: demoUser.id,
        name: 'Exercise',
        description: 'Daily workout routine',
        frequency: 'daily',
        targetCount: 1,
      })
      .returning()

    // Add tags to exercise habit
    await db.insert(habitTags).values([
      { habitId: exerciseHabit.id, tagId: healthTag.id },
      { habitId: exerciseHabit.id, tagId: fitnessTag.id },
    ])

    const [readingHabit] = await db
      .insert(habits)
      .values({
        userId: demoUser.id,
        name: 'Read for 30 minutes',
        description: 'Read books or articles',
        frequency: 'daily',
        targetCount: 1,
      })
      .returning()

    // Add tags to reading habit
    await db.insert(habitTags).values([
      { habitId: readingHabit.id, tagId: learningTag.id },
      { habitId: readingHabit.id, tagId: personalTag.id },
    ])

    const [meditationHabit] = await db
      .insert(habits)
      .values({
        userId: demoUser.id,
        name: 'Meditate',
        description: '10 minutes of mindfulness',
        frequency: 'daily',
        targetCount: 1,
      })
      .returning()

    // Add tags to meditation habit
    await db.insert(habitTags).values([
      { habitId: meditationHabit.id, tagId: mindfulnessTag.id },
      { habitId: meditationHabit.id, tagId: healthTag.id },
    ])

    const [waterHabit] = await db
      .insert(habits)
      .values({
        userId: demoUser.id,
        name: 'Drink 8 glasses of water',
        description: 'Stay hydrated throughout the day',
        frequency: 'daily',
        targetCount: 8,
      })
      .returning()

    // Add tag to water habit
    await db
      .insert(habitTags)
      .values([{ habitId: waterHabit.id, tagId: healthTag.id }])

    // Create habits for John
    const [codingHabit] = await db
      .insert(habits)
      .values({
        userId: johnDoe.id,
        name: 'Code for 1 hour',
        description: 'Practice programming skills',
        frequency: 'daily',
        targetCount: 1,
      })
      .returning()

    // Add tags to coding habit
    await db.insert(habitTags).values([
      { habitId: codingHabit.id, tagId: learningTag.id },
      { habitId: codingHabit.id, tagId: productivityTag.id },
    ])

    // Add completion entries for demo user
    console.log('Adding completion entries...')

    const today = new Date()
    today.setHours(12, 0, 0, 0)

    // Exercise habit - completions for past 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      await db.insert(entries).values({
        habitId: exerciseHabit.id,
        completion_date: date,
        note: i === 0 ? 'Great workout today!' : null,
      })
    }

    // Reading habit - completions for past 3 days
    for (let i = 1; i <= 3; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      await db.insert(entries).values({
        habitId: readingHabit.id,
        completion_date: date,
      })
    }

    // Meditation habit - Sporadic completions
    const meditationDays = [0, 2, 3, 5, 8, 9, 10, 15]
    for (const daysAgo of meditationDays) {
      const date = new Date(today)
      date.setDate(date.getDate() - daysAgo)
      await db.insert(entries).values({
        habitId: meditationHabit.id,
        completion_date: date,
      })
    }

    // Water habit - Completed today with multiple entries (for target count demo)
    for (let i = 0; i < 6; i++) {
      const date = new Date(today)
      date.setHours(8 + i * 2, 0, 0, 0) // Different times throughout the day
      await db.insert(entries).values({
        habitId: waterHabit.id,
        completion_date: date,
        note: `Glass ${i + 1} of water`,
      })
    }

    // Coding habit for John - completions from 3 to 17 days ago
    for (let i = 3; i < 17; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      await db.insert(entries).values({
        habitId: codingHabit.id,
        completion_date: date,
      })
    }

    // Demonstrate using relations to query data
    console.log('\n🔍 Testing relational queries...')

    // Query user with all their habits, entries, and tags
    const userWithHabits = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, 'demo@habittracker.com'),
      with: {
        habits: {
          with: {
            entries: true,
            habitTags: {
              with: {
                tag: true,
              },
            },
          },
        },
      },
    })

    // Query habits with their tags
    const habitsWithTags = await db.query.habits.findMany({
      limit: 3,
      with: {
        user: {
          columns: {
            password: false, // Exclude password from results
          },
        },
        habitTags: {
          with: {
            tag: true,
          },
        },
        entries: {
          limit: 5,
          orderBy: (entries, { desc }) => [desc(entries.completion_date)],
        },
      },
    })

    // Query tags with their habits
    const tagsWithHabits = await db.query.tags.findMany({
      with: {
        habitTags: {
          with: {
            habit: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    console.log('✅ Database seeded successfully!')
    console.log('\n📊 Seed Summary:')
    console.log('- 2 demo users created')
    console.log('- 6 tags created')
    console.log('- 5 habits created with tags')
    console.log('- Multiple completion entries added')
    console.log(`- Demo user has ${userWithHabits?.habits.length || 0} habits`)
    console.log(
      `- Total entries for demo user: ${
        userWithHabits?.habits.reduce((acc, h) => acc + h.entries.length, 0) ||
        0
      }`
    )
    console.log(`- Total tags in system: ${tagsWithHabits?.length || 0}`)
    console.log('\n🔑 Login Credentials:')
    console.log('Email: demo@habittracker.com')
    console.log('Password: demo123')
    console.log('\nEmail: john@example.com')
    console.log('Password: demo123')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  }
}

// Run seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export default seed
