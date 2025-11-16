import { Router } from 'express'
import { register, login, verifyToken, refreshTokens, revokeTokens } from '../controllers/authController.ts'
import { googleAuth, facebookAuth } from '../controllers/oauthController.ts'
import { validateBody } from '../middleware/validation.ts'
import { authenticateToken } from '../middleware/auth.ts'
import { z } from 'zod'
import { insertUserSchema } from '../db/schema.ts'

const router = Router()

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username too long'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

const googleAuthSchema = z.object({
  token: z.string().min(1, 'Google ID token is required'),
})

const facebookAuthSchema = z.object({
  accessToken: z.string().min(1, 'Facebook access token is required'),
})

// Routes
router.post('/register', validateBody(insertUserSchema), register)
router.post('/login', validateBody(loginSchema), login)
router.post('/refresh', validateBody(refreshTokenSchema), refreshTokens)
router.post('/revoke', authenticateToken, revokeTokens)
router.get('/verify', authenticateToken, verifyToken)

// OAuth routes
router.post('/google', validateBody(googleAuthSchema), googleAuth)
router.post('/facebook', validateBody(facebookAuthSchema), facebookAuth)

export default router
