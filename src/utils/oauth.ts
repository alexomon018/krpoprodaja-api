import { OAuth2Client } from "google-auth-library";
import axios from "axios";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * OAuth user profile interface
 */
export interface OAuthProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatar?: string;
  verified?: boolean;
}

/**
 * Verify Google OAuth token and extract user profile
 * @param token - Google ID token from client
 * @returns User profile from Google
 */
export async function verifyGoogleToken(token: string): Promise<OAuthProfile> {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error("Invalid Google token payload");
    }

    if (!payload.email) {
      throw new Error("Email not found in Google token");
    }

    return {
      id: payload.sub,
      email: payload.email,
      firstName: payload.given_name,
      lastName: payload.family_name,
      name: payload.name,
      avatar: payload.picture,
      verified: payload.email_verified || false,
    };
  } catch (error) {
    throw new Error(
      `Google token verification failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Verify Facebook OAuth token and extract user profile
 * @param accessToken - Facebook access token from client
 * @returns User profile from Facebook
 */
export async function verifyFacebookToken(
  accessToken: string
): Promise<OAuthProfile> {
  try {
    // First, verify the token is valid
    const debugResponse = await axios.get(
      `https://graph.facebook.com/debug_token`,
      {
        params: {
          input_token: accessToken,
          access_token: `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`,
        },
      }
    );

    const debugData = debugResponse.data.data;

    if (!debugData.is_valid) {
      throw new Error("Invalid Facebook token");
    }

    // Verify the app ID matches
    if (debugData.app_id !== process.env.FACEBOOK_APP_ID) {
      throw new Error("Token app ID does not match");
    }

    // Get user profile data
    const profileResponse = await axios.get(`https://graph.facebook.com/me`, {
      params: {
        fields: "id,email,first_name,last_name,name,picture",
        access_token: accessToken,
      },
    });

    const profile = profileResponse.data;

    if (!profile.email) {
      throw new Error("Email not found in Facebook profile");
    }

    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      name: profile.name,
      avatar: profile.picture?.data?.url,
      verified: true, // Facebook emails are verified
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Facebook token verification failed: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
    throw new Error(
      `Facebook token verification failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
