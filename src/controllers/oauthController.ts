import type { Request, Response } from "express";
import { generateAuthTokens } from "../utils/jwt.ts";
import { verifyGoogleToken, verifyFacebookToken } from "../utils/oauth.ts";
import { db } from "../db/connection.ts";
import { users } from "../db/schema.ts";
import { eq, or } from "drizzle-orm";
import { oauthTokenTracker } from "../utils/oauthTokenTracking.ts";
import { env } from "../../env.ts";

/**
 * Handle Google OAuth sign-in
 * Implements email linking: if user exists with same email, link Google to existing account
 */
export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Google token is required" });
    }

    // Check if token has already been used (replay attack protection)
    if (oauthTokenTracker.isTokenUsed(token)) {
      return res.status(400).json({ error: "Token has already been used" });
    }

    // Verify Google token and get user profile
    const profile = await verifyGoogleToken(token);

    // Mark token as used to prevent replay attacks
    oauthTokenTracker.markTokenAsUsed(token);

    // Check if user already exists with this email or Google ID
    const [existingUser] = await db
      .select()
      .from(users)
      .where(
        or(eq(users.email, profile.email), eq(users.googleId, profile.id))
      );

    if (existingUser) {
      // User exists - link Google account if not already linked
      const linkedProviders = Array.isArray(existingUser.linkedProviders)
        ? existingUser.linkedProviders
        : [];

      const needsUpdate =
        existingUser.googleId !== profile.id ||
        !linkedProviders.includes("google") ||
        existingUser.avatar !== profile.avatar; // Also update if avatar changed

      if (needsUpdate) {
        // Update user to link Google account
        const updatedLinkedProviders = linkedProviders.includes("google")
          ? linkedProviders
          : [...linkedProviders, "google"];

        await db
          .update(users)
          .set({
            googleId: profile.id,
            linkedProviders: updatedLinkedProviders,
            // Always update avatar from Google (Google photos are usually up to date)
            avatar: profile.avatar || existingUser.avatar,
            name: existingUser.name || profile.name,
            firstName: existingUser.firstName || profile.firstName,
            lastName: existingUser.lastName || profile.lastName,
            verified:
              existingUser.verified ||
              (profile.verified !== undefined ? profile.verified : false),
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
      }

      // Generate authentication tokens
      const tokens = await generateAuthTokens({
        id: existingUser.id,
        email: existingUser.email,
        username: existingUser.username,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
      });

      // Set refresh token as httpOnly cookie for security
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return res.json({
        message: "Login successful",
        user: {
          id: existingUser.id,
          email: existingUser.email,
          username: existingUser.username,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          avatar: existingUser.avatar || profile.avatar,
          name: existingUser.name,
        },
        accessToken: tokens.accessToken,
        idToken: tokens.idToken,
      });
    }

    // User doesn't exist - create new user with Google OAuth
    // Generate username from email
    const baseUsername =
      profile.email.split("@")[0] +
      "_" +
      Math.random().toString(36).substring(2, 7);

    const [newUser] = await db
      .insert(users)
      .values({
        email: profile.email,
        username: baseUsername,
        googleId: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        name: profile.name,
        avatar: profile.avatar,
        authProvider: "google",
        linkedProviders: ["google"],
        verified: profile.verified || false,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar,
        name: users.name,
        createdAt: users.createdAt,
      });

    // Generate authentication tokens
    const tokens = await generateAuthTokens({
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
    });

    // Set refresh token as httpOnly cookie for security
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json({
      message: "User created successfully",
      user: newUser,
      accessToken: tokens.accessToken,
      idToken: tokens.idToken,
    });
  } catch (error) {
    console.error("Google OAuth error:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to authenticate with Google",
    });
  }
};

/**
 * Handle Facebook OAuth sign-in
 * Implements email linking: if user exists with same email, link Facebook to existing account
 */
export const facebookAuth = async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res
        .status(400)
        .json({ error: "Facebook access token is required" });
    }

    // Check if token has already been used (replay attack protection)
    if (oauthTokenTracker.isTokenUsed(accessToken)) {
      return res.status(400).json({ error: "Token has already been used" });
    }

    // Verify Facebook token and get user profile
    const profile = await verifyFacebookToken(accessToken);

    // Mark token as used to prevent replay attacks
    oauthTokenTracker.markTokenAsUsed(accessToken);

    // Check if user already exists with this email or Facebook ID
    const [existingUser] = await db
      .select()
      .from(users)
      .where(
        or(eq(users.email, profile.email), eq(users.facebookId, profile.id))
      );

    if (existingUser) {
      // User exists - link Facebook account if not already linked
      const linkedProviders = Array.isArray(existingUser.linkedProviders)
        ? existingUser.linkedProviders
        : [];

      const needsUpdate =
        existingUser.facebookId !== profile.id ||
        !linkedProviders.includes("facebook") ||
        existingUser.avatar !== profile.avatar; // Also update if avatar changed

      if (needsUpdate) {
        // Update user to link Facebook account
        const updatedLinkedProviders = linkedProviders.includes("facebook")
          ? linkedProviders
          : [...linkedProviders, "facebook"];

        await db
          .update(users)
          .set({
            facebookId: profile.id,
            linkedProviders: updatedLinkedProviders,
            // Always update avatar from Facebook (Facebook photos are usually up to date)
            avatar: profile.avatar || existingUser.avatar,
            name: existingUser.name || profile.name,
            firstName: existingUser.firstName || profile.firstName,
            lastName: existingUser.lastName || profile.lastName,
            verified:
              existingUser.verified ||
              (profile.verified !== undefined ? profile.verified : false),
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
      }

      // Generate authentication tokens
      const tokens = await generateAuthTokens({
        id: existingUser.id,
        email: existingUser.email,
        username: existingUser.username,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
      });

      // Set refresh token as httpOnly cookie for security
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return res.json({
        message: "Login successful",
        user: {
          id: existingUser.id,
          email: existingUser.email,
          username: existingUser.username,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          avatar: existingUser.avatar || profile.avatar,
          name: existingUser.name,
        },
        accessToken: tokens.accessToken,
        idToken: tokens.idToken,
      });
    }

    // User doesn't exist - create new user with Facebook OAuth
    // Generate username from email
    const baseUsername =
      profile.email.split("@")[0] +
      "_" +
      Math.random().toString(36).substring(2, 7);

    const [newUser] = await db
      .insert(users)
      .values({
        email: profile.email,
        username: baseUsername,
        facebookId: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        name: profile.name,
        avatar: profile.avatar,
        authProvider: "facebook",
        linkedProviders: ["facebook"],
        verified: profile.verified || false,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar,
        name: users.name,
        createdAt: users.createdAt,
      });

    // Generate authentication tokens
    const tokens = await generateAuthTokens({
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
    });

    // Set refresh token as httpOnly cookie for security
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json({
      message: "User created successfully",
      user: newUser,
      accessToken: tokens.accessToken,
      idToken: tokens.idToken,
    });
  } catch (error) {
    console.error("Facebook OAuth error:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to authenticate with Facebook",
    });
  }
};
