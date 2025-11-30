/**
 * Redis-Backed JWT Token Revocation Manager
 *
 * Manages revoked JWT tokens using Redis. Tokens are revoked by user ID,
 * which invalidates all tokens issued before the revocation timestamp.
 *
 * This implementation is suitable for multi-server production deployments
 * where token revocations need to be shared across all instances.
 *
 * Redis keys:
 * - `jwt:revoked:{userId}` - Stores revocation timestamp with TTL
 */

import { getRedisClient } from "../db/redis.ts";

interface RevokedToken {
  userId: string;
  revokedAt: number; // Timestamp when tokens were revoked
}

class RedisJWTRevocationManager {
  private readonly keyPrefix = "jwt:revoked:";

  /**
   * Generate Redis key for user revocation
   */
  private getKey(userId: string): string {
    return `${this.keyPrefix}${userId}`;
  }

  /**
   * Check if a token is valid (not revoked)
   * @param userId - User ID from the token payload
   * @param tokenIssuedAt - When the token was issued (iat claim in seconds)
   * @returns true if token is valid, false if revoked
   */
  async isValid(userId: string, tokenIssuedAt: number): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const key = this.getKey(userId);
      const revokedAtStr = await client.get(key);

      if (!revokedAtStr) {
        return true; // No revocation record, token is valid
      }

      const revokedAt = parseInt(String(revokedAtStr), 10);
      if (isNaN(revokedAt)) {
        console.error(`Invalid revocation timestamp for user ${userId}: ${revokedAtStr}`);
        return true; // If data is corrupted, allow access
      }

      // Token is valid if it was issued after the revocation timestamp
      const tokenIssuedAtMs = tokenIssuedAt * 1000;
      return tokenIssuedAtMs > revokedAt;
    } catch (error) {
      console.error("Error checking token revocation:", error);
      // On error, allow access (fail open) to prevent service disruption
      return true;
    }
  }

  /**
   * Revoke all tokens for a user
   * @param userId - User ID to revoke tokens for
   * @param durationSeconds - How long to maintain the revocation (default: 30 days)
   */
  async revoke(userId: string, durationSeconds: number = 30 * 24 * 60 * 60): Promise<void> {
    try {
      const client = await getRedisClient();
      const key = this.getKey(userId);
      const now = Date.now();

      // Store revocation timestamp with TTL
      await client.setEx(key, durationSeconds, now.toString());

      console.log(
        `Revoked all tokens for user ${userId} for ${durationSeconds} seconds (until ${new Date(now + durationSeconds * 1000).toISOString()})`
      );
    } catch (error) {
      console.error(`Error revoking tokens for user ${userId}:`, error);
      throw new Error("Failed to revoke tokens");
    }
  }

  /**
   * Explicitly remove revocation for a user (un-revoke)
   * @param userId - User ID to remove revocation for
   * @returns true if revocation was removed, false if no revocation existed
   */
  async unrevoke(userId: string): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const key = this.getKey(userId);
      const result = await client.del(key);
      return Number(result) > 0;
    } catch (error) {
      console.error(`Error unrevoking tokens for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get revocation info for a user
   * @param userId - User ID to check
   * @returns Revocation info or null
   */
  async getRevocation(userId: string): Promise<RevokedToken | null> {
    try {
      const client = await getRedisClient();
      const key = this.getKey(userId);
      const revokedAtStr = await client.get(key);

      if (!revokedAtStr) {
        return null;
      }

      const revokedAt = parseInt(String(revokedAtStr), 10);
      if (isNaN(revokedAt)) {
        return null;
      }

      return {
        userId,
        revokedAt,
      };
    } catch (error) {
      console.error(`Error getting revocation for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get statistics about revoked tokens
   * Note: This scans all revocation keys, use sparingly
   */
  async getStats(): Promise<{ total: number }> {
    try {
      const client = await getRedisClient();
      const pattern = `${this.keyPrefix}*`;
      const keys = await client.keys(pattern);

      return {
        total: keys.length,
      };
    } catch (error) {
      console.error("Error getting revocation stats:", error);
      return { total: 0 };
    }
  }

  /**
   * Clear all revocations (use with caution!)
   * Note: This scans and deletes all revocation keys
   */
  async clear(): Promise<number> {
    try {
      const client = await getRedisClient();
      const pattern = `${this.keyPrefix}*`;
      const keys = await client.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const result = await client.del(keys);
      const count = Number(result);
      console.log(`JWT Revocation manager: Cleared ${count} revocations`);
      return count;
    } catch (error) {
      console.error("Error clearing revocations:", error);
      return 0;
    }
  }

  /**
   * Check Redis connection health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const response = await client.ping();
      return response === "PONG";
    } catch (error) {
      console.error("Redis health check failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const redisJwtRevocationManager = new RedisJWTRevocationManager();

// Export class for testing
export { RedisJWTRevocationManager };
