import type { Request, Response } from 'express'
import { db } from '../db/connection.ts'
import { categories } from '../db/schema.ts'

/**
 * Get all categories
 * GET /api/categories
 */
export async function getCategories(req: Request, res: Response) {
  try {
    const categoriesData = await db
      .select({
        id: categories.id,
        name: categories.name,
      })
      .from(categories)
      .orderBy(categories.name)

    return res.status(200).json({
      categories: categoriesData,
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return res.status(500).json({ error: 'Failed to fetch categories' })
  }
}
