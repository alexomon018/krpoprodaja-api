-- Migration: Add password reset fields to users table
-- Created: 2025-11-17
-- Description: Adds password reset token and expiration fields for password reset flow

-- Add password reset token field
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);

-- Add password reset expiration timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP;

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;
