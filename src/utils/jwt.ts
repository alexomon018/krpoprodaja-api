import { SignJWT, jwtVerify, decodeJwt } from 'jose'
import { createSecretKey } from 'crypto'
import env from '../../env.ts'

/**
 * Token Types:
 * - access: Used for API authorization (short-lived, minimal claims)
 * - id: Contains user identity information (short-lived, full user data)
 * - refresh: Used to obtain new access/id tokens (long-lived)
 */
export type TokenType = 'access' | 'id' | 'refresh'

/**
 * Minimal payload for access tokens (API authorization)
 */
export interface AccessTokenPayload {
  id: string
  type: 'access'
}

/**
 * Full user identity payload for ID tokens
 */
export interface IdTokenPayload {
  id: string
  email: string
  username: string
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
  username: string
  firstName?: string | null
  lastName?: string | null
}

/**
 * Generate access token (short-lived, minimal claims for API authorization)
 */
export const generateAccessToken = async (userId: string): Promise<string> => {
  const secretKey = createSecretKey(env.JWT_SECRET, 'utf-8')

  const payload: AccessTokenPayload = {
    id: userId,
    type: 'access',
  }

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('30m') // 30 minutes
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
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    type: 'id',
  }

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('30m') // 30 minutes
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

  return await new SignJWT(payload)
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
    generateAccessToken(user.id),
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

  return payload as AccessTokenPayload
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

  return payload as IdTokenPayload
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

  return payload as RefreshTokenPayload
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use generateAuthTokens instead
 */
export const generateToken = async (payload: { id: string; email: string; username: string }): Promise<string> => {
  const secretKey = createSecretKey(env.JWT_SECRET, 'utf-8')

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN || '7d')
    .sign(secretKey)
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use verifyAccessToken or verifyIdToken instead
 */
export const verifyToken = async (token: string): Promise<{ id: string; email: string; username: string }> => {
  const secretKey = createSecretKey(env.JWT_SECRET, 'utf-8')
  const { payload } = await jwtVerify(token, secretKey)

  return {
    id: payload.id as string,
    email: payload.email as string,
    username: payload.username as string,
  }
}
