import type { Request, Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/auth.ts'
import { db } from '../db/connection.ts'
import { tags, habitTags } from '../db/schema.ts'
import { eq, desc } from 'drizzle-orm'

// Public routes - no authentication required
export const getTags = async (req: Request, res: Response) => {
  try {
    const allTags = await db
      .select()
      .from(tags)
      .orderBy(tags.name)

    res.json({
      tags: allTags,
    })
  } catch (error) {
    console.error('Get tags error:', error)
    res.status(500).json({ error: 'Failed to fetch tags' })
  }
}

export const getTagById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const tag = await db.query.tags.findFirst({
      where: eq(tags.id, id),
      with: {
        habitTags: {
          with: {
            habit: {
              columns: {
                id: true,
                name: true,
                description: true,
                isActive: true,
              },
            },
          },
        },
      },
    })

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    // Transform the data
    const tagWithHabits = {
      ...tag,
      habits: tag.habitTags.map((ht) => ht.habit),
      habitTags: undefined,
    }

    res.json({
      tag: tagWithHabits,
    })
  } catch (error) {
    console.error('Get tag error:', error)
    res.status(500).json({ error: 'Failed to fetch tag' })
  }
}

export const getPopularTags = async (req: Request, res: Response) => {
  try {
    // Get all tags with their usage count
    const tagsWithCount = await db.query.tags.findMany({
      with: {
        habitTags: true,
      },
    })

    // Transform and sort by usage count
    const popularTags = tagsWithCount
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        usageCount: tag.habitTags.length,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10) // Top 10 most popular tags

    res.json({
      tags: popularTags,
    })
  } catch (error) {
    console.error('Get popular tags error:', error)
    res.status(500).json({ error: 'Failed to fetch popular tags' })
  }
}

// Protected routes - authentication required
export const createTag = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, color } = req.body

    // Check if tag with same name already exists
    const existingTag = await db.query.tags.findFirst({
      where: eq(tags.name, name),
    })

    if (existingTag) {
      return res.status(409).json({ error: 'Tag with this name already exists' })
    }

    const [newTag] = await db
      .insert(tags)
      .values({
        name,
        color: color || '#6B7280', // Default gray color
      })
      .returning()

    res.status(201).json({
      message: 'Tag created successfully',
      tag: newTag,
    })
  } catch (error) {
    console.error('Create tag error:', error)
    res.status(500).json({ error: 'Failed to create tag' })
  }
}

export const updateTag = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, color } = req.body

    // If updating name, check if new name already exists
    if (name) {
      const existingTag = await db.query.tags.findFirst({
        where: eq(tags.name, name),
      })

      if (existingTag && existingTag.id !== id) {
        return res.status(409).json({ error: 'Tag with this name already exists' })
      }
    }

    const updates: any = { updatedAt: new Date() }
    if (name) updates.name = name
    if (color) updates.color = color

    const [updatedTag] = await db
      .update(tags)
      .set(updates)
      .where(eq(tags.id, id))
      .returning()

    if (!updatedTag) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    res.json({
      message: 'Tag updated successfully',
      tag: updatedTag,
    })
  } catch (error) {
    console.error('Update tag error:', error)
    res.status(500).json({ error: 'Failed to update tag' })
  }
}

export const deleteTag = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    // Check if tag is being used
    const tagUsage = await db
      .select()
      .from(habitTags)
      .where(eq(habitTags.tagId, id))
      .limit(1)

    if (tagUsage.length > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete tag that is currently in use',
        message: 'Remove this tag from all habits before deleting'
      })
    }

    const [deletedTag] = await db
      .delete(tags)
      .where(eq(tags.id, id))
      .returning()

    if (!deletedTag) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    res.json({
      message: 'Tag deleted successfully',
    })
  } catch (error) {
    console.error('Delete tag error:', error)
    res.status(500).json({ error: 'Failed to delete tag' })
  }
}

export const getTagHabits = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Get all habits that have this tag
    const tagWithHabits = await db.query.tags.findFirst({
      where: eq(tags.id, id),
      with: {
        habitTags: {
          with: {
            habit: {
              with: {
                user: {
                  columns: {
                    id: true,
                    username: true,
                  },
                },
                habitTags: {
                  with: {
                    tag: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!tagWithHabits) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    // Filter habits by user and transform
    const userHabits = tagWithHabits.habitTags
      .filter((ht) => ht.habit.userId === userId)
      .map((ht) => ({
        ...ht.habit,
        tags: ht.habit.habitTags.map((habitTag) => habitTag.tag),
        habitTags: undefined,
        user: undefined,
      }))

    res.json({
      tag: {
        id: tagWithHabits.id,
        name: tagWithHabits.name,
        color: tagWithHabits.color,
      },
      habits: userHabits,
    })
  } catch (error) {
    console.error('Get tag habits error:', error)
    res.status(500).json({ error: 'Failed to fetch habits for tag' })
  }
}