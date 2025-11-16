-- Migration: Add OAuth provider fields to users table
-- Created: 2025-11-15
-- Description: Adds Google and Facebook OAuth support with email linking

-- Add OAuth provider ID fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255);

-- Add auth provider tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_providers JSONB DEFAULT '[]'::jsonb;

-- Make password optional for OAuth users
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Add indexes for OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id) WHERE facebook_id IS NOT NULL;

-- Update existing users to have email as their auth provider
UPDATE users
SET auth_provider = 'email',
    linked_providers = '["email"]'::jsonb
WHERE auth_provider IS NULL;
