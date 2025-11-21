-- Migration: Add email verification fields to users table
-- Created: 2025-11-21
-- Description: Adds email verification token and expiration fields for email verification flow

-- Add email verification token field
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);

-- Add email verification expiration timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP;

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;
