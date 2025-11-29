import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import {
  register,
  login,
  verifyToken,
  refreshTokens,
  revokeTokens,
  requestPasswordReset,
  resetPassword,
} from "../../src/controllers/authController.ts";
import { db } from "../../src/db/connection.ts";
import { jwtRevocationManager } from "../../src/utils/jwtRevocation.ts";
import * as jwtUtils from "../../src/utils/jwt.ts";
import * as emailUtils from "../../src/utils/email.ts";
import type { AuthenticatedRequest } from "../../src/middleware/auth.ts";

// Mock dependencies
vi.mock("../../src/db/connection.ts", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock Redis client to avoid actual Redis connection in unit tests
vi.mock("../../src/db/redis.ts", () => ({
  getRedisClient: vi.fn(),
  redisClient: null,
  createRedisClient: vi.fn(),
  closeRedisClient: vi.fn(),
}));

// Mock Redis JWT revocation manager to use in-memory manager for tests
vi.mock("../../src/utils/jwtRevocationRedis.ts", async () => {
  const { jwtRevocationManager } = await import(
    "../../src/utils/jwtRevocation.ts"
  );
  return {
    redisJwtRevocationManager: jwtRevocationManager,
  };
});

vi.mock("../../src/utils/email.ts", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

describe("Auth Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let cookieMock: ReturnType<typeof vi.fn>;
  let clearCookieMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnThis();
    cookieMock = vi.fn().mockReturnThis();
    clearCookieMock = vi.fn().mockReturnThis();

    mockRequest = {
      body: {},
      cookies: {},
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
      cookie: cookieMock,
      clearCookie: clearCookieMock,
    };

    // Clear revocations
    jwtRevocationManager.clear();

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "TestPassword123!",
        firstName: "Test",
        lastName: "User",
      };

      const mockUser = {
        id: "user-123",
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: new Date(),
      };

      // Mock database insert
      const insertMock = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      vi.mocked(db.insert).mockImplementation(insertMock as any);

      mockRequest.body = userData;

      await register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Registration successful. Please check your email to verify your account.",
          user: {
            id: mockUser.id,
            email: mockUser.email,
          },
        })
      );
      // No tokens returned - user needs to verify email first
      expect(cookieMock).not.toHaveBeenCalled();
    });

    it("should hash password before storing", async () => {
      const userData = {
        email: "test@example.com",
        password: "PlainPassword123!",
        firstName: "Test",
        lastName: "User",
      };

      const mockUser = {
        id: "user-123",
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: new Date(),
      };

      let storedPassword: string | undefined;

      const insertMock = vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((values: any) => {
          storedPassword = values.password;
          return {
            returning: vi.fn().mockResolvedValue([mockUser]),
          };
        }),
      });
      vi.mocked(db.insert).mockImplementation(insertMock as any);

      mockRequest.body = userData;

      await register(mockRequest as Request, mockResponse as Response);

      expect(storedPassword).toBeDefined();
      expect(storedPassword).not.toBe(userData.password);
      // Verify it's a bcrypt hash
      expect(storedPassword).toMatch(/^\$2[aby]\$/);
    });

    it("should handle registration errors", async () => {
      const userData = {
        email: "test@example.com",
        password: "TestPassword123!",
      };

      // Mock database error
      const insertMock = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      });
      vi.mocked(db.insert).mockImplementation(insertMock as any);

      mockRequest.body = userData;

      await register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Failed to create user",
      });
    });
  });

  describe("login", () => {
    it("should login with valid credentials", async () => {
      const password = "TestPassword123!";
      const hashedPassword = await bcrypt.hash(password, 12);

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        password: hashedPassword,
        failedLoginAttempts: 0,
        lockedUntil: null,
      };

      // Mock database select
      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      // Mock database update for resetting failed attempts
      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      vi.mocked(db.update).mockImplementation(updateMock as any);

      mockRequest.body = {
        email: mockUser.email,
        password: password,
      };

      await login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).not.toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Login successful",
          user: expect.objectContaining({
            id: mockUser.id,
            email: mockUser.email,
          }),
          accessToken: expect.any(String),
          idToken: expect.any(String),
        })
      );
    });

    it("should reject invalid credentials", async () => {
      const hashedPassword = await bcrypt.hash("correctpassword", 12);

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: hashedPassword,
        failedLoginAttempts: 0,
        lockedUntil: null,
      };

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      vi.mocked(db.update).mockImplementation(updateMock as any);

      mockRequest.body = {
        email: mockUser.email,
        password: "wrongpassword",
      };

      await login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Invalid credentials",
      });
    });

    it("should reject login for non-existent user", async () => {
      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // No user found
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      mockRequest.body = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      await login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Invalid credentials",
      });
    });

    it("should reject login for locked account", async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashedpassword",
        lockedUntil: futureDate,
      };

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      mockRequest.body = {
        email: mockUser.email,
        password: "password123",
      };

      await login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(423);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Account temporarily locked"),
        })
      );
    });

    it("should reject login for OAuth-only users without password", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: null, // OAuth-only user
        lockedUntil: null,
      };

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      mockRequest.body = {
        email: mockUser.email,
        password: "password123",
      };

      await login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error:
          "This account uses social sign-in. Please login with Google or Facebook.",
      });
    });
  });

  describe("verifyToken", () => {
    it("should verify valid token", async () => {
      const mockUser = {
        id: "user-123",
      };

      (mockRequest as any).user = mockUser;

      await verifyToken(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        valid: true,
        user: mockUser,
      });
    });

    it("should handle errors gracefully", async () => {
      (mockRequest as any).user = undefined;
      let callCount = 0;

      // Force an error on first call only
      jsonMock.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Unexpected error");
        }
        return mockResponse;
      });

      await verifyToken(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe("refreshTokens", () => {
    it("should refresh tokens with valid refresh token from cookie", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
      };

      const refreshToken = await jwtUtils.generateRefreshToken(mockUser.id);

      mockRequest.cookies = { refreshToken };

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      await refreshTokens(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Tokens refreshed successfully",
          accessToken: expect.any(String),
          idToken: expect.any(String),
        })
      );
      expect(cookieMock).toHaveBeenCalledWith(
        "refreshToken",
        expect.any(String),
        expect.any(Object)
      );
    });

    it("should refresh tokens with valid refresh token from body", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        username: "testuser",
      };

      const refreshToken = await jwtUtils.generateRefreshToken(mockUser.id);

      mockRequest.body = { refreshToken };
      mockRequest.cookies = {};

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      await refreshTokens(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Tokens refreshed successfully",
        })
      );
    });

    it("should reject request without refresh token", async () => {
      mockRequest.cookies = {};
      mockRequest.body = {};

      await refreshTokens(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Refresh token required",
      });
    });

    it("should reject invalid refresh token", async () => {
      mockRequest.cookies = { refreshToken: "invalid.token.here" };

      await refreshTokens(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Invalid or expired refresh token",
      });
    });

    it("should reject refresh token for non-existent user", async () => {
      const refreshToken = await jwtUtils.generateRefreshToken(
        "non-existent-user"
      );

      mockRequest.cookies = { refreshToken };

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // No user found
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      await refreshTokens(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "User not found",
      });
    });
  });

  describe("revokeTokens", () => {
    it("should revoke tokens for authenticated user", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      const authenticatedRequest = mockRequest as AuthenticatedRequest;
      authenticatedRequest.user = {
        id: mockUser.id,
        type: "access",
        activated: true,
      };

      await revokeTokens(
        authenticatedRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        message:
          "All tokens have been revoked successfully. Please login again.",
      });
      expect(clearCookieMock).toHaveBeenCalledWith(
        "refreshToken",
        expect.any(Object)
      );

      // Verify revocation was registered
      const revocation = jwtRevocationManager.getRevocation(mockUser.id);
      expect(revocation).toBeTruthy();
    });

    it("should reject unauthenticated request", async () => {
      const authenticatedRequest = mockRequest as AuthenticatedRequest;
      authenticatedRequest.user = undefined;

      await revokeTokens(
        authenticatedRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Not authenticated",
      });
    });
  });

  describe("requestPasswordReset", () => {
    it("should send reset email for valid user", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashedpassword",
      };

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      vi.mocked(db.update).mockImplementation(updateMock as any);

      vi.mocked(emailUtils.sendPasswordResetEmail).mockResolvedValue(undefined);

      mockRequest.body = { email: mockUser.email };

      await requestPasswordReset(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
      expect(emailUtils.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it("should not reveal if email does not exist", async () => {
      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // No user found
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      mockRequest.body = { email: "nonexistent@example.com" };

      await requestPasswordReset(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
      expect(emailUtils.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("should not reveal if user is OAuth-only", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: null, // OAuth-only user
      };

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      mockRequest.body = { email: mockUser.email };

      await requestPasswordReset(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
      expect(emailUtils.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("should handle email sending failure", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashedpassword",
      };

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      vi.mocked(db.update).mockImplementation(updateMock as any);

      vi.mocked(emailUtils.sendPasswordResetEmail).mockRejectedValue(
        new Error("Email service error")
      );

      mockRequest.body = { email: mockUser.email };

      await requestPasswordReset(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Failed to send password reset email",
      });
    });
  });

  describe("resetPassword", () => {
    it("should reset password with valid token", async () => {
      const plainToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(plainToken)
        .digest("hex");

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        passwordResetUsed: false,
      };

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      vi.mocked(db.update).mockImplementation(updateMock as any);

      mockRequest.body = {
        token: plainToken,
        newPassword: "NewPassword123!",
      };

      await resetPassword(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message:
          "Password has been reset successfully. Please login with your new password.",
      });

      // Verify tokens were revoked
      const revocation = jwtRevocationManager.getRevocation(mockUser.id);
      expect(revocation).toBeTruthy();
    });

    it("should reject invalid token", async () => {
      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // No user found
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      mockRequest.body = {
        token: "invalidtoken",
        newPassword: "NewPassword123!",
      };

      await resetPassword(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Invalid or expired reset token",
      });
    });

    it("should reject expired token", async () => {
      const plainToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(plainToken)
        .digest("hex");

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: new Date(Date.now() - 1000), // Expired
        passwordResetUsed: false,
      };

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      mockRequest.body = {
        token: plainToken,
        newPassword: "NewPassword123!",
      };

      await resetPassword(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Invalid or expired reset token",
      });
    });

    it("should reject already used token", async () => {
      const plainToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(plainToken)
        .digest("hex");

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: new Date(Date.now() + 3600000),
        passwordResetUsed: true, // Already used
      };

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      mockRequest.body = {
        token: plainToken,
        newPassword: "NewPassword123!",
      };

      await resetPassword(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "This reset token has already been used",
      });
    });

    it("should reject short password", async () => {
      mockRequest.body = {
        token: "sometoken",
        newPassword: "short",
      };

      await resetPassword(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Password does not meet security requirements",
        details: expect.arrayContaining([
          "Password must be at least 8 characters long",
        ]),
      });
    });
  });
});
