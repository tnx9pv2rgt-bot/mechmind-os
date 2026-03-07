-- ============================================================================
-- Migration: Form Drafts Realtime
-- Description: Tabella per il salvataggio real-time dei form con versioning
-- e conflict resolution
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: form_drafts
-- ============================================================================

CREATE TABLE IF NOT EXISTS form_drafts (
    -- Primary key: composite user_id + form_type + form_id
    id TEXT PRIMARY KEY,
    
    -- User reference (from auth.users)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Form type (e.g., 'customer', 'booking', 'vehicle')
    form_type TEXT NOT NULL,
    
    -- Form ID (unique per user + form_type)
    form_id TEXT NOT NULL,
    
    -- Form data (JSONB for flexible schema)
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Version for optimistic locking/conflict resolution
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Device info for conflict resolution
    device_info TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT form_drafts_version_positive CHECK (version > 0),
    CONSTRAINT form_drafts_user_form_unique UNIQUE (user_id, form_type, form_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_form_drafts_user_id 
    ON form_drafts(user_id);

-- Index for form type queries
CREATE INDEX IF NOT EXISTS idx_form_drafts_form_type 
    ON form_drafts(form_type);

-- Index for updated_at (useful for cleanup)
CREATE INDEX IF NOT EXISTS idx_form_drafts_updated_at 
    ON form_drafts(updated_at);

-- GIN index for JSONB data (enables efficient JSON queries)
CREATE INDEX IF NOT EXISTS idx_form_drafts_data_gin 
    ON form_drafts USING GIN(data);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_form_drafts_updated_at ON form_drafts;
CREATE TRIGGER update_form_drafts_updated_at
    BEFORE UPDATE ON form_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment version on update
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS increment_form_drafts_version ON form_drafts;
CREATE TRIGGER increment_form_drafts_version
    BEFORE UPDATE ON form_drafts
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE form_drafts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own drafts
CREATE POLICY "Users can only access their own drafts"
    ON form_drafts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- REALTIME SETUP
-- ============================================================================

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE form_drafts;

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

-- Function to clean up old drafts (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_form_drafts(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM form_drafts
    WHERE updated_at < NOW() - (days_old || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for active drafts (updated in last 7 days)
CREATE OR REPLACE VIEW active_form_drafts AS
SELECT 
    id,
    user_id,
    form_type,
    form_id,
    version,
    device_info,
    created_at,
    updated_at,
    NOW() - updated_at as time_since_update
FROM form_drafts
WHERE updated_at > NOW() - INTERVAL '7 days';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE form_drafts IS 'Stores real-time form drafts with versioning for conflict resolution';
COMMENT ON COLUMN form_drafts.id IS 'Composite primary key: user_id_form_type_form_id';
COMMENT ON COLUMN form_drafts.version IS 'Optimistic locking version, auto-increments on update';
COMMENT ON COLUMN form_drafts.data IS 'JSONB form data, flexible schema';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
