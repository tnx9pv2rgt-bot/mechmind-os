-- Migration 002: Creazione tabella email_verification_tokens
-- Data: 2026-02-28

-- =====================================================
-- TABELLA EMAIL_VERIFICATION_TOKENS
-- =====================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_token_expiry CHECK (expires_at > created_at)
);

COMMENT ON TABLE email_verification_tokens IS 'Token per verifica email';
COMMENT ON COLUMN email_verification_tokens.token IS 'Token univoco di verifica';
COMMENT ON COLUMN email_verification_tokens.used IS 'Indica se il token è già stato utilizzato';
