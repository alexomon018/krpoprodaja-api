import { SignJWT, jwtVerify, decodeJwt } from 'jose'
import { createSecretKey } from 'crypto'
import env from '../../env.ts'

/**
 * Parse token expiry string (e.g., "30m", "1h", "7d") to milliseconds
 */
export function parseTokenExpiryToMs(expiryString: string): number {
  const match = expiryString.match(/^(\d+)([smhd])$/)
  if (!match) {
    throw new Error(`Invalid token expiry format: ${expiryString}`)
  }

  const value = parseInt(match[1])
  const unit = match[2]

  const multipliers = {
    s: 1000,                    // seconds
    m: 60 * 1000,               // minutes
    h: 60 * 60 * 1000,          // hours
    d: 24 * 60 * 60 * 1000,     // days
  }

  return value * multipliers[unit as keyof typeof multipliers]
}

/**
 * Token Types:
 * - access: Used for API authorization (short-lived, minimal claims)
 * - id: Contains user identity information (short-lived, full user data)
 * - refresh: Used to obtain new access/id tokens (long-lived)
 */
export type TokenType = 'access' | 'id' | 'refresh'

/**
 * Minimal payload for access tokens (API authorization)
 * Includes activated status (email verified) to avoid DB queries on every request
 */
export interface AccessTokenPayload {
  id: string
  type: 'access'
  activated: boolean
}

/**
 * Full user identity payload for ID tokens
 */
export interface IdTokenPayload {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  type: 'id'
}

/**
 * Payload for refresh tokens
 */
export interface RefreshTokenPayload {
  id: string
  type: 'refresh'
}

/**
 * Union type for all token payloads
 */
export type JwtPayload = AccessTokenPayload | IdTokenPayload | RefreshTokenPayload

/**
 * Response containing all authentication tokens
 */
export interface AuthTokens {
  accessToken: string
  idToken: string
  refreshToken: string
}

/**
 * User data required to generate tokens
 */
export interface TokenUserData {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  activated?: boolean
}

/**
 * Generate access token (short-lived, minimal claims for API authorization)
 */
export const generateAccessToken = async (userId: string, activated: boolean = true): Promise<string> => {
  const secretKey = createSecretKey(env.JWT_SECRET, 'utf-8')

  const payload: AccessTokenPayload = {
    id: userId,
    type: 'access',
    activated,
  }

  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_EXPIRES_IN)
    .setAudience('api')
    .setIssuer('krpoprodaja-api')
    .sign(secretKey)
}

/**
 * Generate ID token (short-lived, contains user identity)
 */
export const generateIdToken = async (user: TokenUserData): Promise<string> => {
  const secretKey = createSecretKey(env.JWT_SECRET, 'utf-8')

  const payload: IdTokenPayload = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    type: 'id',
  }

  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(env.ID_TOKEN_EXPIRES_IN)
    .setAudience('client')
    .setIssuer('krpoprodaja-api')
    .sign(secretKey)
}

/**
 * Generate refresh token (long-lived, used to get new access/ID tokens)
 */
export const generateRefreshToken = async (userId: string): Promise<string> => {
  // Use separate secret for refresh tokens if available, otherwise use JWT_SECRET
  const secret = env.REFRESH_TOKEN_SECRET || env.JWT_SECRET
  const secretKey = createSecretKey(secret, 'utf-8')

  const payload: RefreshTokenPayload = {
    id: userId,
    type: 'refresh',
  }

  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(env.REFRESH_TOKEN_EXPIRES_IN || '30d')
    .setAudience('refresh')
    .setIssuer('krpoprodaja-api')
    .sign(secretKey)
}

/**
 * Generate all authentication tokens (access, ID, and refresh)
 */
export const generateAuthTokens = async (user: TokenUserData): Promise<AuthTokens> => {
  const [accessToken, idToken, refreshToken] = await Promise.all([
    generateAccessToken(user.id, user.activated ?? true),
    generateIdToken(user),
    generateRefreshToken(user.id),
  ])

  return {
    accessToken,
    idToken,
    refreshToken,
  }
}

/**
 * Verify access token
 */
export const verifyAccessToken = async (token: string): Promise<AccessTokenPayload> => {
  const secretKey = createSecretKey(env.JWT_SECRET, 'utf-8')
  const { payload } = await jwtVerify(token, secretKey, {
    audience: 'api',
    issuer: 'krpoprodaja-api',
  })

  if (payload.type !== 'access') {
    throw new Error('Invalid token type: expected access token')
  }

  return {
    id: payload.id as string,
    type: 'access',
    activated: payload.activated as boolean ?? true, // Default to true for backwards compatibility
  }
}

/**
 * Verify ID token
 */
export const verifyIdToken = async (token: string): Promise<IdTokenPayload> => {
  const secretKey = createSecretKey(env.JWT_SECRET, 'utf-8')
  const { payload } = await jwtVerify(token, secretKey, {
    audience: 'client',
    issuer: 'krpoprodaja-api',
  })

  if (payload.type !== 'id') {
    throw new Error('Invalid token type: expected ID token')
  }

  return {
    id: payload.id as string,
    email: payload.email as string,
    firstName: (payload.firstName as string) || null,
    lastName: (payload.lastName as string) || null,
    type: 'id',
  }
}

/**
 * Verify refresh token
 */
export const verifyRefreshToken = async (token: string): Promise<RefreshTokenPayload> => {
  const secret = env.REFRESH_TOKEN_SECRET || env.JWT_SECRET
  const secretKey = createSecretKey(secret, 'utf-8')
  const { payload } = await jwtVerify(token, secretKey, {
    audience: 'refresh',
    issuer: 'krpoprodaja-api',
  })

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type: expected refresh token')
  }

  return {
    id: payload.id as string,
    type: 'refresh',
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use generateAuthTokens instead
 */
export const generateToken = async (payload: { id: string; email: string }): Promise<string> => {
  const secretKey = createSecretKey(env.JWT_SECRET, 'utf-8')

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey)
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use verifyAccessToken or verifyIdToken instead
 */
export const verifyToken = async (token: string): Promise<{ id: string; email: string }> => {
  const secretKey = createSecretKey(env.JWT_SECRET, 'utf-8')
  const { payload } = await jwtVerify(token, secretKey)

  return {
    id: payload.id as string,
    email: payload.email as string,
  }
}
