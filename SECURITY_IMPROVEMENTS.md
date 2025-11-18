# Security Improvements - Authentication Flow

This document outlines the security improvements implemented for the KrpoProdaja API authentication system.

## Summary of Changes

All critical and medium-priority security issues have been addressed, with the exception of Redis-based token revocation (as per user request, in-memory implementation is maintained).

---

## 🔴 CRITICAL Fixes

### 1. Refresh Token Storage via HttpOnly Cookies

**Problem**: Refresh tokens were returned in JSON responses, making them vulnerable to XSS attacks if stored in localStorage.

**Solution**:
- Refresh tokens are now stored as httpOnly cookies
- Cookies are configured with:
  - `httpOnly: true` - Prevents JavaScript access
  - `secure: true` (production only) - HTTPS only
  - `sameSite: 'strict'` - CSRF protection
  - `maxAge: 30 days` - Token lifetime

**Files Modified**:
- `src/controllers/authController.ts`
  - `register()` - Sets refresh token cookie (line 52)
  - `login()` - Sets refresh token cookie (line 148)
  - `refreshTokens()` - Reads from cookie, sets new cookie (line 193, 219)
  - `revokeTokens()` - Clears refresh token cookie (line 252)
- `src/controllers/oauthController.ts`
  - `googleAuth()` - Sets refresh token cookie (line 86, 151)
  - `facebookAuth()` - Sets refresh token cookie (line 253, 318)
- `src/routes/authRoutes.ts` - Made refreshToken optional in schema (line 35)
- `src/server.ts` - Added cookie-parser middleware (line 32)

**API Changes**:
- **Response**: No longer includes `refreshToken` in JSON response
- **Request**: `/api/auth/refresh` now reads refresh token from cookie (fallback to body for backward compatibility)

---

## 🟡 MEDIUM Priority Fixes

### 2. Rate Limiting

**Problem**: API was vulnerable to brute force attacks on authentication endpoints.

**Solution**: Implemented rate limiting with different policies per endpoint:

| Endpoint | Window | Max Requests | Purpose |
|----------|--------|--------------|---------|
| `/auth/login` | 15 min | 5 | Prevent brute force login |
| `/auth/register` | 15 min | 5 | Prevent account spam |
| `/auth/google` | 15 min | 5 | Prevent OAuth abuse |
| `/auth/facebook` | 15 min | 5 | Prevent OAuth abuse |
| `/auth/refresh` | 15 min | 10 | Rate limit token refresh |
| `/auth/request-password-reset` | 1 hour | 3 | Prevent email spam |
| `/auth/reset-password` | 15 min | 5 | Prevent token guessing |

**Files Created**:
- `src/middleware/rateLimiting.ts` - Rate limiting middleware

**Files Modified**:
- `src/routes/authRoutes.ts` - Applied rate limiters to all routes

**Package Added**: `express-rate-limit`

---

### 3. Password Reset Token Reuse Prevention

**Problem**: Password reset tokens could be reused multiple times after successful reset.

**Solution**:
- Added `passwordResetUsed` boolean flag to users table
- Token is marked as used after successful password reset
- Attempting to reuse a token returns error

**Files Modified**:
- `src/db/schema.ts` - Added `passwordResetUsed` field (line 42)
- `src/controllers/authController.ts`:
  - `requestPasswordReset()` - Resets flag to false (line 333)
  - `resetPassword()` - Checks if token was used (line 397), marks as used (line 412)

**Migration**: `migrations/add_security_fields.sql`

---

### 4. Account Lockout after Failed Login Attempts

**Problem**: No protection against brute force password guessing.

**Solution**:
- Accounts are locked for 15 minutes after 5 failed login attempts
- Failed attempt counter resets on successful login
- Locked accounts return HTTP 423 (Locked) with time remaining

**Files Modified**:
- `src/db/schema.ts` - Added `failedLoginAttempts` and `lockedUntil` (line 44-45)
- `src/controllers/authController.ts`:
  - `login()` - Check lock status (line 84), increment failures (line 108), reset on success (line 129)

**Migration**: `migrations/add_security_fields.sql`

---

### 5. OAuth Token Replay Protection

**Problem**: OAuth tokens could be reused multiple times for authentication.

**Solution**:
- Implemented in-memory token tracking
- Tokens are stored for 10 minutes after first use
- Reused tokens are rejected with error
- Automatic cleanup every 5 minutes

**Files Created**:
- `src/utils/oauthTokenTracking.ts` - Token replay protection manager

**Files Modified**:
- `src/controllers/oauthController.ts`:
  - `googleAuth()` - Check and mark token (line 23, 31)
  - `facebookAuth()` - Check and mark token (line 190, 198)

---

### 6. CSRF Protection

**Problem**: API was vulnerable to CSRF attacks when using cookie-based authentication.

**Solution**:
- Custom CSRF token implementation (csurf package is deprecated)
- Tokens stored in httpOnly cookies
- Validated on all state-changing requests (POST, PUT, PATCH, DELETE)
- GET endpoint to retrieve CSRF token for client use

**Files Created**:
- `src/middleware/csrf.ts` - CSRF token middleware

**Files Modified**:
- `src/server.ts` - Added CSRF middleware (line 33) and token endpoint (line 53)

**Packages Added**: `cookie-parser` (required for CSRF), `csurf` (deprecated but installed)

**API Endpoint**: `GET /api/csrf-token` - Returns CSRF token for client

---

## 🟢 LOW Priority (Already Implemented)

### 7. JWT Secret Validation

**Status**: ✅ Already implemented

**Implementation**: `env.ts` line 36 - JWT_SECRET must be minimum 32 characters

---

## Database Schema Changes

New fields added to `users` table:

```sql
-- Security fields
failed_login_attempts INTEGER DEFAULT 0 NOT NULL
locked_until TIMESTAMP
password_reset_used BOOLEAN DEFAULT false
```

**Migration File**: `migrations/add_security_fields.sql`

---

## Breaking Changes & Migration Guide

### For Frontend Applications

1. **Refresh Token Handling**:
   - **Before**: Store `refreshToken` from response, send in request body
   - **After**: Browser automatically handles cookies, no manual storage needed

   ```javascript
   // OLD - Don't do this anymore
   const { refreshToken } = await response.json()
   localStorage.setItem('refreshToken', refreshToken)

   // NEW - Just call the endpoint
   fetch('/api/auth/refresh', {
     credentials: 'include' // Important: include cookies
   })
   ```

2. **CORS Configuration**:
   - Must set `credentials: 'include'` in fetch requests
   - Backend already configured with `credentials: true`

3. **CSRF Token** (Optional - for enhanced security):
   ```javascript
   // Get CSRF token
   const { csrfToken } = await fetch('/api/csrf-token').then(r => r.json())

   // Include in state-changing requests
   fetch('/api/auth/login', {
     method: 'POST',
     headers: {
       'X-CSRF-Token': csrfToken
     },
     body: JSON.stringify({ email, password })
   })
   ```

### For API Testing

When testing with tools like Postman/Thunder Client:
- Enable "Send cookies automatically"
- Cookies are now required for `/auth/refresh`

---

## Security Best Practices Implemented

✅ **Defense in Depth**:
- Multiple layers of security (rate limiting, account lockout, token tracking)

✅ **Secure by Default**:
- HttpOnly cookies prevent XSS attacks
- CSRF protection prevents cross-site attacks
- Rate limiting prevents brute force

✅ **Fail Securely**:
- Account lockout on repeated failures
- Token reuse prevention
- OAuth token replay protection

✅ **Principle of Least Privilege**:
- Refresh tokens have limited scope
- Short-lived access tokens (30 minutes)

✅ **Audit Trail**:
- Failed login attempts tracked
- Token usage monitored

---

## Testing the Security Improvements

### 1. Test Account Lockout
```bash
# Attempt 5 failed logins
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpass"}'
done

# 6th attempt should return 423 Locked
```

### 2. Test Rate Limiting
```bash
# Exceed rate limit (6 requests)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test123"}'
done

# Should return 429 Too Many Requests
```

### 3. Test Password Reset Token Reuse
```bash
# 1. Request password reset
curl -X POST http://localhost:3000/api/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'

# 2. Use token to reset password
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_FROM_EMAIL","newPassword":"newpass123"}'

# 3. Try to reuse same token (should fail)
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_FROM_EMAIL","newPassword":"anotherpass"}'
```

### 4. Test OAuth Token Replay
```bash
# Use same Google/Facebook token twice (should fail on second attempt)
curl -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"token":"GOOGLE_TOKEN"}'

# Retry with same token
curl -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"token":"GOOGLE_TOKEN"}'
```

---

## Configuration

All security features work out of the box with no additional configuration required. However, you can customize:

### Rate Limits
Edit `src/middleware/rateLimiting.ts` to adjust:
- Window duration
- Max requests per window
- Custom error messages

### Account Lockout
Edit `src/controllers/authController.ts` line 106:
```typescript
const shouldLock = newFailedAttempts >= 5 // Change threshold
```

Edit line 113:
```typescript
new Date(Date.now() + 15 * 60 * 1000) // Change lock duration
```

### Token Lifetimes
Edit `env.ts` or `.env` file:
```env
REFRESH_TOKEN_EXPIRES_IN=30d  # Refresh token lifetime
PASSWORD_RESET_TOKEN_EXPIRES_IN=1h  # Reset token lifetime
```

---

## Future Improvements

Consider these for production deployments:

1. **Redis for Token Tracking** (multi-server deployments):
   - Replace in-memory `jwtRevocation.ts` with Redis
   - Replace in-memory `oauthTokenTracking.ts` with Redis

2. **Email Notifications**:
   - Notify users on account lockout
   - Notify users on password reset success
   - Notify users on OAuth account linking

3. **Audit Logging**:
   - Log all authentication events
   - Track IP addresses for suspicious activity
   - Implement login history for users

4. **Advanced CSRF**:
   - Use Double Submit Cookie pattern
   - Implement SameSite=Lax for broader compatibility

5. **Account Recovery**:
   - Implement account unlock via email
   - Add security questions
   - Two-factor authentication (2FA)

---

## Dependencies Added

```json
{
  "dependencies": {
    "express-rate-limit": "^7.x.x",
    "cookie-parser": "^1.x.x",
    "csurf": "^1.x.x"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.x.x",
    "@types/express-rate-limit": "^6.x.x"
  }
}
```

**Note**: `csurf` is deprecated. We implemented custom CSRF protection in `src/middleware/csrf.ts`.

---

## Files Modified Summary

### Created Files
- `src/middleware/rateLimiting.ts` - Rate limiting policies
- `src/middleware/csrf.ts` - CSRF protection
- `src/utils/oauthTokenTracking.ts` - OAuth token replay protection
- `migrations/add_security_fields.sql` - Database migration
- `SECURITY_IMPROVEMENTS.md` - This document

### Modified Files
- `src/db/schema.ts` - Added security fields
- `src/controllers/authController.ts` - HttpOnly cookies, account lockout, password reset
- `src/controllers/oauthController.ts` - HttpOnly cookies, token replay protection
- `src/routes/authRoutes.ts` - Rate limiters applied
- `src/server.ts` - Cookie parser and CSRF middleware
- `package.json` - New dependencies

---

## Support

For questions or issues related to these security improvements:
1. Review this documentation
2. Check implementation in source files
3. Test with provided testing commands
4. Review API responses for detailed error messages

---

**Implementation Date**: 2025-11-18
**Version**: 1.0.0
**Status**: ✅ Complete (excluding Redis migration as per user request)
