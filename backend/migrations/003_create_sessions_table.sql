-- Create Sessions table
-- This table tracks user progress through learning modules

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

    -- Foreign key constraints
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sessions_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,

    -- Ensure completed_at is only set when status is completed
    CONSTRAINT check_completed_at CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status = 'in_progress' AND completed_at IS NULL)
    )
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_module_id ON sessions(module_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_status ON sessions(user_id, status);

-- Add GIN index for JSONB attempts column
CREATE INDEX IF NOT EXISTS idx_sessions_attempts ON sessions USING GIN (attempts);

-- Add comments for documentation
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
