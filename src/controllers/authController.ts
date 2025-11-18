import type { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { generateAuthTokens, verifyRefreshToken } from '../utils/jwt.ts'
import { jwtRevocationManager } from '../utils/jwtRevocation.ts'
import { db } from '../db/connection.ts'
import { users } from '../db/schema.ts'
import { eq, sql } from 'drizzle-orm'
import type { AuthenticatedRequest } from '../middleware/auth.ts'
import { sendPasswordResetEmail } from '../utils/email.ts'
import { env } from '../../env.ts'

export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password, firstName, lastName } = req.body

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        authProvider: 'email',
        linkedProviders: ['email'],
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt,
      })

    // Generate authentication tokens (access, ID, and refresh)
    const tokens = await generateAuthTokens({
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
    })

    // Set refresh token as httpOnly cookie for security
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    })

    // Return access token and ID token (not refresh token)
    res.status(201).json({
      message: 'User created successfully',
      user: newUser,
      accessToken: tokens.accessToken,
      idToken: tokens.idToken,
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Failed to create user' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email))

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (1000 * 60)
      )
      return res.status(423).json({
        error: `Account temporarily locked. Please try again in ${remainingMinutes} minute(s).`,
      })
    }

    // Check if user has a password (not OAuth-only user)
    if (!user.password) {
      return res.status(401).json({
        error: 'This account uses social sign-in. Please login with Google or Facebook.'
      })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      // Increment failed login attempts
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1
      const shouldLock = newFailedAttempts >= 5

      await db
        .update(users)
        .set({
          failedLoginAttempts: newFailedAttempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
            : null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))

      if (shouldLock) {
        return res.status(423).json({
          error: 'Account locked due to multiple failed login attempts. Please try again in 15 minutes.',
        })
      }

      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Reset failed login attempts on successful login
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    // Generate authentication tokens (access, ID, and refresh)
    const tokens = await generateAuthTokens({
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    })

    // Set refresh token as httpOnly cookie for security
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    })

    // Return access token and ID token (not refresh token)
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      accessToken: tokens.accessToken,
      idToken: tokens.idToken,
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Failed to login' })
  }
}

export const verifyToken = async (req: Request, res: Response) => {
  try {
    // The authenticateToken middleware has already validated the token
    // and attached the user payload to req.user
    const user = (req as any).user

    res.json({
      valid: true,
      user,
    })
  } catch (error) {
    console.error('Token verification error:', error)
    res.status(500).json({ error: 'Failed to verify token' })
  }
}

export const refreshTokens = async (req: Request, res: Response) => {
  try {
    // Try to get refresh token from httpOnly cookie first, fallback to body for backward compatibility
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' })
    }

    // Verify the refresh token
    const payload = await verifyRefreshToken(refreshToken)

    // Get user from database
    const [user] = await db.select().from(users).where(eq(users.id, payload.id))

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Generate new tokens (including a new refresh token)
    const tokens = await generateAuthTokens({
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    })

    // Set new refresh token as httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    })

    // Return new access and ID tokens (not refresh token)
    res.json({
      message: 'Tokens refreshed successfully',
      accessToken: tokens.accessToken,
      idToken: tokens.idToken,
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    return res.status(403).json({ error: 'Invalid or expired refresh token' })
  }
}

export const revokeTokens = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Revoke all tokens for this user
    // Duration should be at least as long as the longest token lifetime (30 days for refresh tokens)
    const revocationDuration = 30 * 24 * 60 * 60 // 30 days in seconds
    jwtRevocationManager.revoke(user.id, revocationDuration)

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
    })

    res.json({
      message: 'All tokens have been revoked successfully. Please login again.',
    })
  } catch (error) {
    console.error('Token revocation error:', error)
    res.status(500).json({ error: 'Failed to revoke tokens' })
  }
}

/**
 * Parse token expiry string (e.g., "1h", "30m", "2d") to milliseconds
 */
function parseTokenExpiry(expiryString: string): number {
  const match = expiryString.match(/^(\d+)([smhd])$/)
  if (!match) {
    throw new Error('Invalid token expiry format')
  }

  const value = parseInt(match[1])
  const unit = match[2]

  const multipliers = {
    s: 1000,           // seconds
    m: 60 * 1000,      // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
  }

  return value * multipliers[unit as keyof typeof multipliers]
}

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email))

    // Always return success to prevent email enumeration
    // Don't reveal whether the email exists or not
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`)
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      })
    }

    // Check if user has a password (not OAuth-only user)
    if (!user.password) {
      console.log(`Password reset requested for OAuth-only user: ${email}`)
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      })
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex')

    // Hash the token before storing it in the database
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    // Calculate expiry time
    const expiryMs = parseTokenExpiry(env.PASSWORD_RESET_TOKEN_EXPIRES_IN)
    const expiresAt = new Date(Date.now() + expiryMs)

    // Update user with reset token and expiry, reset the used flag
    await db
      .update(users)
      .set({
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: expiresAt,
        passwordResetUsed: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken)
      console.log(`Password reset email sent to: ${user.email}`)
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError)
      // Clear the reset token if email fails
      await db
        .update(users)
        .set({
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        })
        .where(eq(users.id, user.id))

      return res.status(500).json({ error: 'Failed to send password reset email' })
    }

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('Password reset request error:', error)
    res.status(500).json({ error: 'Failed to process password reset request' })
  }
}

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' })
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' })
    }

    // Hash the token to match against stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // Find user with this reset token
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, hashedToken))

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    // Check if token has expired
    if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    // Check if token has already been used
    if (user.passwordResetUsed) {
      return res.status(400).json({ error: 'This reset token has already been used' })
    }

    // Hash the new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    // Update user's password, mark token as used, and clear reset token
    await db
      .update(users)
      .set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        passwordResetUsed: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    // Revoke all existing tokens for security
    const revocationDuration = 30 * 24 * 60 * 60 // 30 days in seconds
    jwtRevocationManager.revoke(user.id, revocationDuration)

    console.log(`Password successfully reset for user: ${user.email}`)

    res.json({
      message: 'Password has been reset successfully. Please login with your new password.',
    })
  } catch (error) {
    console.error('Password reset error:', error)
    res.status(500).json({ error: 'Failed to reset password' })
  }
}
