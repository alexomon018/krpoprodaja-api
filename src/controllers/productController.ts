import type { Request, Response } from 'express'
import { db } from '../db/connection.ts'
import { products, users } from '../db/schema.ts'
import { eq, and, desc, asc, sql, ilike, or, gte, lte, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { processProductImages } from '../utils/imageProcessor.ts'

// Create product validation schema
const createProductSchema = z.object({
  title: z.string().min(10).max(100),
  description: z.string().max(2000).optional(),
  price: z.number().int().positive(),
  originalPrice: z.number().int().positive().optional(),
  images: z.array(z.string().url()).min(1).max(10),
  size: z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']),
  condition: z.enum(['new', 'very-good', 'good', 'satisfactory']),
  brand: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  material: z.string().max(100).optional(),
  categoryId: z.string().uuid().optional(),
  location: z.string().min(1).max(100),
})

// Update product validation schema
const updateProductSchema = createProductSchema.partial()

// Status update validation schema
const updateStatusSchema = z.object({
  status: z.enum(['active', 'reserved', 'sold', 'deleted']),
})

/**
 * Create a new product listing
 * POST /api/products
 */
export async function createProduct(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const validatedData = createProductSchema.parse(req.body)

    const [product] = await db
      .insert(products)
      .values({
        ...validatedData,
        sellerId: userId,
        status: 'active',
        viewCount: 0,
        favoriteCount: 0,
      })
      .returning()

    // Fetch the product with seller info
    const [productWithSeller] = await db
      .select({
        id: products.id,
        title: products.title,
        description: products.description,
        price: products.price,
        originalPrice: products.originalPrice,
        images: products.images,
        size: products.size,
        condition: products.condition,
        brand: products.brand,
        color: products.color,
        material: products.material,
        categoryId: products.categoryId,
        location: products.location,
        status: products.status,
        viewCount: products.viewCount,
        favoriteCount: products.favoriteCount,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        seller: {
          id: users.id,
          username: users.username,
          name: users.name,
          avatar: users.avatar,
          verified: users.verified,
          verifiedSeller: users.verifiedSeller,
        },
      })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.id, product.id))

    // Convert S3 keys to presigned URLs if needed
    const processedProduct = await processProductImages(productWithSeller)

    return res.status(201).json({
      message: 'Product created successfully',
      product: processedProduct,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues,
      })
    }
    console.error('Error creating product:', error)
    return res.status(500).json({ error: 'Failed to create product' })
  }
}

/**
 * Get list of products with filtering and pagination
 * GET /api/products
 */
export async function getProducts(req: Request, res: Response) {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      category,
      priceMin,
      priceMax,
      size,
      condition,
      brand,
      color,
      location,
      status = 'active',
      sort = 'newest',
    } = req.query

    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 100)
    const offset = (pageNum - 1) * limitNum

    // Build where conditions
    const conditions = []

    // Status filter
    if (status === 'all') {
      conditions.push(inArray(products.status, ['active', 'sold']))
    } else {
      conditions.push(eq(products.status, status as string))
    }

    // Search filter
    if (search) {
      conditions.push(
        or(
          ilike(products.title, `%${search}%`),
          ilike(products.description, `%${search}%`),
          ilike(products.brand, `%${search}%`)
        )
      )
    }

    // Category filter
    if (category) {
      conditions.push(eq(products.categoryId, category as string))
    }

    // Price range filter
    if (priceMin) {
      conditions.push(gte(products.price, parseInt(priceMin as string, 10)))
    }
    if (priceMax) {
      conditions.push(lte(products.price, parseInt(priceMax as string, 10)))
    }

    // Size filter (can be multiple)
    if (size) {
      const sizes = Array.isArray(size) ? size : [size]
      conditions.push(inArray(products.size, sizes as string[]))
    }

    // Condition filter (can be multiple)
    if (condition) {
      const conditions_arr = Array.isArray(condition) ? condition : [condition]
      conditions.push(inArray(products.condition, conditions_arr as string[]))
    }

    // Brand filter
    if (brand) {
      conditions.push(eq(products.brand, brand as string))
    }

    // Color filter
    if (color) {
      conditions.push(eq(products.color, color as string))
    }

    // Location filter
    if (location) {
      conditions.push(ilike(products.location, `%${location}%`))
    }

    // Sorting
    let orderBy
    switch (sort) {
      case 'oldest':
        orderBy = asc(products.createdAt)
        break
      case 'price-low':
        orderBy = asc(products.price)
        break
      case 'price-high':
        orderBy = desc(products.price)
        break
      case 'popular':
        orderBy = desc(products.viewCount)
        break
      case 'newest':
      default:
        orderBy = desc(products.createdAt)
        break
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
          username: users.username,
          avatar: users.avatar,
          verified: users.verified,
          verifiedSeller: users.verifiedSeller,
        },
      })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(and(...conditions))
      .orderBy(orderBy)
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
    console.error('Error fetching products:', error)
    return res.status(500).json({ error: 'Failed to fetch products' })
  }
}

/**
 * Get a single product by ID
 * GET /api/products/:id
 */
export async function getProductById(req: Request, res: Response) {
  try {
    const { id } = req.params
    const userId = (req as any).user?.id

    const [product] = await db
      .select({
        id: products.id,
        title: products.title,
        description: products.description,
        price: products.price,
        originalPrice: products.originalPrice,
        images: products.images,
        size: products.size,
        condition: products.condition,
        brand: products.brand,
        color: products.color,
        material: products.material,
        categoryId: products.categoryId,
        location: products.location,
        status: products.status,
        viewCount: products.viewCount,
        favoriteCount: products.favoriteCount,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        seller: {
          id: users.id,
          username: users.username,
          name: users.name,
          avatar: users.avatar,
          bio: users.bio,
          location: users.location,
          verified: users.verified,
          verifiedSeller: users.verifiedSeller,
          responseTime: users.responseTime,
          createdAt: users.createdAt,
        },
      })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.id, id))

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Increment view count if not the owner
    if (!userId || userId !== product.seller.id) {
      await db
        .update(products)
        .set({
          viewCount: sql`${products.viewCount} + 1`,
        })
        .where(eq(products.id, id))
    }

    // Convert S3 keys to presigned URLs if needed
    const processedProduct = await processProductImages(product)

    return res.status(200).json(processedProduct)
  } catch (error) {
    console.error('Error fetching product:', error)
    return res.status(500).json({ error: 'Failed to fetch product' })
  }
}

/**
 * Update a product
 * PUT /api/products/:id
 */
export async function updateProduct(req: Request, res: Response) {
  try {
    const { id } = req.params
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if product exists and belongs to user
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' })
    }

    if (existingProduct.sellerId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this product' })
    }

    const validatedData = updateProductSchema.parse(req.body)

    const [updatedProduct] = await db
      .update(products)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning()

    return res.status(200).json({
      message: 'Product updated successfully',
      product: updatedProduct,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues,
      })
    }
    console.error('Error updating product:', error)
    return res.status(500).json({ error: 'Failed to update product' })
  }
}

/**
 * Delete a product (soft delete)
 * DELETE /api/products/:id
 */
export async function deleteProduct(req: Request, res: Response) {
  try {
    const { id } = req.params
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if product exists and belongs to user
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' })
    }

    if (existingProduct.sellerId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this product' })
    }

    // Soft delete
    await db
      .update(products)
      .set({
        status: 'deleted',
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))

    return res.status(200).json({
      message: 'Product deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting product:', error)
    return res.status(500).json({ error: 'Failed to delete product' })
  }
}

/**
 * Update product status
 * PATCH /api/products/:id/status
 */
export async function updateProductStatus(req: Request, res: Response) {
  try {
    const { id } = req.params
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if product exists and belongs to user
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' })
    }

    if (existingProduct.sellerId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this product' })
    }

    const { status } = updateStatusSchema.parse(req.body)

    const [updatedProduct] = await db
      .update(products)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning()

    return res.status(200).json({
      message: 'Product status updated',
      product: updatedProduct,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues,
      })
    }
    console.error('Error updating product status:', error)
    return res.status(500).json({ error: 'Failed to update product status' })
  }
}

/**
 * Get similar products
 * GET /api/products/:id/similar
 */
export async function getSimilarProducts(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { limit = '10' } = req.query
    const limitNum = parseInt(limit as string, 10)

    // Get the original product
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Find similar products based on category, size, and price range
    const similarProducts = await db
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
          username: users.username,
          avatar: users.avatar,
        },
      })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(
        and(
          eq(products.status, 'active'),
          sql`${products.id} != ${id}`,
          or(
            eq(products.categoryId, product.categoryId || ''),
            eq(products.size, product.size),
            and(
              gte(products.price, product.price - 2000),
              lte(products.price, product.price + 2000)
            )
          )
        )
      )
      .orderBy(desc(products.createdAt))
      .limit(limitNum)

    // Convert S3 keys to presigned URLs for all products
    const processedProducts = await processProductImages(similarProducts)

    return res.status(200).json({
      data: processedProducts,
    })
  } catch (error) {
    console.error('Error fetching similar products:', error)
    return res.status(500).json({ error: 'Failed to fetch similar products' })
  }
}
