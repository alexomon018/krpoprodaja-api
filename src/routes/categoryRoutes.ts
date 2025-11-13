import { Router } from 'express'
import { getCategories } from '../controllers/categoryController.ts'

const router = Router()

// Public route
router.get('/', getCategories)

export default router
