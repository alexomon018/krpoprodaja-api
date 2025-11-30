import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  parseTokenExpiryToMs,
  generateAccessToken,
  generateIdToken,
  generateRefreshToken,
  generateAuthTokens,
  verifyAccessToken,
  verifyIdToken,
  verifyRefreshToken,
  type TokenUserData,
} from "../../src/utils/jwt.ts";
import { decodeJwt } from "jose";

describe("JWT Utilities", () => {
  describe("parseTokenExpiryToMs", () => {
    it("should parse seconds correctly", () => {
      expect(parseTokenExpiryToMs("30s")).toBe(30 * 1000);
      expect(parseTokenExpiryToMs("1s")).toBe(1000);
    });

    it("should parse minutes correctly", () => {
      expect(parseTokenExpiryToMs("30m")).toBe(30 * 60 * 1000);
      expect(parseTokenExpiryToMs("1m")).toBe(60 * 1000);
    });

    it("should parse hours correctly", () => {
      expect(parseTokenExpiryToMs("1h")).toBe(60 * 60 * 1000);
      expect(parseTokenExpiryToMs("24h")).toBe(24 * 60 * 60 * 1000);
    });

    it("should parse days correctly", () => {
      expect(parseTokenExpiryToMs("1d")).toBe(24 * 60 * 60 * 1000);
      expect(parseTokenExpiryToMs("7d")).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("should throw error for invalid format", () => {
      expect(() => parseTokenExpiryToMs("invalid")).toThrow(
        "Invalid token expiry format"
      );
      expect(() => parseTokenExpiryToMs("30")).toThrow(
        "Invalid token expiry format"
      );
      expect(() => parseTokenExpiryToMs("30x")).toThrow(
        "Invalid token expiry format"
      );
    });
  });

  describe("generateAccessToken", () => {
    it("should generate a valid access token", async () => {
      const userId = "test-user-123";
      const token = await generateAccessToken(userId);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      // Decode and verify token structure
      const decoded = decodeJwt(token);
      expect(decoded.id).toBe(userId);
      expect(decoded.type).toBe("access");
      expect(decoded.aud).toBe("api");
      expect(decoded.iss).toBe("krpoprodaja-api");
      expect(decoded.iat).toBeTruthy();
      expect(decoded.exp).toBeTruthy();
    });

    it("should generate tokens with different values for different users", async () => {
      const token1 = await generateAccessToken("user-1");
      const token2 = await generateAccessToken("user-2");

      expect(token1).not.toBe(token2);

      const decoded1 = decodeJwt(token1);
      const decoded2 = decodeJwt(token2);

      expect(decoded1.id).toBe("user-1");
      expect(decoded2.id).toBe("user-2");
    });
  });

  describe("generateIdToken", () => {
    const mockUser: TokenUserData = {
      id: "test-user-123",
      email: "test@example.com",

      firstName: "Test",
      lastName: "User",
    };

    it("should generate a valid ID token with full user data", async () => {
      const token = await generateIdToken(mockUser);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      // Decode and verify token structure
      const decoded = decodeJwt(token);
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.firstName).toBe(mockUser.firstName);
      expect(decoded.lastName).toBe(mockUser.lastName);
      expect(decoded.type).toBe("id");
      expect(decoded.aud).toBe("client");
      expect(decoded.iss).toBe("krpoprodaja-api");
    });

    it("should handle optional firstName and lastName", async () => {
      const userWithoutNames = {
        id: "test-user-456",
        email: "test2@example.com",
        firstName: null,
        lastName: null,
      };

      const token = await generateIdToken(userWithoutNames);
      const decoded = decodeJwt(token);

      expect(decoded.firstName).toBeNull();
      expect(decoded.lastName).toBeNull();
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate a valid refresh token", async () => {
      const userId = "test-user-123";
      const token = await generateRefreshToken(userId);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      // Decode and verify token structure
      const decoded = decodeJwt(token);
      expect(decoded.id).toBe(userId);
      expect(decoded.type).toBe("refresh");
      expect(decoded.aud).toBe("refresh");
      expect(decoded.iss).toBe("krpoprodaja-api");
    });
  });

  describe("generateAuthTokens", () => {
    const mockUser: TokenUserData = {
      id: "test-user-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    };

    it("should generate all three token types", async () => {
      const tokens = await generateAuthTokens(mockUser);

      expect(tokens).toBeTruthy();
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.idToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
    });

    it("should generate valid tokens of correct types", async () => {
      const tokens = await generateAuthTokens(mockUser);

      const accessDecoded = decodeJwt(tokens.accessToken);
      const idDecoded = decodeJwt(tokens.idToken);
      const refreshDecoded = decodeJwt(tokens.refreshToken);

      expect(accessDecoded.type).toBe("access");
      expect(idDecoded.type).toBe("id");
      expect(refreshDecoded.type).toBe("refresh");
    });

    it("should include user ID in all tokens", async () => {
      const tokens = await generateAuthTokens(mockUser);

      const accessDecoded = decodeJwt(tokens.accessToken);
      const idDecoded = decodeJwt(tokens.idToken);
      const refreshDecoded = decodeJwt(tokens.refreshToken);

      expect(accessDecoded.id).toBe(mockUser.id);
      expect(idDecoded.id).toBe(mockUser.id);
      expect(refreshDecoded.id).toBe(mockUser.id);
    });
  });

  describe("verifyAccessToken", () => {
    it("should verify a valid access token", async () => {
      const userId = "test-user-123";
      const token = await generateAccessToken(userId);

      const payload = await verifyAccessToken(token);

      expect(payload).toBeTruthy();
      expect(payload.id).toBe(userId);
      expect(payload.type).toBe("access");
    });

    it("should reject an ID token when expecting access token", async () => {
      const mockUser: TokenUserData = {
        id: "test-user-123",
        email: "test@example.com",
      };
      const idToken = await generateIdToken(mockUser);

      // JWT library checks audience before our type check, so we get aud error
      await expect(verifyAccessToken(idToken)).rejects.toThrow();
    });

    it("should reject a refresh token when expecting access token", async () => {
      const refreshToken = await generateRefreshToken("test-user-123");

      // JWT library fails verification due to different audience/secret
      await expect(verifyAccessToken(refreshToken)).rejects.toThrow();
    });

    it("should reject an invalid token", async () => {
      await expect(verifyAccessToken("invalid.token.here")).rejects.toThrow();
    });
  });

  describe("verifyIdToken", () => {
    const mockUser: TokenUserData = {
      id: "test-user-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    };

    it("should verify a valid ID token", async () => {
      const token = await generateIdToken(mockUser);

      const payload = await verifyIdToken(token);

      expect(payload).toBeTruthy();
      expect(payload.id).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.firstName).toBe(mockUser.firstName);
      expect(payload.lastName).toBe(mockUser.lastName);
      expect(payload.type).toBe("id");
    });

    it("should reject an access token when expecting ID token", async () => {
      const accessToken = await generateAccessToken("test-user-123");

      // JWT library checks audience before our type check
      await expect(verifyIdToken(accessToken)).rejects.toThrow();
    });

    it("should reject an invalid token", async () => {
      await expect(verifyIdToken("invalid.token.here")).rejects.toThrow();
    });
  });

  describe("verifyRefreshToken", () => {
    it("should verify a valid refresh token", async () => {
      const userId = "test-user-123";
      const token = await generateRefreshToken(userId);

      const payload = await verifyRefreshToken(token);

      expect(payload).toBeTruthy();
      expect(payload.id).toBe(userId);
      expect(payload.type).toBe("refresh");
    });

    it("should reject an access token when expecting refresh token", async () => {
      const accessToken = await generateAccessToken("test-user-123");

      // JWT library fails verification due to different audience/secret
      await expect(verifyRefreshToken(accessToken)).rejects.toThrow();
    });

    it("should reject an invalid token", async () => {
      await expect(verifyRefreshToken("invalid.token.here")).rejects.toThrow();
    });
  });

  describe("Token Expiration", () => {
    it("should set expiration time on tokens", async () => {
      const token = await generateAccessToken("test-user-123");
      const decoded = decodeJwt(token);

      expect(decoded.exp).toBeTruthy();
      expect(decoded.iat).toBeTruthy();
      expect(decoded.exp).toBeGreaterThan(decoded.iat!);
    });
  });
});
