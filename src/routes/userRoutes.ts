import { Router } from 'express'
import {
  getProfile,
  updateProfile,
  changePassword,
  sendPhoneVerification,
  verifyPhone,
  resendPhoneVerification,
} from '../controllers/userController.ts'
import { authenticateToken, requireVerifiedEmail } from '../middleware/auth.ts'
import { validateBody } from '../middleware/validation.ts'
import { phoneVerificationLimiter } from '../middleware/rateLimiting.ts'
import { z } from 'zod'

const router = Router()

// Apply authentication to all routes
router.use(authenticateToken)

// Validation schemas
const updateProfileSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  firstName: z.string().max(50, 'First name too long').optional(),
  lastName: z.string().max(50, 'Last name too long').optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

const sendPhoneVerificationSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Phone number must be in E.164 format'),
})

const verifyPhoneSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
})

// Routes
router.get('/profile', getProfile)
router.put('/profile', requireVerifiedEmail, validateBody(updateProfileSchema), updateProfile)
router.put('/password', requireVerifiedEmail, validateBody(changePasswordSchema), changePassword)

// Phone verification routes
router.post('/phone/send-verification', requireVerifiedEmail, phoneVerificationLimiter, validateBody(sendPhoneVerificationSchema), sendPhoneVerification)
router.post('/phone/verify', requireVerifiedEmail, phoneVerificationLimiter, validateBody(verifyPhoneSchema), verifyPhone)
router.post('/phone/resend-verification', requireVerifiedEmail, phoneVerificationLimiter, resendPhoneVerification)

export default router
