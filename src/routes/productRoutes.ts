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
router.get('/', getProducts)
router.get('/:id', optionalAuth, getProductById)
router.get('/:id/similar', getSimilarProducts)

// Protected routes (require authentication)
router.post('/', authenticateToken, createProduct)
router.put('/:id', authenticateToken, updateProduct)
router.delete('/:id', authenticateToken, deleteProduct)
router.patch('/:id/status', authenticateToken, updateProductStatus)

export default router
