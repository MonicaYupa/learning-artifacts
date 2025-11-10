-- Create Modules table
-- This table stores AI-generated learning modules with exercises

CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    skill_level VARCHAR(50) NOT NULL CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_modules_domain ON modules(domain);
CREATE INDEX IF NOT EXISTS idx_modules_skill_level ON modules(skill_level);
CREATE INDEX IF NOT EXISTS idx_modules_created_at ON modules(created_at DESC);

-- Add GIN index for JSONB exercises column for efficient queries
CREATE INDEX IF NOT EXISTS idx_modules_exercises ON modules USING GIN (exercises);

-- Add comments for documentation
COMMENT ON TABLE modules IS 'Stores AI-generated learning modules with exercises in JSONB format';
COMMENT ON COLUMN modules.id IS 'Unique module identifier';
COMMENT ON COLUMN modules.title IS 'Module display name (e.g., "Introduction to Product Management")';
COMMENT ON COLUMN modules.domain IS 'Subject area (e.g., "product_management", "marketing_strategy")';
COMMENT ON COLUMN modules.skill_level IS 'Target difficulty level: beginner, intermediate, or advanced';
COMMENT ON COLUMN modules.exercises IS 'Array of exercise objects in JSONB format (analysis, comparative, framework)';
COMMENT ON COLUMN modules.created_at IS 'Module creation timestamp';
