import type { Request, Response } from 'express'
import { db } from '../db/connection.ts'
import { favorites, products, users } from '../db/schema.ts'
import { eq, and, desc, sql } from 'drizzle-orm'
import { processNestedProductImages } from '../utils/imageProcessor.ts'

/**
 * Get user's favorite products
 * GET /api/favorites
 */
export async function getFavorites(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id
    const { page = '1', limit = '20' } = req.query

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 100)
    const offset = (pageNum - 1) * limitNum

    // Get favorites with product and seller info
    const favoritesData = await db
      .select({
        id: favorites.id,
        createdAt: favorites.createdAt,
        productId: products.id,
        productTitle: products.title,
        productPrice: products.price,
        productOriginalPrice: products.originalPrice,
        productImages: products.images,
        productSize: products.size,
        productCondition: products.condition,
        productBrand: products.brand,
        productLocation: products.location,
        productStatus: products.status,
        productViewCount: products.viewCount,
        productFavoriteCount: products.favoriteCount,
        productCreatedAt: products.createdAt,
        sellerId: users.id,
        sellerUsername: users.username,
        sellerAvatar: users.avatar,
        sellerVerifiedSeller: users.verifiedSeller,
      })
      .from(favorites)
      .leftJoin(products, eq(favorites.productId, products.id))
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt))
      .limit(limitNum)
      .offset(offset)

    // Transform the flat data into nested structure
    const formattedData = favoritesData.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      product: {
        id: item.productId,
        title: item.productTitle,
        price: item.productPrice,
        originalPrice: item.productOriginalPrice,
        images: item.productImages,
        size: item.productSize,
        condition: item.productCondition,
        brand: item.productBrand,
        location: item.productLocation,
        status: item.productStatus,
        viewCount: item.productViewCount,
        favoriteCount: item.productFavoriteCount,
        createdAt: item.productCreatedAt,
        seller: {
          id: item.sellerId,
          username: item.sellerUsername,
          avatar: item.sellerAvatar,
          verifiedSeller: item.sellerVerifiedSeller,
        },
      },
    }))

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(favorites)
      .where(eq(favorites.userId, userId))

    const totalPages = Math.ceil(count / limitNum)

    // Convert S3 keys to presigned URLs for all product images
    const processedData = await processNestedProductImages(formattedData)

    return res.status(200).json({
      data: processedData,
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
    console.error('Error fetching favorites:', error)
    return res.status(500).json({ error: 'Failed to fetch favorites' })
  }
}

/**
 * Add a product to favorites
 * POST /api/favorites/:productId
 */
export async function addFavorite(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id
    const { productId } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if product exists
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Check if already favorited
    const [existingFavorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)))

    if (existingFavorite) {
      return res.status(409).json({ error: 'Product already favorited' })
    }

    // Add to favorites
    const [favorite] = await db
      .insert(favorites)
      .values({
        userId,
        productId,
      })
      .returning()

    // Increment favorite count on product
    await db
      .update(products)
      .set({
        favoriteCount: sql`${products.favoriteCount} + 1`,
      })
      .where(eq(products.id, productId))

    return res.status(201).json({
      message: 'Added to favorites',
      favorite,
    })
  } catch (error) {
    console.error('Error adding favorite:', error)
    return res.status(500).json({ error: 'Failed to add favorite' })
  }
}

/**
 * Remove a product from favorites
 * DELETE /api/favorites/:productId
 */
export async function removeFavorite(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id
    const { productId } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if favorite exists
    const [existingFavorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)))

    if (!existingFavorite) {
      return res.status(404).json({ error: 'Product not in favorites' })
    }

    // Remove from favorites
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)))

    // Decrement favorite count on product
    await db
      .update(products)
      .set({
        favoriteCount: sql`${products.favoriteCount} - 1`,
      })
      .where(eq(products.id, productId))

    return res.status(200).json({
      message: 'Removed from favorites',
    })
  } catch (error) {
    console.error('Error removing favorite:', error)
    return res.status(500).json({ error: 'Failed to remove favorite' })
  }
}

/**
 * Check if a product is favorited by current user
 * GET /api/favorites/check/:productId
 */
export async function checkFavorite(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id
    const { productId } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const [favorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)))

    return res.status(200).json({
      isFavorite: !!favorite,
    })
  } catch (error) {
    console.error('Error checking favorite:', error)
    return res.status(500).json({ error: 'Failed to check favorite' })
  }
}
