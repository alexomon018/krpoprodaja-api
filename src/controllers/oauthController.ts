import type { Request, Response } from "express";
import { generateAuthTokens, parseTokenExpiryToMs } from "../utils/jwt.ts";
import { verifyGoogleToken, verifyFacebookToken } from "../utils/oauth.ts";
import { db } from "../db/connection.ts";
import { users } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { oauthTokenTracker } from "../utils/oauthTokenTracking.ts";
import { env } from "../../env.ts";

/**
 * Handle Google OAuth sign-in
 * Implements secure email linking: only links to verified accounts to prevent account takeover
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

    // First, check if user already exists with this Google ID
    const [existingUserByGoogleId] = await db
      .select()
      .from(users)
      .where(eq(users.googleId, profile.id));

    if (existingUserByGoogleId) {
      // User with this Google ID exists - update and log them in
      const linkedProviders = Array.isArray(existingUserByGoogleId.linkedProviders)
        ? existingUserByGoogleId.linkedProviders
        : [];

      const updatedLinkedProviders = linkedProviders.includes("google")
        ? linkedProviders
        : [...linkedProviders, "google"];

      await db
        .update(users)
        .set({
          linkedProviders: updatedLinkedProviders,
          avatar: profile.avatar || existingUserByGoogleId.avatar,
          name: existingUserByGoogleId.name || profile.name,
          firstName: existingUserByGoogleId.firstName || profile.firstName,
          lastName: existingUserByGoogleId.lastName || profile.lastName,
          verified: true, // Google accounts are verified
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUserByGoogleId.id));

      // Generate authentication tokens
      const tokens = await generateAuthTokens({
        id: existingUserByGoogleId.id,
        email: existingUserByGoogleId.email,
        firstName: existingUserByGoogleId.firstName,
        lastName: existingUserByGoogleId.lastName,
        activated: true, // OAuth users are activated
      });

      // Set refresh token as httpOnly cookie for security
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: parseTokenExpiryToMs(env.REFRESH_TOKEN_EXPIRES_IN),
      });

      return res.json({
        message: "Login successful",
        user: {
          id: existingUserByGoogleId.id,
          email: existingUserByGoogleId.email,
          firstName: existingUserByGoogleId.firstName,
          lastName: existingUserByGoogleId.lastName,
          avatar: profile.avatar || existingUserByGoogleId.avatar,
          name: existingUserByGoogleId.name,
        },
        accessToken: tokens.accessToken,
        idToken: tokens.idToken,
      });
    }

    // Check if user exists with this email (but different OAuth provider or email auth)
    const [existingUserByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, profile.email));

    if (existingUserByEmail) {
      // Security: Only link OAuth if the account is already verified
      // This prevents account takeover by someone who registered with your email first
      if (!existingUserByEmail.verified && existingUserByEmail.authProvider === "email") {
        // Account exists but is not verified - potential account takeover attempt
        return res.status(403).json({
          error: "An unverified account with this email already exists. Please verify that account first or contact support.",
        });
      }

      // User exists with verified account - safe to link Google account
      const linkedProviders = Array.isArray(existingUserByEmail.linkedProviders)
        ? existingUserByEmail.linkedProviders
        : [];

      const updatedLinkedProviders = linkedProviders.includes("google")
        ? linkedProviders
        : [...linkedProviders, "google"];

      await db
        .update(users)
        .set({
          googleId: profile.id,
          linkedProviders: updatedLinkedProviders,
          avatar: profile.avatar || existingUserByEmail.avatar,
          name: existingUserByEmail.name || profile.name,
          firstName: existingUserByEmail.firstName || profile.firstName,
          lastName: existingUserByEmail.lastName || profile.lastName,
          verified: true, // Google accounts are verified
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUserByEmail.id));

      // Generate authentication tokens
      const tokens = await generateAuthTokens({
        id: existingUserByEmail.id,
        email: existingUserByEmail.email,
        firstName: existingUserByEmail.firstName,
        lastName: existingUserByEmail.lastName,
        activated: true, // OAuth users are activated
      });

      // Set refresh token as httpOnly cookie for security
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: parseTokenExpiryToMs(env.REFRESH_TOKEN_EXPIRES_IN),
      });

      return res.json({
        message: "Login successful",
        user: {
          id: existingUserByEmail.id,
          email: existingUserByEmail.email,
          firstName: existingUserByEmail.firstName,
          lastName: existingUserByEmail.lastName,
          avatar: profile.avatar || existingUserByEmail.avatar,
          name: existingUserByEmail.name,
        },
        accessToken: tokens.accessToken,
        idToken: tokens.idToken,
      });
    }

    // User doesn't exist - create new user with Google OAuth
    const [newUser] = await db
      .insert(users)
      .values({
        email: profile.email,
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
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      activated: true, // OAuth users are activated
    });

    // Set refresh token as httpOnly cookie for security
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: parseTokenExpiryToMs(env.REFRESH_TOKEN_EXPIRES_IN),
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
 * Implements secure email linking: only links to verified accounts to prevent account takeover
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

    // First, check if user already exists with this Facebook ID
    const [existingUserByFacebookId] = await db
      .select()
      .from(users)
      .where(eq(users.facebookId, profile.id));

    if (existingUserByFacebookId) {
      // User with this Facebook ID exists - update and log them in
      const linkedProviders = Array.isArray(existingUserByFacebookId.linkedProviders)
        ? existingUserByFacebookId.linkedProviders
        : [];

      const updatedLinkedProviders = linkedProviders.includes("facebook")
        ? linkedProviders
        : [...linkedProviders, "facebook"];

      await db
        .update(users)
        .set({
          linkedProviders: updatedLinkedProviders,
          avatar: profile.avatar || existingUserByFacebookId.avatar,
          name: existingUserByFacebookId.name || profile.name,
          firstName: existingUserByFacebookId.firstName || profile.firstName,
          lastName: existingUserByFacebookId.lastName || profile.lastName,
          verified: true, // Facebook accounts are verified
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUserByFacebookId.id));

      // Generate authentication tokens
      const tokens = await generateAuthTokens({
        id: existingUserByFacebookId.id,
        email: existingUserByFacebookId.email,
        firstName: existingUserByFacebookId.firstName,
        lastName: existingUserByFacebookId.lastName,
        activated: true, // OAuth users are activated
      });

      // Set refresh token as httpOnly cookie for security
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: parseTokenExpiryToMs(env.REFRESH_TOKEN_EXPIRES_IN),
      });

      return res.json({
        message: "Login successful",
        user: {
          id: existingUserByFacebookId.id,
          email: existingUserByFacebookId.email,
          firstName: existingUserByFacebookId.firstName,
          lastName: existingUserByFacebookId.lastName,
          avatar: profile.avatar || existingUserByFacebookId.avatar,
          name: existingUserByFacebookId.name,
        },
        accessToken: tokens.accessToken,
        idToken: tokens.idToken,
      });
    }

    // Check if user exists with this email (but different OAuth provider or email auth)
    const [existingUserByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, profile.email));

    if (existingUserByEmail) {
      // Security: Only link OAuth if the account is already verified
      // This prevents account takeover by someone who registered with your email first
      if (!existingUserByEmail.verified && existingUserByEmail.authProvider === "email") {
        // Account exists but is not verified - potential account takeover attempt
        return res.status(403).json({
          error: "An unverified account with this email already exists. Please verify that account first or contact support.",
        });
      }

      // User exists with verified account - safe to link Facebook account
      const linkedProviders = Array.isArray(existingUserByEmail.linkedProviders)
        ? existingUserByEmail.linkedProviders
        : [];

      const updatedLinkedProviders = linkedProviders.includes("facebook")
        ? linkedProviders
        : [...linkedProviders, "facebook"];

      await db
        .update(users)
        .set({
          facebookId: profile.id,
          linkedProviders: updatedLinkedProviders,
          avatar: profile.avatar || existingUserByEmail.avatar,
          name: existingUserByEmail.name || profile.name,
          firstName: existingUserByEmail.firstName || profile.firstName,
          lastName: existingUserByEmail.lastName || profile.lastName,
          verified: true, // Facebook accounts are verified
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUserByEmail.id));

      // Generate authentication tokens
      const tokens = await generateAuthTokens({
        id: existingUserByEmail.id,
        email: existingUserByEmail.email,
        firstName: existingUserByEmail.firstName,
        lastName: existingUserByEmail.lastName,
        activated: true, // OAuth users are activated
      });

      // Set refresh token as httpOnly cookie for security
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: parseTokenExpiryToMs(env.REFRESH_TOKEN_EXPIRES_IN),
      });

      return res.json({
        message: "Login successful",
        user: {
          id: existingUserByEmail.id,
          email: existingUserByEmail.email,
          firstName: existingUserByEmail.firstName,
          lastName: existingUserByEmail.lastName,
          avatar: profile.avatar || existingUserByEmail.avatar,
          name: existingUserByEmail.name,
        },
        accessToken: tokens.accessToken,
        idToken: tokens.idToken,
      });
    }

    // User doesn't exist - create new user with Facebook OAuth
    const [newUser] = await db
      .insert(users)
      .values({
        email: profile.email,
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
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      activated: true, // OAuth users are activated
    });

    // Set refresh token as httpOnly cookie for security
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: parseTokenExpiryToMs(env.REFRESH_TOKEN_EXPIRES_IN),
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
