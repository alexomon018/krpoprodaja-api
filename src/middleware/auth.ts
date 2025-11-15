import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt.ts'
import { jwtRevocationManager } from '../utils/jwtRevocation.ts'
import { decodeJwt } from 'jose'

export interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayload
}

/**
 * Middleware to authenticate requests using access tokens
 * Expects: Authorization: Bearer <accessToken>
 * Also checks if the token has been revoked
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' })
    }

    // Verify access token (only accepts tokens with type: 'access')
    const payload = await verifyAccessToken(token)

    // Decode to get the iat (issued at) claim
    const decoded = decodeJwt(token)
    const issuedAt = decoded.iat

    if (!issuedAt) {
      return res.status(403).json({ error: 'Invalid token: missing issued-at claim' })
    }

    // Check if token has been revoked
    if (!jwtRevocationManager.isValid(payload.id, issuedAt)) {
      return res.status(401).json({ error: 'Token has been revoked. Please login again.' })
    }

    req.user = payload
    next()
  } catch (err) {
    const error = err as Error
    if (error.message?.includes('Invalid token type')) {
      return res.status(403).json({ error: 'Invalid token type: access token required' })
    }
    return res.status(403).json({ error: 'Invalid or expired token' })
  }
}

/**
 * Middleware for optional authentication
 * Continues even if no token or invalid token is provided
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (token) {
      const payload = await verifyAccessToken(token)
      req.user = payload
    }

    next()
  } catch (err) {
    // If token is invalid, just continue without user
    next()
  }
}
