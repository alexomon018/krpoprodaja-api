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

// 2. Store tokens securely in httpOnly cookies (RECOMMENDED)
// Backend should set these cookies in the response:
// Set-Cookie: accessToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=1800
// Set-Cookie: idToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=1800
// Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000

// ALTERNATIVE (less secure): Store in memory or sessionStorage
// ⚠️ DO NOT use localStorage for sensitive tokens - vulnerable to XSS attacks
// Only use this approach for development/testing
sessionStorage.setItem('accessToken', accessToken)
sessionStorage.setItem('idToken', idToken)
sessionStorage.setItem('refreshToken', refreshToken)
```

### Making API Requests
```javascript
// RECOMMENDED: If using httpOnly cookies
// Tokens are automatically sent with requests
const response = await fetch('/api/users/profile', {
  credentials: 'include'  // Required to send cookies
})

// ALTERNATIVE: If using manual storage (development only)
const accessToken = sessionStorage.getItem('accessToken')
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

// If using cookies: Backend sets new cookie values automatically
// If using manual storage: Update stored tokens
sessionStorage.setItem('accessToken', newAccessToken)
sessionStorage.setItem('idToken', newIdToken)
sessionStorage.setItem('refreshToken', newRefreshToken)
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

// If using cookies: Backend should clear cookies
// Set-Cookie: accessToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0
// Set-Cookie: idToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0
// Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0

// If using manual storage: Clear tokens
sessionStorage.removeItem('accessToken')
sessionStorage.removeItem('idToken')
sessionStorage.removeItem('refreshToken')

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

### 1. Token Storage (CRITICAL)

**RECOMMENDED: httpOnly Cookies**
- **Access Token**: Store in httpOnly cookie (30 min expiry)
- **ID Token**: Store in httpOnly cookie (30 min expiry)
- **Refresh Token**: Store in httpOnly cookie (30 days expiry)
- **Benefits**: Protected from XSS attacks, automatic sending, SameSite protection

**Cookie Attributes:**
```
Set-Cookie: accessToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800
```
- `HttpOnly`: Prevents JavaScript access (XSS protection)
- `Secure`: Only sent over HTTPS
- `SameSite=Strict`: CSRF protection
- `Max-Age`: Token lifetime in seconds

**ALTERNATIVE (Development Only):**
- Store in memory (lost on page refresh) or sessionStorage
- ⚠️ **NEVER use localStorage** - highly vulnerable to XSS attacks
- Only for development/testing environments

### 2. Token Usage
- ✅ **DO**: Use httpOnly cookies for production
- ✅ **DO**: Use access tokens for API authorization
- ✅ **DO**: Refresh tokens before they expire
- ✅ **DO**: Use ID tokens for displaying user information
- ✅ **DO**: Set SameSite=Strict on cookies
- ✅ **DO**: Use HTTPS in production
- ❌ **DON'T**: Send ID tokens or refresh tokens in API Authorization headers
- ❌ **DON'T**: Store tokens in localStorage (XSS vulnerability)
- ❌ **DON'T**: Share tokens across domains

### 3. Error Handling

**With Cookies (RECOMMENDED):**
```javascript
async function apiRequest(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    credentials: 'include'  // Automatically sends cookies
  })

  // If token expired, refresh and retry
  if (response.status === 401 || response.status === 403) {
    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',  // Sends refresh token cookie
      headers: { 'Content-Type': 'application/json' }
    })

    if (refreshResponse.ok) {
      // Backend automatically sets new cookies
      // Retry original request
      response = await fetch(url, {
        ...options,
        credentials: 'include'
      })
    } else {
      // Refresh failed, redirect to login
      window.location.href = '/login'
    }
  }

  return response
}
```

**With Manual Storage (Development Only):**
```javascript
async function apiRequest(url, options = {}) {
  const accessToken = sessionStorage.getItem('accessToken')

  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  // If token expired, refresh and retry
  if (response.status === 401 || response.status === 403) {
    const refreshToken = sessionStorage.getItem('refreshToken')
    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })

    if (refreshResponse.ok) {
      const { accessToken, idToken, refreshToken: newRefreshToken } = await refreshResponse.json()
      sessionStorage.setItem('accessToken', accessToken)
      sessionStorage.setItem('idToken', idToken)
      sessionStorage.setItem('refreshToken', newRefreshToken)

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
