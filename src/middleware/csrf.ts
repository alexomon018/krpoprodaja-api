import type { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

/**
 * Custom CSRF protection middleware
 * Note: csurf package is deprecated, so we implement our own
 *
 * This middleware validates CSRF tokens for state-changing operations
 * when using cookies for authentication
 */

const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate a random CSRF token
 */
function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Middleware to attach CSRF token to request
 * Sets a CSRF token cookie if one doesn't exist
 */
export function csrfTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Check if CSRF token exists in cookie
  let token = req.cookies?.[CSRF_COOKIE_NAME]

  // If no token exists, generate a new one
  if (!token) {
    token = generateCSRFToken()
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    })
  }

  // Attach token to request for easy access
  req.csrfToken = () => token

  next()
}

/**
 * Middleware to verify CSRF token on state-changing requests
 * Should be applied to POST, PUT, PATCH, DELETE routes
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Skip CSRF check for safe methods (GET, HEAD, OPTIONS)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(req.method)) {
    return next()
  }

  // Get token from cookie
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME]

  // Get token from header or body
  const requestToken = req.headers[CSRF_HEADER_NAME] || req.body?._csrf

  // Validate token
  if (!cookieToken || !requestToken || cookieToken !== requestToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
    })
  }

  next()
}

/**
 * Express type augmentation to add csrfToken method
 */
declare global {
  namespace Express {
    interface Request {
      csrfToken?: () => string
    }
  }
}
