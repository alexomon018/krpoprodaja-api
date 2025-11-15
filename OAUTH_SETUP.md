# OAuth Social Sign-In Setup Guide

This guide explains how to set up and use Google and Facebook OAuth authentication with email linking in the krpoprodaja API.

## Features

✅ **Google OAuth Sign-In**
✅ **Facebook OAuth Sign-In**
✅ **Email Linking** - Automatically links OAuth accounts to existing users with the same email
✅ **Multi-Provider Support** - Users can sign in with multiple providers (email/password, Google, Facebook)
✅ **Seamless Token Flow** - Returns same token structure (access, ID, refresh tokens) as email/password login

## Table of Contents

1. [How Email Linking Works](#how-email-linking-works)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [API Endpoints](#api-endpoints)
5. [Frontend Integration](#frontend-integration)
6. [Testing](#testing)

---

## How Email Linking Works

The OAuth implementation automatically links accounts by email address:

### Scenario 1: User signs up with email/password first
1. User creates account: `user@example.com` (authProvider: 'email', linkedProviders: ['email'])
2. Later, user tries Google sign-in with same email
3. **Result**: OAuth account is linked to existing user
   - `googleId` is added
   - `linkedProviders` becomes `['email', 'google']`
   - User gets tokens for the **same account**

### Scenario 2: User signs up with Google first
1. User signs in with Google: `user@example.com` (authProvider: 'google', linkedProviders: ['google'])
2. Later, user tries Facebook sign-in with same email
3. **Result**: Facebook is linked to existing user
   - `facebookId` is added
   - `linkedProviders` becomes `['google', 'facebook']`
   - User gets tokens for the **same account**

### User Model Changes

New fields added to the `users` table:

```typescript
{
  googleId?: string;           // Google OAuth ID (from Google's 'sub' claim)
  facebookId?: string;         // Facebook OAuth ID
  authProvider: 'email' | 'google' | 'facebook';  // Primary sign-up method
  linkedProviders: string[];   // Array of all linked providers
  password?: string;           // Now optional (OAuth users may not have password)
}
```

---

## Environment Setup

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure OAuth consent screen if prompted
6. Select **Web application** as application type
7. Add authorized redirect URIs (e.g., `http://localhost:3000`, your frontend URL)
8. Copy the **Client ID**

### 2. Get Facebook OAuth Credentials

1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Click **Create App**
3. Select **Consumer** as app type
4. Fill in app details and create app
5. Navigate to **Settings** > **Basic**
6. Copy the **App ID** and **App Secret**
7. In **Facebook Login** settings:
   - Add Valid OAuth Redirect URIs (your frontend URL)
   - Enable **Client OAuth Login**

### 3. Update Environment Variables

Add to your `.env` file:

```bash
# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# OAuth - Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

**Note**: These are optional. OAuth endpoints will fail gracefully if not configured.

---

## Database Migration

Run the migration to add OAuth fields to the users table:

```bash
# Option 1: Run SQL migration directly
psql -U your_user -d krpoprodaja < migrations/add_oauth_fields.sql

# Option 2: Use Drizzle Kit (if you have .env configured)
npm run db:push
```

The migration:
- Adds `google_id`, `facebook_id`, `auth_provider`, `linked_providers` columns
- Makes `password` column nullable
- Adds indexes for OAuth ID lookups
- Updates existing users to set `auth_provider='email'` and `linked_providers=['email']`

---

## API Endpoints

### POST `/api/auth/google`

Authenticate with Google OAuth token.

**Request Body:**
```json
{
  "token": "google-id-token-from-frontend"
}
```

**Response (existing user):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://lh3.googleusercontent.com/...",
    "name": "John Doe"
  },
  "accessToken": "eyJhbGci...",
  "idToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

**Response (new user):**
```json
{
  "message": "User created successfully",
  "user": { ... },
  "accessToken": "...",
  "idToken": "...",
  "refreshToken": "..."
}
```

**Error Responses:**
- `400` - Token missing: `{ "error": "Google token is required" }`
- `500` - Invalid token: `{ "error": "Google token verification failed: ..." }`

---

### POST `/api/auth/facebook`

Authenticate with Facebook access token.

**Request Body:**
```json
{
  "accessToken": "facebook-access-token-from-frontend"
}
```

**Response:**
Same structure as Google OAuth endpoint.

**Error Responses:**
- `400` - Token missing: `{ "error": "Facebook access token is required" }`
- `500` - Invalid token: `{ "error": "Facebook token verification failed: ..." }`

---

## Frontend Integration

### Google Sign-In (React Example)

```typescript
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

function LoginPage() {
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await fetch('http://localhost:8080/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential })
      });

      const data = await response.json();

      if (response.ok) {
        // Save tokens
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        console.log('Logged in as:', data.user);
        // Redirect to dashboard
      } else {
        console.error('Login failed:', data.error);
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };

  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => console.log('Login Failed')}
      />
    </GoogleOAuthProvider>
  );
}
```

**Install dependencies:**
```bash
npm install @react-oauth/google
```

---

### Facebook Sign-In (React Example)

```typescript
import { FacebookLogin } from '@greatsumini/react-facebook-login';

function LoginPage() {
  const handleFacebookSuccess = async (response) => {
    try {
      const apiResponse = await fetch('http://localhost:8080/api/auth/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: response.accessToken })
      });

      const data = await apiResponse.json();

      if (apiResponse.ok) {
        // Save tokens
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        console.log('Logged in as:', data.user);
        // Redirect to dashboard
      } else {
        console.error('Login failed:', data.error);
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };

  return (
    <FacebookLogin
      appId="YOUR_FACEBOOK_APP_ID"
      onSuccess={handleFacebookSuccess}
      onFail={(error) => console.log('Login Failed!', error)}
      fields="email,first_name,last_name,name,picture"
      scope="email,public_profile"
    />
  );
}
```

**Install dependencies:**
```bash
npm install @greatsumini/react-facebook-login
```

---

## Testing

### Manual Testing with cURL

#### Test Google OAuth:
```bash
# First, get a Google ID token from Google OAuth Playground or your frontend
# Then test the endpoint:

curl -X POST http://localhost:8080/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_GOOGLE_ID_TOKEN"}'
```

#### Test Facebook OAuth:
```bash
# Get Facebook access token from Graph API Explorer or your frontend
# Then test the endpoint:

curl -X POST http://localhost:8080/api/auth/facebook \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "YOUR_FACEBOOK_ACCESS_TOKEN"}'
```

### Testing Email Linking

1. **Create user with email/password:**
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

2. **Sign in with Google using same email:**
```bash
curl -X POST http://localhost:8080/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"token": "GOOGLE_TOKEN_FOR_test@example.com"}'
```

3. **Verify it's the same user:**
   - Check that the user ID in the response matches the first registration
   - User should have `linkedProviders: ['email', 'google']`

---

## Security Notes

### Token Verification
- **Google**: Uses `google-auth-library` to verify ID tokens against Google's public keys
- **Facebook**: Validates access tokens via Facebook's Graph API debug endpoint
- Both verify that tokens are:
  - Not expired
  - Issued for your app (client ID / app ID match)
  - Have valid signatures

### Email Verification
- Google provides `email_verified` claim in ID tokens
- Facebook emails are automatically marked as verified
- OAuth users have `verified` field set based on provider verification

### Password Security
- OAuth-only users don't have passwords
- If an OAuth user tries email/password login, they get a helpful error:
  - `"This account uses social sign-in. Please login with Google or Facebook."`

---

## Troubleshooting

### Error: "Google token verification failed"
- **Cause**: Invalid token or expired token
- **Solution**: Ensure frontend is sending the `credential` from Google's response, not the entire response object

### Error: "Facebook token verification failed"
- **Cause**: Invalid access token or app ID mismatch
- **Solution**: Verify `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` are correct

### Error: "This account uses social sign-in"
- **Cause**: User trying email/password login for OAuth-only account
- **Solution**: User should use the original OAuth provider they signed up with

### Users created with duplicate accounts
- **Cause**: Email linking should prevent this, but check if emails match exactly (case-sensitive)
- **Solution**: Emails are stored in lowercase to ensure matching works

---

## Additional Features to Consider

### Future Enhancements:
- [ ] Allow users to set a password for OAuth-only accounts
- [ ] Unlink OAuth providers
- [ ] Show linked providers in user profile
- [ ] Support for additional providers (Apple, GitHub, etc.)
- [ ] Email notifications when new provider is linked

---

## File Structure

```
src/
├── controllers/
│   ├── authController.ts        # Email/password auth (updated for OAuth users)
│   └── oauthController.ts       # NEW: Google and Facebook OAuth handlers
├── routes/
│   └── authRoutes.ts           # Added Google/Facebook routes
├── utils/
│   ├── jwt.ts                  # Token generation (unchanged)
│   └── oauth.ts                # NEW: OAuth token verification utilities
├── db/
│   └── schema.ts              # Updated users table with OAuth fields
└── middleware/
    └── auth.ts                # Token validation (unchanged)

migrations/
└── add_oauth_fields.sql       # Database migration for OAuth support

.env.example                   # Updated with OAuth credentials
env.ts                         # Updated with OAuth env validation
```

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review error logs in server console
3. Verify environment variables are set correctly
4. Ensure database migration has been applied

---

**Happy coding! 🚀**
