/**
 * OAuth Token Replay Protection
 * Tracks used OAuth tokens to prevent replay attacks
 *
 * Note: This is an in-memory implementation suitable for single-server deployments.
 * For multi-server deployments, consider using Redis or a database.
 */

interface UsedToken {
  token: string
  usedAt: number
}

class OAuthTokenTracker {
  private usedTokens: Map<string, UsedToken>
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly TOKEN_LIFETIME_MS = 10 * 60 * 1000 // 10 minutes

  constructor() {
    this.usedTokens = new Map()
    this.startCleanup()
  }

  /**
   * Check if a token has already been used
   * @param token - The OAuth token to check
   * @returns true if token has been used, false otherwise
   */
  isTokenUsed(token: string): boolean {
    return this.usedTokens.has(token)
  }

  /**
   * Mark a token as used
   * @param token - The OAuth token to mark as used
   */
  markTokenAsUsed(token: string): void {
    this.usedTokens.set(token, {
      token,
      usedAt: Date.now(),
    })
  }

  /**
   * Start automatic cleanup of expired tokens
   */
  private startCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)

    // Ensure cleanup doesn't prevent Node.js from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * Clean up expired tokens (older than 10 minutes)
   */
  private cleanup(): void {
    const now = Date.now()
    let removedCount = 0

    for (const [token, info] of this.usedTokens.entries()) {
      if (now - info.usedAt > this.TOKEN_LIFETIME_MS) {
        this.usedTokens.delete(token)
        removedCount++
      }
    }

    if (removedCount > 0) {
      console.log(
        `[OAuthTokenTracker] Cleaned up ${removedCount} expired tokens. ` +
          `Active tokens: ${this.usedTokens.size}`
      )
    }
  }

  /**
   * Get statistics about tracked tokens
   */
  getStats(): { totalTracked: number; oldestTokenAge: number | null } {
    let oldestAge: number | null = null

    if (this.usedTokens.size > 0) {
      const now = Date.now()
      for (const info of this.usedTokens.values()) {
        const age = now - info.usedAt
        if (oldestAge === null || age > oldestAge) {
          oldestAge = age
        }
      }
    }

    return {
      totalTracked: this.usedTokens.size,
      oldestTokenAge: oldestAge,
    }
  }

  /**
   * Stop the cleanup interval (for testing or shutdown)
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// Export singleton instance
export const oauthTokenTracker = new OAuthTokenTracker()
