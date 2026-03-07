-- Migration: Add MFA fields for TOTP/2FA support
-- Created: 2026-02-28
-- Description: Adds Multi-Factor Authentication support with TOTP and backup codes

-- ============================================================================
-- USER MFA TABLE
-- ============================================================================
-- This table stores MFA configuration per user

CREATE TABLE IF NOT EXISTS user_mfa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    secret TEXT NOT NULL, -- Encrypted TOTP secret (base32)
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    backup_codes TEXT[] NOT NULL DEFAULT '{}', -- Hashed backup codes
    verify_attempts INTEGER NOT NULL DEFAULT 0,
    last_verify_attempt TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_user_mfa UNIQUE (user_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_mfa_user_id ON user_mfa(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_enabled ON user_mfa(enabled);

-- RLS Policy for user_mfa
ALTER TABLE user_mfa ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_user_mfa ON user_mfa
    USING (
        user_id IN (
            SELECT id FROM users 
            WHERE tenant_id = current_setting('app.current_tenant')::UUID
        )
    );

-- ============================================================================
-- ALTERNATIVE: ADD COLUMNS TO EXISTING USER TABLE
-- ============================================================================
-- If using a single User table instead of separate user_mfa table

-- Uncomment the following if you prefer columns in users table:
/*
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS totp_secret TEXT,
    ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS backup_codes TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS mfa_verify_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS mfa_last_verify_attempt TIMESTAMP WITH TIME ZONE;

-- Index for MFA queries
CREATE INDEX IF NOT EXISTS idx_users_totp_enabled ON users(totp_enabled);
*/

-- ============================================================================
-- MFA AUDIT LOG TABLE
-- ============================================================================
-- Tracks MFA-related events for security auditing

CREATE TABLE IF NOT EXISTS mfa_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'enroll', 'verify', 'disable', 'backup_used', 'failed_attempt'
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for MFA audit queries
CREATE INDEX IF NOT EXISTS idx_mfa_audit_user_id ON mfa_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_tenant_id ON mfa_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_event_type ON mfa_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_created_at ON mfa_audit_log(created_at);

-- RLS Policy for mfa_audit_log
ALTER TABLE mfa_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_mfa_audit ON mfa_audit_log
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_mfa updated_at
DROP TRIGGER IF EXISTS update_user_mfa_updated_at ON user_mfa;
CREATE TRIGGER update_user_mfa_updated_at
    BEFORE UPDATE ON user_mfa
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to log MFA events
CREATE OR REPLACE FUNCTION log_mfa_event(
    p_user_id UUID,
    p_event_type VARCHAR(50),
    p_event_data JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Get tenant_id from user
    SELECT tenant_id INTO v_tenant_id FROM users WHERE id = p_user_id;
    
    INSERT INTO mfa_audit_log (user_id, tenant_id, event_type, event_data, ip_address, user_agent)
    VALUES (p_user_id, v_tenant_id, p_event_type, p_event_data, p_ip_address, p_user_agent);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_mfa IS 'Stores MFA/TOTP configuration for users';
COMMENT ON COLUMN user_mfa.secret IS 'Encrypted TOTP secret in base32 format';
COMMENT ON COLUMN user_mfa.backup_codes IS 'Array of bcrypt-hashed backup codes';
COMMENT ON COLUMN user_mfa.verify_attempts IS 'Failed verification attempts (reset on success)';
COMMENT ON TABLE mfa_audit_log IS 'Audit log for MFA-related events';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to application role
GRANT SELECT, INSERT, UPDATE, DELETE ON user_mfa TO app_role;
GRANT SELECT, INSERT ON mfa_audit_log TO app_role;
GRANT USAGE, SELECT ON SEQUENCE mfa_audit_log_id_seq TO app_role;
