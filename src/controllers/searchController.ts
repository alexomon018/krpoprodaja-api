import type { Request, Response } from 'express'
import { db } from '../db/connection.ts'
import { products, users, categories } from '../db/schema.ts'
import { eq, and, desc, ilike, or, sql } from 'drizzle-orm'
import { processProductImages } from '../utils/imageProcessor.ts'

/**
 * Search products with full-text search
 * GET /api/search
 */
export async function searchProducts(req: Request, res: Response) {
  try {
    const {
      q,
      page = '1',
      limit = '20',
      category,
      priceMin,
      priceMax,
      size,
      condition,
      sort = 'newest',
    } = req.query

    if (!q) {
      return res.status(400).json({ error: 'Search query required' })
    }

    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 100)
    const offset = (pageNum - 1) * limitNum

    const searchTerm = q as string

    // Build where conditions
    const conditions = [
      eq(products.status, 'active'),
      or(
        ilike(products.title, `%${searchTerm}%`),
        ilike(products.description, `%${searchTerm}%`),
        ilike(products.brand, `%${searchTerm}%`)
      ),
    ]

    // Additional filters
    if (category) {
      conditions.push(eq(products.categoryId, category as string))
    }

    // Get products with seller info
    const productsData = await db
      .select({
        id: products.id,
        title: products.title,
        price: products.price,
        originalPrice: products.originalPrice,
        images: products.images,
        size: products.size,
        condition: products.condition,
        brand: products.brand,
        location: products.location,
        status: products.status,
        viewCount: products.viewCount,
        favoriteCount: products.favoriteCount,
        createdAt: products.createdAt,
        seller: {
          id: users.id,
          avatar: users.avatar,
        },
      })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(and(...conditions))
      .orderBy(desc(products.createdAt))
      .limit(limitNum)
      .offset(offset)

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(...conditions))

    const totalPages = Math.ceil(count / limitNum)

    // Convert S3 keys to presigned URLs for all products
    const processedProducts = await processProductImages(productsData)

    return res.status(200).json({
      data: processedProducts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: count,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    })
  } catch (error) {
    console.error('Error searching products:', error)
    return res.status(500).json({ error: 'Failed to search products' })
  }
}

/**
 * Get search autocomplete suggestions
 * GET /api/search/suggestions
 */
export async function getSearchSuggestions(req: Request, res: Response) {
  try {
    const { q, limit = '10' } = req.query

    if (!q || (q as string).length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' })
    }

    const searchTerm = q as string
    const limitNum = parseInt(limit as string, 10)

    // Get product suggestions
    const productSuggestions = await db
      .selectDistinct({
        text: products.title,
        type: sql<string>`'product'`,
      })
      .from(products)
      .where(
        and(
          eq(products.status, 'active'),
          ilike(products.title, `%${searchTerm}%`)
        )
      )
      .limit(5)

    // Get brand suggestions
    const brandSuggestions = await db
      .selectDistinct({
        text: products.brand,
        type: sql<string>`'brand'`,
      })
      .from(products)
      .where(
        and(
          eq(products.status, 'active'),
          ilike(products.brand, `%${searchTerm}%`),
          sql`${products.brand} IS NOT NULL`
        )
      )
      .limit(3)

    // Get category suggestions
    const categorySuggestions = await db
      .select({
        text: categories.name,
        type: sql<string>`'category'`,
      })
      .from(categories)
      .where(ilike(categories.name, `%${searchTerm}%`))
      .limit(2)

    const suggestions = [
      ...productSuggestions,
      ...brandSuggestions,
      ...categorySuggestions,
    ].slice(0, limitNum)

    return res.status(200).json({
      suggestions,
    })
  } catch (error) {
    console.error('Error fetching search suggestions:', error)
    return res.status(500).json({ error: 'Failed to fetch suggestions' })
  }
}
