import { Router } from 'express'
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
} from '../controllers/favoriteController.ts'
import { authenticateToken } from '../middleware/auth.ts'

const router = Router()

// All favorite routes require authentication
router.get('/', authenticateToken, getFavorites)
router.post('/:productId', authenticateToken, addFavorite)
router.delete('/:productId', authenticateToken, removeFavorite)
router.get('/check/:productId', authenticateToken, checkFavorite)

export default router
