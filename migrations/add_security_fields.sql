-- Add security fields for account lockout and password reset tracking
-- Migration: add_security_fields
-- Created: 2025-11-18

-- Add password reset used flag
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_reset_used BOOLEAN DEFAULT false;

-- Add failed login attempts counter
ALTER TABLE users
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL;

-- Add account lockout timestamp
ALTER TABLE users
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

-- Add comment to explain the security fields
COMMENT ON COLUMN users.password_reset_used IS 'Flag to prevent password reset token reuse';
COMMENT ON COLUMN users.failed_login_attempts IS 'Counter for failed login attempts, resets on successful login';
COMMENT ON COLUMN users.locked_until IS 'Timestamp until which the account is locked due to multiple failed login attempts';
