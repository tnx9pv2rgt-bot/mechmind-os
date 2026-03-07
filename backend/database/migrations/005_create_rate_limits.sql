-- Migration 005: Creazione tabella rate_limits
-- Data: 2026-02-28

-- =====================================================
-- TABELLA RATE_LIMITS
-- =====================================================
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address VARCHAR(45) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    attempt_count INT DEFAULT 1,
    first_attempt TIMESTAMP DEFAULT NOW(),
    last_attempt TIMESTAMP DEFAULT NOW(),
    reset_at TIMESTAMP,
    
    CONSTRAINT chk_positive_attempts CHECK (attempt_count > 0)
);

COMMENT ON TABLE rate_limits IS 'Rate limiting per protezione brute force';
COMMENT ON COLUMN rate_limits.endpoint IS 'Endpoint/API chiamata';
COMMENT ON COLUMN rate_limits.reset_at IS 'Quando il rate limit viene resettato';
