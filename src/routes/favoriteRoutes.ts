import { Router } from 'express'
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
} from '../controllers/favoriteController.ts'
import { authenticateToken, requireVerifiedEmail } from '../middleware/auth.ts'

const router = Router()

// All favorite routes require authentication + email verification
router.get('/', authenticateToken, requireVerifiedEmail, getFavorites)
router.post('/:productId', authenticateToken, requireVerifiedEmail, addFavorite)
router.delete('/:productId', authenticateToken, requireVerifiedEmail, removeFavorite)
router.get('/check/:productId', authenticateToken, requireVerifiedEmail, checkFavorite)

export default router
