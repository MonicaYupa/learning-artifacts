-- Create Users table
-- This table stores user account information
-- Note: Supabase Auth will manage authentication, this table stores additional user data

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add comment for documentation
COMMENT ON TABLE users IS 'Stores user account information. Linked to Supabase Auth via email.';
COMMENT ON COLUMN users.id IS 'Unique user identifier';
COMMENT ON COLUMN users.email IS 'User email address, must be unique';
COMMENT ON COLUMN users.created_at IS 'Account creation timestamp';
