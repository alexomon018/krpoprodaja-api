import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JWTRevocationManager } from '../../src/utils/jwtRevocation.ts'

describe('JWTRevocationManager', () => {
  let manager: JWTRevocationManager

  beforeEach(() => {
    // Create a new instance for each test
    manager = new JWTRevocationManager()
  })

  afterEach(() => {
    // Clean up
    manager.stopCleanup()
    manager.clear()
  })

  describe('isValid', () => {
    it('should return true for non-revoked users', () => {
      const userId = 'user-123'
      const tokenIssuedAt = Math.floor(Date.now() / 1000)

      expect(manager.isValid(userId, tokenIssuedAt)).toBe(true)
    })

    it('should return false for revoked tokens issued before revocation', () => {
      const userId = 'user-123'
      const tokenIssuedAt = Math.floor(Date.now() / 1000)

      // Wait a bit and then revoke
      const revokeTime = Date.now() + 100
      vi.setSystemTime(revokeTime)

      manager.revoke(userId, 3600) // Revoke for 1 hour

      expect(manager.isValid(userId, tokenIssuedAt)).toBe(false)

      vi.useRealTimers()
    })

    it('should return true for tokens issued after revocation', () => {
      const userId = 'user-123'

      // Revoke tokens
      manager.revoke(userId, 3600)

      // Token issued after revocation
      const tokenIssuedAt = Math.floor((Date.now() + 1000) / 1000)

      expect(manager.isValid(userId, tokenIssuedAt)).toBe(true)
    })

    it('should handle multiple users independently', () => {
      const user1 = 'user-1'
      const user2 = 'user-2'
      const tokenIssuedAt = Math.floor(Date.now() / 1000)

      manager.revoke(user1, 3600)

      expect(manager.isValid(user1, tokenIssuedAt)).toBe(false)
      expect(manager.isValid(user2, tokenIssuedAt)).toBe(true)
    })
  })

  describe('revoke', () => {
    it('should revoke tokens for a user', () => {
      const userId = 'user-123'

      manager.revoke(userId, 3600)

      const revocation = manager.getRevocation(userId)
      expect(revocation).toBeTruthy()
      expect(revocation?.userId).toBe(userId)
    })

    it('should set expiration time based on duration', () => {
      const userId = 'user-123'
      const durationSeconds = 3600 // 1 hour
      const beforeRevoke = Date.now()

      manager.revoke(userId, durationSeconds)

      const revocation = manager.getRevocation(userId)
      expect(revocation).toBeTruthy()

      const expectedExpiry = beforeRevoke + durationSeconds * 1000
      // Allow 100ms tolerance
      expect(revocation!.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 100)
      expect(revocation!.expiresAt).toBeLessThanOrEqual(expectedExpiry + 100)
    })

    it('should update revocation if called multiple times for same user', () => {
      const userId = 'user-123'

      manager.revoke(userId, 3600)
      const firstRevocation = manager.getRevocation(userId)

      // Wait a bit and revoke again
      vi.setSystemTime(Date.now() + 1000)
      manager.revoke(userId, 7200)
      const secondRevocation = manager.getRevocation(userId)

      expect(secondRevocation?.revokedAt).toBeGreaterThan(firstRevocation!.revokedAt)

      vi.useRealTimers()
    })

    it('should use default duration if not specified', () => {
      const userId = 'user-123'
      const beforeRevoke = Date.now()

      manager.revoke(userId) // No duration specified

      const revocation = manager.getRevocation(userId)
      expect(revocation).toBeTruthy()

      // Default is 30 days
      const expectedExpiry = beforeRevoke + 30 * 24 * 60 * 60 * 1000
      expect(revocation!.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 100)
      expect(revocation!.expiresAt).toBeLessThanOrEqual(expectedExpiry + 100)
    })
  })

  describe('unrevoke', () => {
    it('should remove revocation for a user', () => {
      const userId = 'user-123'

      manager.revoke(userId, 3600)
      expect(manager.getRevocation(userId)).toBeTruthy()

      const result = manager.unrevoke(userId)

      expect(result).toBe(true)
      expect(manager.getRevocation(userId)).toBeNull()
    })

    it('should return false if user was not revoked', () => {
      const userId = 'user-123'

      const result = manager.unrevoke(userId)

      expect(result).toBe(false)
    })

    it('should make previously invalid tokens valid', () => {
      const userId = 'user-123'
      const tokenIssuedAt = Math.floor(Date.now() / 1000)

      manager.revoke(userId, 3600)
      expect(manager.isValid(userId, tokenIssuedAt)).toBe(false)

      manager.unrevoke(userId)
      expect(manager.isValid(userId, tokenIssuedAt)).toBe(true)
    })
  })

  describe('getRevocation', () => {
    it('should return revocation info for revoked user', () => {
      const userId = 'user-123'

      manager.revoke(userId, 3600)

      const revocation = manager.getRevocation(userId)

      expect(revocation).toBeTruthy()
      expect(revocation?.userId).toBe(userId)
      expect(revocation?.revokedAt).toBeTruthy()
      expect(revocation?.expiresAt).toBeTruthy()
    })

    it('should return null for non-revoked user', () => {
      const userId = 'user-123'

      const revocation = manager.getRevocation(userId)

      expect(revocation).toBeNull()
    })
  })

  describe('getStats', () => {
    it('should return correct stats with no revocations', () => {
      const stats = manager.getStats()

      expect(stats.total).toBe(0)
      expect(stats.active).toBe(0)
      expect(stats.expired).toBe(0)
    })

    it('should count active revocations', () => {
      manager.revoke('user-1', 3600)
      manager.revoke('user-2', 7200)

      const stats = manager.getStats()

      expect(stats.total).toBe(2)
      expect(stats.active).toBe(2)
      expect(stats.expired).toBe(0)
    })

    it('should distinguish between active and expired revocations', () => {
      // Create an expired revocation by manipulating time
      const now = Date.now()

      // Revoke with very short duration
      manager.revoke('user-expired', 1) // 1 second

      // Move time forward
      vi.setSystemTime(now + 5000)

      // Create active revocation
      manager.revoke('user-active', 3600)

      const stats = manager.getStats()

      expect(stats.total).toBe(2)
      expect(stats.active).toBe(1)
      expect(stats.expired).toBe(1)

      vi.useRealTimers()
    })
  })

  describe('clear', () => {
    it('should remove all revocations', () => {
      manager.revoke('user-1', 3600)
      manager.revoke('user-2', 3600)
      manager.revoke('user-3', 3600)

      expect(manager.getStats().total).toBe(3)

      manager.clear()

      const stats = manager.getStats()
      expect(stats.total).toBe(0)
      expect(stats.active).toBe(0)
      expect(stats.expired).toBe(0)
    })

    it('should make all tokens valid after clearing', () => {
      const userId = 'user-123'
      const tokenIssuedAt = Math.floor(Date.now() / 1000)

      manager.revoke(userId, 3600)
      expect(manager.isValid(userId, tokenIssuedAt)).toBe(false)

      manager.clear()
      expect(manager.isValid(userId, tokenIssuedAt)).toBe(true)
    })
  })

  describe('Cleanup functionality', () => {
    it('should start cleanup on initialization', () => {
      // The cleanup is started in constructor
      // This test verifies cleanup doesn't throw errors
      const manager = new JWTRevocationManager()

      // Create a revocation (cleanup runs on init but won't affect non-expired entries)
      manager.revoke('user-1', 3600)

      const stats = manager.getStats()
      expect(stats.total).toBeGreaterThan(0)

      manager.stopCleanup()
      manager.clear()
    })

    it('should stop cleanup when requested', () => {
      const manager = new JWTRevocationManager()

      manager.stopCleanup()

      // After stopping, no error should occur
      expect(() => manager.stopCleanup()).not.toThrow()

      manager.clear()
    })
  })

  describe('Edge cases', () => {
    it('should handle token issued at exactly revocation time', () => {
      const userId = 'user-123'
      const now = Date.now()

      manager.revoke(userId, 3600)

      const tokenIssuedAt = Math.floor(now / 1000)

      // Token issued at same time as revocation should be invalid
      expect(manager.isValid(userId, tokenIssuedAt)).toBe(false)
    })

    it('should handle very large duration values', () => {
      const userId = 'user-123'
      const veryLargeDuration = 365 * 24 * 60 * 60 // 1 year in seconds

      expect(() => manager.revoke(userId, veryLargeDuration)).not.toThrow()

      const revocation = manager.getRevocation(userId)
      expect(revocation).toBeTruthy()
    })

    it('should handle special characters in user IDs', () => {
      const userId = 'user-123-@#$%^&*()'
      const tokenIssuedAt = Math.floor(Date.now() / 1000)

      manager.revoke(userId, 3600)

      expect(manager.isValid(userId, tokenIssuedAt)).toBe(false)
      expect(manager.getRevocation(userId)).toBeTruthy()
    })
  })
})
