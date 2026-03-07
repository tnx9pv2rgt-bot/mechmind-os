-- Migration 006: Aggiunta indici e trigger
-- Data: 2026-02-28

-- =====================================================
-- INDICI PER CUSTOMERS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_vat_number ON customers(vat_number);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- =====================================================
-- INDICI PER EMAIL_VERIFICATION_TOKENS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tokens_customer_id ON email_verification_tokens(customer_id);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON email_verification_tokens(expires_at);

-- =====================================================
-- INDICI PER VAT_VERIFICATIONS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_vat_vat_number ON vat_verifications(vat_number);
CREATE INDEX IF NOT EXISTS idx_vat_verified_at ON vat_verifications(verified_at);

-- =====================================================
-- INDICI PER SIGNUP_AUDIT_LOG
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_audit_customer_id ON signup_audit_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON signup_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON signup_audit_log(created_at);

-- =====================================================
-- INDICI PER RATE_LIMITS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint ON rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- Indice combinato per rate limiting
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_unique 
    ON rate_limits(ip_address, endpoint) 
    WHERE reset_at IS NULL OR reset_at > NOW();

-- =====================================================
-- TRIGGER PER UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_customers_updated_at ON customers;
CREATE TRIGGER trigger_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER PER LOGGING OPERAZIONI
-- =====================================================
CREATE OR REPLACE FUNCTION log_customer_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Log solo cambiamenti di stato significativi
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO signup_audit_log (customer_id, event_type, ip_address, form_data, created_at)
        VALUES (
            NEW.id, 
            'status_change:' || NEW.status,
            NEW.ip_address_signup,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'email_verified', NEW.email_verified
            ),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_customers_audit ON customers;
CREATE TRIGGER trigger_customers_audit
    AFTER UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION log_customer_update();

-- Trigger per login
CREATE OR REPLACE FUNCTION log_customer_login()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO signup_audit_log (customer_id, event_type, ip_address, created_at)
    VALUES (NEW.id, 'login', NEW.ip_address_signup, NOW());
    
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_customers_login ON customers;
CREATE TRIGGER trigger_customers_login
    AFTER UPDATE OF last_login ON customers
    FOR EACH ROW
    WHEN (OLD.last_login IS DISTINCT FROM NEW.last_login)
    EXECUTE FUNCTION log_customer_login();
