-- Add user_id column to modules table
-- This migration adds user ownership to modules for multi-tenant support

-- Add user_id column (nullable initially for existing rows)
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_modules_user_id ON modules(user_id);

-- Add comment
COMMENT ON COLUMN modules.user_id IS 'Owner of the module (references users table)';

-- Note: In production, you should make user_id NOT NULL after handling existing data
-- ALTER TABLE modules ALTER COLUMN user_id SET NOT NULL;
