import { Router } from 'express'
import { searchProducts, getSearchSuggestions } from '../controllers/searchController.ts'

const router = Router()

// Public routes
router.get('/', searchProducts)
router.get('/suggestions', getSearchSuggestions)

export default router
