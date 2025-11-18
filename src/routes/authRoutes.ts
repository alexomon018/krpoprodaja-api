import { Router } from 'express'
import { register, login, verifyToken, refreshTokens, revokeTokens, requestPasswordReset, resetPassword } from '../controllers/authController.ts'
import { googleAuth, facebookAuth } from '../controllers/oauthController.ts'
import { validateBody } from '../middleware/validation.ts'
import { authenticateToken } from '../middleware/auth.ts'
import {
  authLimiter,
  refreshLimiter,
  resetPasswordRequestLimiter,
  resetPasswordCompleteLimiter
} from '../middleware/rateLimiting.ts'
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
  refreshToken: z.string().optional(), // Optional since we now use httpOnly cookies
})

const googleAuthSchema = z.object({
  token: z.string().min(1, 'Google ID token is required'),
})

const facebookAuthSchema = z.object({
  accessToken: z.string().min(1, 'Facebook access token is required'),
})

const requestPasswordResetSchema = z.object({
  email: z.string().email('Invalid email format'),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

// Routes
router.post('/register', authLimiter, validateBody(insertUserSchema), register)
router.post('/login', authLimiter, validateBody(loginSchema), login)
router.post('/refresh', refreshLimiter, validateBody(refreshTokenSchema), refreshTokens)
router.post('/revoke', authenticateToken, revokeTokens)
router.get('/verify', authenticateToken, verifyToken)

// OAuth routes
router.post('/google', authLimiter, validateBody(googleAuthSchema), googleAuth)
router.post('/facebook', authLimiter, validateBody(facebookAuthSchema), facebookAuth)

// Password reset routes
router.post('/request-password-reset', resetPasswordRequestLimiter, validateBody(requestPasswordResetSchema), requestPasswordReset)
router.post('/reset-password', resetPasswordCompleteLimiter, validateBody(resetPasswordSchema), resetPassword)

export default router
