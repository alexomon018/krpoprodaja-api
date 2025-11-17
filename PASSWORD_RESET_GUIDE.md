# Password Reset Implementation Guide

This guide explains how to use the password reset functionality in the KrpoProdaja API.

## Overview

The password reset flow allows users to securely reset their passwords via email. The implementation uses:

- **Resend** for email delivery
- **Secure tokens** with SHA-256 hashing
- **Time-limited tokens** (default: 1 hour)
- **Token revocation** after successful password reset

## Setup

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```env
# Required
RESEND_API_KEY=re_your_resend_api_key_here

# Optional (with defaults)
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=http://localhost:3000
PASSWORD_RESET_TOKEN_EXPIRES_IN=1h
```

To get your Resend API key:
1. Sign up at https://resend.com
2. Verify your domain or use their test domain for development
3. Create an API key at https://resend.com/api-keys

### 2. Database Migration

Run the migration to add password reset fields to the users table:

```bash
npm run db:migrate
```

Or manually run the SQL migration:

```bash
psql $DATABASE_URL -f migrations/add_password_reset_fields.sql
```

## API Endpoints

### Request Password Reset

**Endpoint:** `POST /api/auth/request-password-reset`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Notes:**
- Always returns success to prevent email enumeration
- Only sends email if user exists and has a password (not OAuth-only)
- Token is valid for 1 hour by default
- Token is hashed before storing in database

### Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "token": "the_reset_token_from_email",
  "newPassword": "newSecurePassword123!"
}
```

**Success Response:**
```json
{
  "message": "Password has been reset successfully. Please login with your new password."
}
```

**Error Response:**
```json
{
  "error": "Invalid or expired reset token"
}
```

**Notes:**
- Token must be valid and not expired
- Password must be at least 8 characters
- All existing tokens are revoked after successful reset
- User must login again with new password

## Frontend Integration

### Password Reset Flow

1. **Request Reset Page** (`/reset-password`)
   ```typescript
   const response = await fetch(`${API_URL}/api/auth/request-password-reset`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email })
   })
   ```

2. **User Receives Email**
   - Email contains a link: `${FRONTEND_URL}/reset-password/${token}`
   - Token is valid for 1 hour

3. **Reset Password Page** (`/reset-password/[token]`)
   ```typescript
   const response = await fetch(`${API_URL}/api/auth/reset-password`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       token,
       newPassword
     })
   })
   ```

4. **Redirect to Login**
   - After successful reset, redirect user to login page
   - User logs in with new password

## Email Template

The password reset email includes:

- Professional HTML email design
- Clear call-to-action button
- Plain text link as fallback
- Expiration notice (1 hour)
- Security message about ignoring if not requested

### Customization

To customize the email template, edit `src/utils/email.ts` in the `sendPasswordResetEmail` function.

## Security Features

### Token Security
- **Random Generation:** Uses crypto.randomBytes(32) for secure random tokens
- **Hashing:** Tokens are hashed with SHA-256 before database storage
- **Time-Limited:** Tokens expire after configured time (default: 1 hour)
- **Single-Use:** Tokens are cleared after successful password reset

### Email Enumeration Prevention
- Always returns success message regardless of email existence
- Logs internally without revealing to client

### OAuth Users
- OAuth-only users (no password) don't receive reset emails
- Returns generic success message to prevent enumeration

### Password Requirements
- Minimum 8 characters
- Can be extended with additional validation in controller

## Testing

### Development Testing

For development, you can use Resend's test mode:

```env
RESEND_API_KEY=re_test_key
EMAIL_FROM=onboarding@resend.dev
```

### Manual Testing

1. Request password reset:
   ```bash
   curl -X POST http://localhost:8080/api/auth/request-password-reset \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

2. Check email or logs for reset token

3. Reset password:
   ```bash
   curl -X POST http://localhost:8080/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token":"TOKEN_FROM_EMAIL","newPassword":"newPassword123"}'
   ```

## Troubleshooting

### Email Not Sending

1. **Check Resend API Key**
   ```bash
   echo $RESEND_API_KEY
   ```

2. **Check Domain Verification**
   - Verify your domain in Resend dashboard
   - Or use `onboarding@resend.dev` for testing

3. **Check Logs**
   - Application logs will show email sending errors
   - Check console for "Failed to send password reset email"

### Token Invalid or Expired

1. **Check Token Expiry**
   - Default is 1 hour
   - Verify `PASSWORD_RESET_TOKEN_EXPIRES_IN` in .env

2. **Check Token Usage**
   - Tokens can only be used once
   - Request a new reset if token was already used

### User Not Receiving Email

1. **Check Spam Folder**
2. **Verify Email Address**
   - Email must match registered user
3. **Check OAuth Users**
   - OAuth-only users won't receive reset emails

## Database Schema

The password reset implementation adds these fields to the `users` table:

```sql
password_reset_token VARCHAR(255) -- Hashed reset token
password_reset_expires_at TIMESTAMP -- Token expiration time
```

Index for performance:
```sql
CREATE INDEX idx_users_password_reset_token
ON users(password_reset_token)
WHERE password_reset_token IS NOT NULL;
```

## Migration Rollback

To rollback the password reset fields:

```sql
DROP INDEX IF EXISTS idx_users_password_reset_token;
ALTER TABLE users DROP COLUMN IF EXISTS password_reset_token;
ALTER TABLE users DROP COLUMN IF EXISTS password_reset_expires_at;
```
