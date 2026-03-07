-- Migration 004: Creazione tabella signup_audit_log (GDPR compliance)
-- Data: 2026-02-28

-- =====================================================
-- TABELLA SIGNUP_AUDIT_LOG (GDPR COMPLIANCE)
-- =====================================================
CREATE TABLE IF NOT EXISTS signup_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    form_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE signup_audit_log IS 'Log di audit per compliance GDPR';
COMMENT ON COLUMN signup_audit_log.event_type IS 'Tipo di evento: signup, email_verified, login, etc.';
COMMENT ON COLUMN signup_audit_log.form_data IS 'Dati del form (senza password) in formato JSON';
