import { Router } from 'express'
import { getBrands } from '../controllers/brandController.ts'

const router = Router()

// Public route
router.get('/', getBrands)

export default router
