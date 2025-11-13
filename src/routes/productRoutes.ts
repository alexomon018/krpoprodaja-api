import { Router } from 'express'
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  getSimilarProducts,
} from '../controllers/productController.ts'
import { authenticateToken, optionalAuth } from '../middleware/auth.ts'

const router = Router()

// Public routes (with optional auth for view tracking)

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags:
 *       - Products
 *     summary: List products with filters and pagination
 *     description: Get a paginated list of products with various filtering options
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title/description/brand
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category ID
 *       - in: query
 *         name: priceMin
 *         schema:
 *           type: integer
 *         description: Minimum price in RSD
 *       - in: query
 *         name: priceMax
 *         schema:
 *           type: integer
 *         description: Maximum price in RSD
 *       - in: query
 *         name: size
 *         schema:
 *           type: string
 *           enum: [XS, S, M, L, XL, XXL, XXXL]
 *         description: Filter by clothing size
 *       - in: query
 *         name: condition
 *         schema:
 *           type: string
 *           enum: [new, very-good, good, satisfactory]
 *         description: Filter by item condition
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand name
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *         description: Filter by color
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, reserved, sold, deleted]
 *           default: active
 *         description: Filter by product status
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, price-low, price-high, popular]
 *           default: newest
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       price:
 *                         type: integer
 *                       originalPrice:
 *                         type: integer
 *                       images:
 *                         type: array
 *                         items:
 *                           type: string
 *                           format: uri
 *                       size:
 *                         type: string
 *                       condition:
 *                         type: string
 *                       brand:
 *                         type: string
 *                       color:
 *                         type: string
 *                       location:
 *                         type: string
 *                       status:
 *                         type: string
 *                       viewCount:
 *                         type: integer
 *                       favoriteCount:
 *                         type: integer
 *                       categoryId:
 *                         type: string
 *                         format: uuid
 *                       sellerId:
 *                         type: string
 *                         format: uuid
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/', getProducts)

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get product by ID
 *     description: Retrieve a single product by its ID. Increments view count.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 price:
 *                   type: integer
 *                 originalPrice:
 *                   type: integer
 *                 images:
 *                   type: array
 *                   items:
 *                     type: string
 *                     format: uri
 *                 size:
 *                   type: string
 *                 condition:
 *                   type: string
 *                 brand:
 *                   type: string
 *                 color:
 *                   type: string
 *                 material:
 *                   type: string
 *                 location:
 *                   type: string
 *                 status:
 *                   type: string
 *                 viewCount:
 *                   type: integer
 *                 favoriteCount:
 *                   type: integer
 *                 categoryId:
 *                   type: string
 *                   format: uuid
 *                 sellerId:
 *                   type: string
 *                   format: uuid
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', optionalAuth, getProductById)

/**
 * @swagger
 * /api/products/{id}/similar:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get similar products
 *     description: Get products similar to the specified product (same category, size, or price range)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of similar products to return
 *     responses:
 *       200:
 *         description: Similar products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   title:
 *                     type: string
 *                   price:
 *                     type: integer
 *                   images:
 *                     type: array
 *                     items:
 *                       type: string
 *                       format: uri
 *                   condition:
 *                     type: string
 *                   status:
 *                     type: string
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/similar', getSimilarProducts)

// Protected routes (require authentication)

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags:
 *       - Products
 *     summary: Create a new product listing
 *     description: Create a new product listing (requires authentication)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - price
 *               - categoryId
 *               - images
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 100
 *                 example: Nike Air Max 90 - Barely Used
 *               description:
 *                 type: string
 *                 example: Excellent condition Nike Air Max 90 sneakers, worn only a few times
 *               price:
 *                 type: integer
 *                 minimum: 0
 *                 example: 5000
 *                 description: Price in RSD
 *               originalPrice:
 *                 type: integer
 *                 minimum: 0
 *                 example: 15000
 *                 description: Original price in RSD
 *               images:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   format: uri
 *                 example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
 *               size:
 *                 type: string
 *                 enum: [XS, S, M, L, XL, XXL, XXXL]
 *                 example: M
 *               condition:
 *                 type: string
 *                 enum: [new, very-good, good, satisfactory]
 *                 example: very-good
 *               brand:
 *                 type: string
 *                 example: Nike
 *               color:
 *                 type: string
 *                 example: White
 *               material:
 *                 type: string
 *                 example: Leather/Mesh
 *               location:
 *                 type: string
 *                 example: Beograd
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 price:
 *                   type: integer
 *                 status:
 *                   type: string
 *                   default: active
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authenticateToken, createProduct)

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags:
 *       - Products
 *     summary: Update product listing
 *     description: Update an existing product listing (must be the owner)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 100
 *               description:
 *                 type: string
 *               price:
 *                 type: integer
 *                 minimum: 0
 *               originalPrice:
 *                 type: integer
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *               size:
 *                 type: string
 *               condition:
 *                 type: string
 *               brand:
 *                 type: string
 *               color:
 *                 type: string
 *               material:
 *                 type: string
 *               location:
 *                 type: string
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 price:
 *                   type: integer
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Not the product owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', authenticateToken, updateProduct)

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags:
 *       - Products
 *     summary: Delete product listing
 *     description: Soft delete a product listing (must be the owner)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Product deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Not the product owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', authenticateToken, deleteProduct)

/**
 * @swagger
 * /api/products/{id}/status:
 *   patch:
 *     tags:
 *       - Products
 *     summary: Update product status
 *     description: Update the status of a product (active, reserved, sold, deleted)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, reserved, sold, deleted]
 *                 example: sold
 *     responses:
 *       200:
 *         description: Product status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *       400:
 *         description: Invalid status value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Not the product owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/status', authenticateToken, updateProductStatus)

export default router
