import { Router } from 'express'
import { searchProducts, getSearchSuggestions } from '../controllers/searchController.ts'

const router = Router()

// Public routes

/**
 * @swagger
 * /api/search:
 *   get:
 *     tags:
 *       - Search
 *     summary: Full-text search products
 *     description: Search for products using full-text search with various filters
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query term
 *         example: Nike patike
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
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, price-low, price-high, popular]
 *           default: newest
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
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
 *                       images:
 *                         type: array
 *                         items:
 *                           type: string
 *                           format: uri
 *                       brand:
 *                         type: string
 *                       condition:
 *                         type: string
 *                       status:
 *                         type: string
 *                       categoryId:
 *                         type: string
 *                         format: uuid
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
 *       400:
 *         description: Missing or invalid search query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', searchProducts)

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     tags:
 *       - Search
 *     summary: Get search suggestions
 *     description: Get autocomplete suggestions for products, brands, and categories
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query term (minimum 2 characters)
 *         example: Nik
 *     responses:
 *       200:
 *         description: Suggestions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                       price:
 *                         type: integer
 *                       images:
 *                         type: array
 *                         items:
 *                           type: string
 *                           format: uri
 *                 brands:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Nike", "Adidas"]
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       slug:
 *                         type: string
 *       400:
 *         description: Search query too short (minimum 2 characters)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/suggestions', getSearchSuggestions)

export default router
