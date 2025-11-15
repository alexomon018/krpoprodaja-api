# JWT Token Guide

This API uses a three-token authentication system following OAuth 2.0 / OpenID Connect best practices.

## Token Types

### 1. Access Token
- **Purpose**: API authorization and resource access
- **Lifetime**: 30 minutes (short-lived)
- **Claims**: Minimal (only user ID)
- **Usage**: Include in Authorization header for all API requests
- **Format**: `Authorization: Bearer <accessToken>`

**Example:**
```http
GET /api/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. ID Token
- **Purpose**: User identity information
- **Lifetime**: 30 minutes (short-lived)
- **Claims**: Full user data (id, email, username, firstName, lastName)
- **Usage**: Client-side user display, not for API authorization
- **Format**: JWT containing user profile

**Claims:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "type": "id",
  "iat": 1234567890,
  "exp": 1234569690,
  "aud": "client",
  "iss": "krpoprodaja-api"
}
```

### 3. Refresh Token
- **Purpose**: Obtain new access and ID tokens
- **Lifetime**: 30 days (long-lived)
- **Claims**: Minimal (only user ID)
- **Usage**: Call `/api/auth/refresh` to get new tokens
- **Storage**: Store securely (httpOnly cookie or secure storage)

## Authentication Flow

### Initial Login/Registration
```javascript
// 1. Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "message": "Login successful",
  "user": { /* user object */ },
  "accessToken": "eyJ...",  // Use for API requests
  "idToken": "eyJ...",       // Use for displaying user info
  "refreshToken": "eyJ..."   // Store securely
}

// 2. Store tokens
localStorage.setItem('accessToken', accessToken)
localStorage.setItem('idToken', idToken)
localStorage.setItem('refreshToken', refreshToken) // Or httpOnly cookie
```

### Making API Requests
```javascript
// Use access token for API requests
const response = await fetch('/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})
```

### Token Refresh (when access token expires)
```javascript
// When you get 401/403, refresh tokens
POST /api/auth/refresh
{
  "refreshToken": "eyJ..."
}

// Response - new tokens
{
  "message": "Tokens refreshed successfully",
  "accessToken": "eyJ...",   // New access token
  "idToken": "eyJ...",        // New ID token
  "refreshToken": "eyJ..."    // New refresh token
}

// Update stored tokens
localStorage.setItem('accessToken', newAccessToken)
localStorage.setItem('idToken', newIdToken)
localStorage.setItem('refreshToken', newRefreshToken)
```

### Token Revocation (Logout)
```javascript
// Revoke ALL tokens for the user (logout functionality)
POST /api/auth/revoke
Authorization: Bearer <accessToken>

// Response
{
  "message": "All tokens have been revoked successfully. Please login again."
}

// Clear local storage after successful revocation
localStorage.removeItem('accessToken')
localStorage.removeItem('idToken')
localStorage.removeItem('refreshToken')

// After revocation, all existing tokens (access, ID, refresh) are invalid
// User must login again to get new tokens
```

**Important:**
- Revocation invalidates ALL tokens issued before the revocation time
- Even if tokens haven't expired, they will be rejected after revocation
- Revocation is maintained for 30 days (matching refresh token lifetime)
- Revocation requires a valid access token
- Use this for logout functionality or security purposes (e.g., password change)

## Token Validation

### Verify Access Token
```javascript
// Check if access token is valid
GET /api/auth/verify
Authorization: Bearer <accessToken>

// Response
{
  "valid": true,
  "user": {
    "id": "uuid",
    "type": "access"
  }
}
```

## Security Best Practices

### 1. Token Storage
- **Access Token**: Short-lived, can be stored in memory or localStorage
- **ID Token**: Short-lived, can be stored in memory or localStorage
- **Refresh Token**: Long-lived, store in httpOnly cookie (recommended) or secure storage

### 2. Token Usage
- ✅ **DO**: Use access tokens for API authorization
- ✅ **DO**: Refresh tokens before they expire
- ✅ **DO**: Use ID tokens for displaying user information
- ❌ **DON'T**: Send ID tokens or refresh tokens in API Authorization headers
- ❌ **DON'T**: Store refresh tokens in localStorage (use httpOnly cookies)

### 3. Error Handling
```javascript
async function apiRequest(url, options = {}) {
  const accessToken = localStorage.getItem('accessToken')

  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  // If token expired, refresh and retry
  if (response.status === 401 || response.status === 403) {
    const refreshToken = localStorage.getItem('refreshToken')
    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })

    if (refreshResponse.ok) {
      const { accessToken, idToken, refreshToken: newRefreshToken } = await refreshResponse.json()
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('idToken', idToken)
      localStorage.setItem('refreshToken', newRefreshToken)

      // Retry original request
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`
        }
      })
    } else {
      // Refresh failed, redirect to login
      window.location.href = '/login'
    }
  }

  return response
}
```

## Token Lifetimes

| Token Type | Lifetime | Renewable? |
|------------|----------|------------|
| Access Token | 30 minutes | Yes, via refresh token |
| ID Token | 30 minutes | Yes, via refresh token |
| Refresh Token | 30 days | Yes, new one issued on refresh |

## Environment Variables

Configure token lifetimes in your `.env`:

```env
# JWT Secret (minimum 32 characters)
JWT_SECRET=your-super-secret-key

# Optional: Separate secret for refresh tokens
REFRESH_TOKEN_SECRET=your-refresh-secret-key

# Token expiration times
JWT_EXPIRES_IN=7d              # Legacy, not used with new system
REFRESH_TOKEN_EXPIRES_IN=30d   # Refresh token lifetime
```

## Swagger/OpenAPI Testing

1. **Login** via `/api/auth/login` to get tokens
2. Click the **Authorize** button in Swagger UI
3. Enter your **access token** (not ID or refresh token): `Bearer <accessToken>`
4. Test protected endpoints

**Note**: Always use the access token for the Authorize button, not the ID token or refresh token.

## Migration from Old Token System

The old single-token system is deprecated but still works for backward compatibility:

### Old System (Deprecated)
```javascript
// Old: Single token
{
  "token": "eyJ..."  // 7-day lifetime
}
```

### New System (Recommended)
```javascript
// New: Three tokens
{
  "accessToken": "eyJ...",   // 30 min
  "idToken": "eyJ...",        // 30 min
  "refreshToken": "eyJ..."    // 30 days
}
```

**Migration Path:**
1. Update your client to handle all three tokens
2. Use access token for API requests
3. Implement token refresh logic
4. Stop using the old `token` field
