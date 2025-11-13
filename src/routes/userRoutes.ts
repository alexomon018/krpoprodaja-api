import { Router } from 'express'
import {
  getProfile,
  updateProfile,
  changePassword,
} from '../controllers/userController.ts'
import { authenticateToken } from '../middleware/auth.ts'
import { validateBody } from '../middleware/validation.ts'
import { z } from 'zod'

const router = Router()

// Apply authentication to all routes
router.use(authenticateToken)

// Validation schemas
const updateProfileSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username too long')
    .optional(),
  firstName: z.string().max(50, 'First name too long').optional(),
  lastName: z.string().max(50, 'Last name too long').optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

// Routes
router.get('/profile', getProfile)
router.put('/profile', validateBody(updateProfileSchema), updateProfile)
router.put('/password', validateBody(changePasswordSchema), changePassword)

export default router
