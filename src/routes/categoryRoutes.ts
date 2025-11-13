import { Router } from 'express'
import { getCategories } from '../controllers/categoryController.ts'

const router = Router()

// Public route

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags:
 *       - Categories
 *     summary: Get all categories
 *     description: Retrieve all product categories with their product counts
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
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
 *                     example: 123e4567-e89b-12d3-a456-426614174000
 *                   name:
 *                     type: string
 *                     example: Jakne i kaputi
 *                   slug:
 *                     type: string
 *                     example: jakne-i-kaputi
 *                   icon:
 *                     type: string
 *                     example: jacket
 *                   productCount:
 *                     type: integer
 *                     example: 42
 *                     description: Number of active products in this category
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 */
router.get('/', getCategories)

export default router
