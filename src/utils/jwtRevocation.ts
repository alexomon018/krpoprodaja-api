/**
 * JWT Token Revocation Manager
 *
 * Manages revoked JWT tokens in memory. Tokens are revoked by user ID,
 * which invalidates all tokens issued before the revocation timestamp.
 *
 * NOTE: This is an in-memory implementation suitable for single-server deployments.
 * For production multi-server setups, consider using Redis or a database.
 */

interface RevokedToken {
  userId: string
  revokedAt: number // Timestamp when tokens were revoked
  expiresAt: number // When this revocation entry can be cleaned up
}

class JWTRevocationManager {
  private revokedTokens: Map<string, RevokedToken>
  private cleanupInterval: NodeJS.Timeout | null

  constructor() {
    this.revokedTokens = new Map()
    this.cleanupInterval = null
    this.startCleanup()
  }

  /**
   * Check if a token is valid (not revoked)
   * @param userId - User ID from the token payload
   * @param tokenIssuedAt - When the token was issued (iat claim in seconds)
   * @returns true if token is valid, false if revoked
   */
  isValid(userId: string, tokenIssuedAt: number): boolean {
    const revocation = this.revokedTokens.get(userId)

    if (!revocation) {
      return true // No revocation record, token is valid
    }

    // Token is valid if it was issued after the revocation timestamp
    const tokenIssuedAtMs = tokenIssuedAt * 1000
    return tokenIssuedAtMs > revocation.revokedAt
  }

  /**
   * Revoke all tokens for a user
   * @param userId - User ID to revoke tokens for
   * @param durationSeconds - How long to maintain the revocation (default: 30 days)
   */
  revoke(userId: string, durationSeconds: number = 30 * 24 * 60 * 60): void {
    const now = Date.now()
    const revocation: RevokedToken = {
      userId,
      revokedAt: now,
      expiresAt: now + durationSeconds * 1000,
    }

    this.revokedTokens.set(userId, revocation)

    console.log(`Revoked all tokens for user ${userId} until ${new Date(revocation.expiresAt).toISOString()}`)
  }

  /**
   * Explicitly remove revocation for a user (un-revoke)
   * @param userId - User ID to remove revocation for
   */
  unrevoke(userId: string): boolean {
    return this.revokedTokens.delete(userId)
  }

  /**
   * Get revocation info for a user
   * @param userId - User ID to check
   * @returns Revocation info or null
   */
  getRevocation(userId: string): RevokedToken | null {
    return this.revokedTokens.get(userId) || null
  }

  /**
   * Clean up expired revocation entries
   * Automatically removes entries that are past their expiration
   */
  private _cleanUp(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [userId, revocation] of this.revokedTokens.entries()) {
      if (revocation.expiresAt < now) {
        this.revokedTokens.delete(userId)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`JWT Revocation cleanup: Removed ${cleaned} expired entries`)
    }
  }

  /**
   * Start automatic cleanup of expired revocations
   * @param intervalMs - Cleanup interval in milliseconds (default: 1 hour)
   */
  private startCleanup(intervalMs: number = 60 * 60 * 1000): void {
    if (this.cleanupInterval) {
      return // Already running
    }

    // Run cleanup immediately
    this._cleanUp()

    // Then schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this._cleanUp()
    }, intervalMs)

    // Ensure the interval doesn't keep the process alive
    this.cleanupInterval.unref()

    console.log(`JWT Revocation manager started with cleanup interval: ${intervalMs}ms`)
  }

  /**
   * Stop the automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      console.log('JWT Revocation manager cleanup stopped')
    }
  }

  /**
   * Get statistics about revoked tokens
   */
  getStats(): { total: number; active: number; expired: number } {
    const now = Date.now()
    let active = 0
    let expired = 0

    for (const revocation of this.revokedTokens.values()) {
      if (revocation.expiresAt >= now) {
        active++
      } else {
        expired++
      }
    }

    return {
      total: this.revokedTokens.size,
      active,
      expired,
    }
  }

  /**
   * Clear all revocations (use with caution!)
   */
  clear(): void {
    this.revokedTokens.clear()
    console.log('JWT Revocation manager: All revocations cleared')
  }
}

// Export singleton instance
export const jwtRevocationManager = new JWTRevocationManager()

// Export class for testing
export { JWTRevocationManager }
