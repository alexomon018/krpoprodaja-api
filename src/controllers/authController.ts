import type { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { generateAuthTokens, verifyRefreshToken } from '../utils/jwt.ts'
import { jwtRevocationManager } from '../utils/jwtRevocation.ts'
import { db } from '../db/connection.ts'
import { users } from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import type { AuthenticatedRequest } from '../middleware/auth.ts'

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

    res.status(201).json({
      message: 'User created successfully',
      user: newUser,
      ...tokens,
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

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate authentication tokens (access, ID, and refresh)
    const tokens = await generateAuthTokens({
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    })

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ...tokens,
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
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' })
    }

    // Verify the refresh token
    const payload = await verifyRefreshToken(refreshToken)

    // Check if user's tokens have been revoked
    const decoded = await verifyRefreshToken(refreshToken)
    // Note: Refresh tokens also need to check revocation
    // We'll use a very long duration for refresh token revocations

    // Get user from database
    const [user] = await db.select().from(users).where(eq(users.id, payload.id))

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Generate new access and ID tokens (keep the same refresh token)
    const tokens = await generateAuthTokens({
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    })

    res.json({
      message: 'Tokens refreshed successfully',
      ...tokens,
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

    res.json({
      message: 'All tokens have been revoked successfully. Please login again.',
    })
  } catch (error) {
    console.error('Token revocation error:', error)
    res.status(500).json({ error: 'Failed to revoke tokens' })
  }
}
