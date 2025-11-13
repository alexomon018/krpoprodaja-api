import { Request, Response } from 'express'
import { db } from '../db/connection.ts'
import { categories, products } from '../db/schema.ts'
import { eq, sql } from 'drizzle-orm'

/**
 * Get all categories with product counts
 * GET /api/categories
 */
export async function getCategories(req: Request, res: Response) {
  try {
    const categoriesData = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        icon: categories.icon,
        createdAt: categories.createdAt,
        productCount: sql<number>`count(${products.id})::int`,
      })
      .from(categories)
      .leftJoin(
        products,
        and(
          eq(categories.id, products.categoryId),
          eq(products.status, 'active')
        )
      )
      .groupBy(categories.id)
      .orderBy(categories.name)

    return res.status(200).json({
      categories: categoriesData,
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return res.status(500).json({ error: 'Failed to fetch categories' })
  }
}

// Helper function to use in query builder
function and(...conditions: any[]) {
  return sql`${sql.join(conditions, sql` AND `)}`
}
