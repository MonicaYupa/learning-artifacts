-- Run all migrations for Learning Artifacts database
-- Execute this in Supabase SQL Editor to set up the complete schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Migration 001: Create Users table
-- ====================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

COMMENT ON TABLE users IS 'Stores user account information. Linked to Supabase Auth via email.';
COMMENT ON COLUMN users.id IS 'Unique user identifier';
COMMENT ON COLUMN users.email IS 'User email address, must be unique';
COMMENT ON COLUMN users.created_at IS 'Account creation timestamp';

-- Migration 002: Create Modules table
-- ====================================
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    skill_level VARCHAR(50) NOT NULL CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_domain ON modules(domain);
CREATE INDEX IF NOT EXISTS idx_modules_skill_level ON modules(skill_level);
CREATE INDEX IF NOT EXISTS idx_modules_created_at ON modules(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_modules_exercises ON modules USING GIN (exercises);

COMMENT ON TABLE modules IS 'Stores AI-generated learning modules with exercises in JSONB format';
COMMENT ON COLUMN modules.id IS 'Unique module identifier';
COMMENT ON COLUMN modules.title IS 'Module display name (e.g., "Introduction to Product Management")';
COMMENT ON COLUMN modules.domain IS 'Subject area (e.g., "product_management", "marketing_strategy")';
COMMENT ON COLUMN modules.skill_level IS 'Target difficulty level: beginner, intermediate, or advanced';
COMMENT ON COLUMN modules.exercises IS 'Array of exercise objects in JSONB format (analysis, comparative, framework)';
COMMENT ON COLUMN modules.created_at IS 'Module creation timestamp';

-- Migration 003: Create Sessions table
-- =====================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    module_id UUID NOT NULL,
    current_exercise_index INTEGER NOT NULL DEFAULT 0,
    attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    confidence_rating INTEGER CHECK (confidence_rating IS NULL OR (confidence_rating BETWEEN 1 AND 5)),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,

    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sessions_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    CONSTRAINT check_completed_at CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status = 'in_progress' AND completed_at IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_module_id ON sessions(module_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_status ON sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_attempts ON sessions USING GIN (attempts);

COMMENT ON TABLE sessions IS 'Tracks user progress through learning modules with attempt history';
COMMENT ON COLUMN sessions.id IS 'Unique session identifier';
COMMENT ON COLUMN sessions.user_id IS 'User taking the module';
COMMENT ON COLUMN sessions.module_id IS 'Module being completed';
COMMENT ON COLUMN sessions.current_exercise_index IS 'Current position in exercises array (0-indexed)';
COMMENT ON COLUMN sessions.attempts IS 'Array of attempt objects with answers, feedback, and scores';
COMMENT ON COLUMN sessions.status IS 'Session state: in_progress or completed';
COMMENT ON COLUMN sessions.confidence_rating IS 'User self-assessed confidence (1-5) after completion';
COMMENT ON COLUMN sessions.started_at IS 'Session start timestamp';
COMMENT ON COLUMN sessions.completed_at IS 'Session completion timestamp (NULL if in_progress)';

-- Verification query - run this to confirm all tables were created
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('users', 'modules', 'sessions')
ORDER BY table_name;
