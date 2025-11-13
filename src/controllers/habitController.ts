import type { Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/auth.ts'
import { db } from '../db/connection.ts'
import { habits, entries, habitTags, tags } from '../db/schema.ts'
import { eq, and, desc, inArray } from 'drizzle-orm'

export const createHabit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, frequency, targetCount, tagIds } = req.body
    const userId = req.user!.id

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Create the habit
      const [newHabit] = await tx
        .insert(habits)
        .values({
          userId,
          name,
          description,
          frequency,
          targetCount,
        })
        .returning()

      // If tags are provided, create the associations
      if (tagIds && tagIds.length > 0) {
        const habitTagValues = tagIds.map((tagId: string) => ({
          habitId: newHabit.id,
          tagId,
        }))
        await tx.insert(habitTags).values(habitTagValues)
      }

      return newHabit
    })

    res.status(201).json({
      message: 'Habit created successfully',
      habit: result,
    })
  } catch (error) {
    console.error('Create habit error:', error)
    res.status(500).json({ error: 'Failed to create habit' })
  }
}

export const getUserHabits = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user!.id

    // Query habits with their tags
    const userHabitsWithTags = await db.query.habits.findMany({
      where: eq(habits.userId, userId),
      with: {
        habitTags: {
          with: {
            tag: true,
          },
        },
      },
      orderBy: [desc(habits.createdAt)],
    })

    // Transform the data to include tags directly
    const habitsWithTags = userHabitsWithTags.map((habit) => ({
      ...habit,
      tags: habit.habitTags.map((ht) => ht.tag),
      habitTags: undefined, // Remove the intermediate relation
    }))

    res.json({
      habits: habitsWithTags,
    })
  } catch (error) {
    console.error('Get habits error:', error)
    res.status(500).json({ error: 'Failed to fetch habits' })
  }
}

export const getHabitById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const habit = await db.query.habits.findFirst({
      where: and(eq(habits.id, id), eq(habits.userId, userId)),
      with: {
        habitTags: {
          with: {
            tag: true,
          },
        },
        entries: {
          orderBy: [desc(entries.completion_date)],
          limit: 10,
        },
      },
    })

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    // Transform the data
    const habitWithTags = {
      ...habit,
      tags: habit.habitTags.map((ht) => ht.tag),
      habitTags: undefined,
    }

    res.json({
      habit: habitWithTags,
    })
  } catch (error) {
    console.error('Get habit error:', error)
    res.status(500).json({ error: 'Failed to fetch habit' })
  }
}

export const updateHabit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const { tagIds, ...updates } = req.body

    const result = await db.transaction(async (tx) => {
      // Update the habit
      const [updatedHabit] = await tx
        .update(habits)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(habits.id, id), eq(habits.userId, userId)))
        .returning()

      if (!updatedHabit) {
        throw new Error('Habit not found')
      }

      // If tagIds are provided, update the associations
      if (tagIds !== undefined) {
        // Remove existing tags
        await tx.delete(habitTags).where(eq(habitTags.habitId, id))

        // Add new tags
        if (tagIds.length > 0) {
          const habitTagValues = tagIds.map((tagId: string) => ({
            habitId: id,
            tagId,
          }))
          await tx.insert(habitTags).values(habitTagValues)
        }
      }

      return updatedHabit
    })

    res.json({
      message: 'Habit updated successfully',
      habit: result,
    })
  } catch (error: any) {
    if (error.message === 'Habit not found') {
      return res.status(404).json({ error: 'Habit not found' })
    }
    console.error('Update habit error:', error)
    res.status(500).json({ error: 'Failed to update habit' })
  }
}

export const deleteHabit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const [deletedHabit] = await db
      .delete(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))
      .returning()

    if (!deletedHabit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    res.json({
      message: 'Habit deleted successfully',
    })
  } catch (error) {
    console.error('Delete habit error:', error)
    res.status(500).json({ error: 'Failed to delete habit' })
  }
}

export const logHabitCompletion = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { habitId } = req.params
    const { note } = req.body
    const userId = req.user!.id

    // Verify habit belongs to user
    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    const [newLog] = await db
      .insert(entries)
      .values({
        habitId,
        completion_date: new Date(),
        note,
      })
      .returning()

    res.status(201).json({
      message: 'Habit completion logged',
      log: newLog,
    })
  } catch (error) {
    console.error('Log habit completion error:', error)
    res.status(500).json({ error: 'Failed to log habit completion' })
  }
}

export const completeHabit = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const { note } = req.body

    // Verify habit belongs to user
    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    // Check if habit is active
    if (!habit.isActive) {
      return res
        .status(400)
        .json({ error: 'Cannot complete an inactive habit' })
    }

    // Create new completion entry
    const [newEntry] = await db
      .insert(entries)
      .values({
        habitId: id,
        completion_date: new Date(),
        note,
      })
      .returning()

    res.status(201).json({
      message: 'Habit completed successfully',
      entry: newEntry,
    })
  } catch (error) {
    console.error('Complete habit error:', error)
    res.status(500).json({ error: 'Failed to complete habit' })
  }
}

export const getHabitsByTag = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { tagId } = req.params
    const userId = req.user!.id

    // Get all habits that have this tag and belong to the user
    const habitsWithTag = await db.query.habitTags.findMany({
      where: eq(habitTags.tagId, tagId),
      with: {
        habit: {
          with: {
            habitTags: {
              with: {
                tag: true,
              },
            },
          },
        },
      },
    })

    // Filter habits by user and transform the data
    const userHabits = habitsWithTag
      .filter((ht) => ht.habit.userId === userId)
      .map((ht) => ({
        ...ht.habit,
        tags: ht.habit.habitTags.map((habitTag) => habitTag.tag),
        habitTags: undefined,
      }))

    res.json({
      habits: userHabits,
    })
  } catch (error) {
    console.error('Get habits by tag error:', error)
    res.status(500).json({ error: 'Failed to fetch habits by tag' })
  }
}

export const addTagsToHabit = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params
    const { tagIds } = req.body
    const userId = req.user!.id

    // Verify habit belongs to user
    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    // Get existing tags for this habit
    const existingTags = await db
      .select()
      .from(habitTags)
      .where(eq(habitTags.habitId, id))

    const existingTagIds = existingTags.map((ht) => ht.tagId)
    const newTagIds = tagIds.filter(
      (tagId: string) => !existingTagIds.includes(tagId)
    )

    if (newTagIds.length > 0) {
      const habitTagValues = newTagIds.map((tagId: string) => ({
        habitId: id,
        tagId,
      }))
      await db.insert(habitTags).values(habitTagValues)
    }

    res.json({
      message: 'Tags added successfully',
    })
  } catch (error) {
    console.error('Add tags to habit error:', error)
    res.status(500).json({ error: 'Failed to add tags to habit' })
  }
}

export const removeTagFromHabit = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id, tagId } = req.params
    const userId = req.user!.id

    // Verify habit belongs to user
    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    // Remove the tag association
    await db
      .delete(habitTags)
      .where(and(eq(habitTags.habitId, id), eq(habitTags.tagId, tagId)))

    res.json({
      message: 'Tag removed successfully',
    })
  } catch (error) {
    console.error('Remove tag from habit error:', error)
    res.status(500).json({ error: 'Failed to remove tag from habit' })
  }
}
