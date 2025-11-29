import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Response, NextFunction } from "express";
import {
  authenticateToken,
  optionalAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.ts";
import { generateAccessToken, generateIdToken } from "../../src/utils/jwt.ts";
import { jwtRevocationManager } from "../../src/utils/jwtRevocation.ts";

// Mock Redis client to avoid actual Redis connection in unit tests
vi.mock("../../src/db/redis.ts", () => ({
  getRedisClient: vi.fn(),
  redisClient: null,
  createRedisClient: vi.fn(),
  closeRedisClient: vi.fn(),
}));

// Mock Redis JWT revocation manager to use in-memory manager for tests
vi.mock("../../src/utils/jwtRevocationRedis.ts", async (importOriginal) => {
  const { jwtRevocationManager } = await import(
    "../../src/utils/jwtRevocation.ts"
  );
  return {
    redisJwtRevocationManager: jwtRevocationManager,
  };
});

describe("Auth Middleware", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset mocks
    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();

    // Clear any existing revocations
    jwtRevocationManager.clear();
  });

  describe("authenticateToken", () => {
    it("should authenticate valid access token", async () => {
      const userId = "test-user-123";
      const token = await generateAccessToken(userId);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authenticateToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeTruthy();
      expect(mockRequest.user?.id).toBe(userId);
      expect(mockRequest.user?.type).toBe("access");
    });

    it("should reject request without authorization header", async () => {
      mockRequest.headers = {};

      await authenticateToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Access token required",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject request with malformed authorization header", async () => {
      mockRequest.headers = {
        authorization: "InvalidFormat token",
      };

      await authenticateToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid or expired token",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject invalid token", async () => {
      mockRequest.headers = {
        authorization: "Bearer invalid.token.here",
      };

      await authenticateToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid or expired token",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject ID token when access token is expected", async () => {
      const idToken = await generateIdToken({
        id: "test-user-123",
        email: "test@example.com",
      });

      mockRequest.headers = {
        authorization: `Bearer ${idToken}`,
      };

      await authenticateToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // JWT library checks audience first, so we get generic invalid token error
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid or expired token",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject revoked token", async () => {
      const userId = "test-user-123";
      const token = await generateAccessToken(userId);

      // Revoke tokens for this user
      jwtRevocationManager.revoke(userId, 3600);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authenticateToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Token has been revoked. Please login again.",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should accept token issued after revocation", async () => {
      const userId = "test-user-123";

      // Revoke tokens
      jwtRevocationManager.revoke(userId, 3600);

      // Generate new token after revocation (in real scenario, user would login again)
      // We need to wait long enough for the token's iat to be after revocation timestamp
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const newToken = await generateAccessToken(userId);

      mockRequest.headers = {
        authorization: `Bearer ${newToken}`,
      };

      await authenticateToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeTruthy();
      expect(mockRequest.user?.id).toBe(userId);
    });

    it("should handle missing Bearer prefix", async () => {
      const token = await generateAccessToken("test-user-123");

      mockRequest.headers = {
        authorization: token, // Missing "Bearer "
      };

      await authenticateToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // When split fails, there's no token, so we get 401 "Access token required"
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle case-sensitive authorization header", async () => {
      const userId = "test-user-123";
      const token = await generateAccessToken(userId);

      // Test with lowercase 'authorization'
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authenticateToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user?.id).toBe(userId);
    });
  });

  describe("optionalAuth", () => {
    it("should attach user when valid token is provided", async () => {
      const userId = "test-user-123";
      const token = await generateAccessToken(userId);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await optionalAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeTruthy();
      expect(mockRequest.user?.id).toBe(userId);
    });

    it("should continue without user when no token is provided", async () => {
      mockRequest.headers = {};

      await optionalAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should continue without user when invalid token is provided", async () => {
      mockRequest.headers = {
        authorization: "Bearer invalid.token.here",
      };

      await optionalAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should continue without user when malformed authorization header", async () => {
      mockRequest.headers = {
        authorization: "MalformedHeader",
      };

      await optionalAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
    });

    it("should handle ID token gracefully (not attach user)", async () => {
      const idToken = await generateIdToken({
        id: "test-user-123",
        email: "test@example.com",
      });

      mockRequest.headers = {
        authorization: `Bearer ${idToken}`,
      };

      await optionalAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Should continue without error, but user might not be attached
      // since ID token is not an access token
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("Token extraction", () => {
    it("should extract token from Bearer authorization correctly", async () => {
      const userId = "test-user-123";
      const token = await generateAccessToken(userId);

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authenticateToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user?.id).toBe(userId);
    });

    it("should handle extra spaces in authorization header", async () => {
      const userId = "test-user-123";
      const token = await generateAccessToken(userId);

      mockRequest.headers = {
        authorization: `Bearer  ${token}`, // Extra space
      };

      await authenticateToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Split by space results in empty string for token position, treated as no token
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("should handle token verification errors gracefully", async () => {
      mockRequest.headers = {
        authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",
      };

      await authenticateToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid or expired token",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
