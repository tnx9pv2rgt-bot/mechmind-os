-- =====================================================
-- SCHEMA COMPLETO - SISTEMA REGISTRAZIONE CLIENTI
-- Database: PostgreSQL
-- =====================================================

-- =====================================================
-- 1. ESTENSIONI
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. ENUM TYPES
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_type') THEN
        CREATE TYPE customer_type AS ENUM ('private', 'business');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_status') THEN
        CREATE TYPE customer_status AS ENUM ('pending_email_verification', 'active', 'suspended');
    END IF;
END$$;

-- =====================================================
-- 3. TABELLA CUSTOMERS
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    -- Chiave primaria
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Tipo cliente
    customer_type customer_type NOT NULL,
    
    -- Credenziali di accesso
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    
    -- Stato verifica email
    email_verified BOOLEAN DEFAULT FALSE,
    status customer_status DEFAULT 'pending_email_verification',
    
    -- Campi privato
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    
    -- Campi business
    business_name VARCHAR(150),
    business_type VARCHAR(50),
    vat_number VARCHAR(20) UNIQUE,
    vat_verified BOOLEAN DEFAULT FALSE,
    address VARCHAR(150),
    postal_code CHAR(5),
    city VARCHAR(50),
    province CHAR(2),
    pec_email VARCHAR(255),
    sdi_code CHAR(7),
    
    -- Preferenze
    newsletter BOOLEAN DEFAULT FALSE,
    marketing BOOLEAN DEFAULT FALSE,
    marketing_channels TEXT[],
    
    -- Consensi GDPR
    gdpr_accepted BOOLEAN DEFAULT FALSE,
    privacy_accepted BOOLEAN DEFAULT FALSE,
    gdpr_accepted_at TIMESTAMP,
    privacy_accepted_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    ip_address_signup VARCHAR(45),
    
    -- Vincoli di validazione
    CONSTRAINT chk_customer_type CHECK (
        (customer_type = 'private' AND first_name IS NOT NULL AND last_name IS NOT NULL) OR
        (customer_type = 'business' AND business_name IS NOT NULL)
    ),
    CONSTRAINT chk_gdpr CHECK (
        (gdpr_accepted = FALSE) OR (gdpr_accepted = TRUE AND gdpr_accepted_at IS NOT NULL)
    ),
    CONSTRAINT chk_privacy CHECK (
        (privacy_accepted = FALSE) OR (privacy_accepted = TRUE AND privacy_accepted_at IS NOT NULL)
    ),
    CONSTRAINT chk_status CHECK (
        (status = 'pending_email_verification' AND email_verified = FALSE) OR
        (status IN ('active', 'suspended'))
    )
);

COMMENT ON TABLE customers IS 'Tabella principale dei clienti registrati';
COMMENT ON COLUMN customers.customer_type IS 'Tipo cliente: privato o business';
COMMENT ON COLUMN customers.status IS 'Stato account: pending_email_verification, active, suspended';
COMMENT ON COLUMN customers.vat_number IS 'Partita IVA (solo per business)';
COMMENT ON COLUMN customers.pec_email IS 'Email PEC per fatturazione elettronica';
COMMENT ON COLUMN customers.sdi_code IS 'Codice SDI per fatturazione elettronica (7 caratteri)';

-- =====================================================
-- 4. TABELLA EMAIL_VERIFICATION_TOKENS
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

-- =====================================================
-- 5. TABELLA VAT_VERIFICATIONS (CACHE)
-- =====================================================
CREATE TABLE IF NOT EXISTS vat_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vat_number VARCHAR(20) UNIQUE NOT NULL,
    is_valid BOOLEAN,
    found_in_registry BOOLEAN,
    ragione_sociale VARCHAR(150),
    indirizzo VARCHAR(150),
    cap CHAR(5),
    città VARCHAR(50),
    provincia CHAR(2),
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    CONSTRAINT chk_vat_expiry CHECK (expires_at > verified_at)
);

COMMENT ON TABLE vat_verifications IS 'Cache delle verifiche Partita IVA';
COMMENT ON COLUMN vat_verifications.found_in_registry IS 'Indica se la P.IVA è stata trovata nel registro VIES o altro sistema';

-- =====================================================
-- 6. TABELLA SIGNUP_AUDIT_LOG (GDPR COMPLIANCE)
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

-- =====================================================
-- 7. TABELLA RATE_LIMITS
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

-- =====================================================
-- 8. INDICI
-- =====================================================
-- Indici per customers
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_vat_number ON customers(vat_number);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Indici per email_verification_tokens
CREATE INDEX IF NOT EXISTS idx_tokens_customer_id ON email_verification_tokens(customer_id);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON email_verification_tokens(expires_at);

-- Indici per vat_verifications
CREATE INDEX IF NOT EXISTS idx_vat_vat_number ON vat_verifications(vat_number);
CREATE INDEX IF NOT EXISTS idx_vat_verified_at ON vat_verifications(verified_at);

-- Indici per signup_audit_log
CREATE INDEX IF NOT EXISTS idx_audit_customer_id ON signup_audit_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON signup_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON signup_audit_log(created_at);

-- Indici per rate_limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint ON rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- Indice combinato per rate limiting
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_unique 
    ON rate_limits(ip_address, endpoint) 
    WHERE reset_at IS NULL OR reset_at > NOW();

-- =====================================================
-- 9. TRIGGER PER UPDATED_AT
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
-- 10. TRIGGER PER LOGGING OPERAZIONI
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

-- =====================================================
-- 11. FUNZIONI UTILITY
-- =====================================================

-- Funzione per verificare se un token email è valido
CREATE OR REPLACE FUNCTION is_email_token_valid(p_token VARCHAR)
RETURNS TABLE (
    valid BOOLEAN,
    customer_id UUID,
    expired BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (NOT evt.used AND evt.expires_at > NOW()) as valid,
        evt.customer_id,
        (evt.expires_at <= NOW()) as expired
    FROM email_verification_tokens evt
    WHERE evt.token = p_token;
END;
$$ language 'plpgsql';

-- Funzione per pulire i token scaduti
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM email_verification_tokens 
    WHERE expires_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Funzione per pulire i rate limits scaduti
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM rate_limits 
    WHERE reset_at < NOW() OR reset_at IS NULL AND last_attempt < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Funzione per ottenere statistiche clienti
CREATE OR REPLACE FUNCTION get_customer_stats()
RETURNS TABLE (
    total_customers BIGINT,
    private_customers BIGINT,
    business_customers BIGINT,
    pending_verification BIGINT,
    active_customers BIGINT,
    suspended_customers BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_customers,
        COUNT(*) FILTER (WHERE customer_type = 'private') as private_customers,
        COUNT(*) FILTER (WHERE customer_type = 'business') as business_customers,
        COUNT(*) FILTER (WHERE status = 'pending_email_verification') as pending_verification,
        COUNT(*) FILTER (WHERE status = 'active') as active_customers,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended_customers
    FROM customers;
END;
$$ language 'plpgsql';

-- =====================================================
-- 12. SEED DATA
-- =====================================================

-- Inserimento clienti privati di test
INSERT INTO customers (
    id, customer_type, email, password_hash, phone,
    email_verified, status, first_name, last_name,
    newsletter, marketing, gdpr_accepted, privacy_accepted,
    gdpr_accepted_at, privacy_accepted_at, created_at
) VALUES 
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'private',
    'mario.rossi@example.com',
    crypt('TestPassword123!', gen_salt('bf')),
    '+393471234567',
    TRUE,
    'active',
    'Mario',
    'Rossi',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    NOW(),
    NOW(),
    NOW() - INTERVAL '30 days'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'private',
    'giulia.bianchi@example.com',
    crypt('TestPassword123!', gen_salt('bf')),
    '+393481234567',
    FALSE,
    'pending_email_verification',
    'Giulia',
    'Bianchi',
    FALSE,
    FALSE,
    TRUE,
    TRUE,
    NOW(),
    NOW(),
    NOW() - INTERVAL '1 day'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    'private',
    'luca.verdi@example.com',
    crypt('TestPassword123!', gen_salt('bf')),
    '+393491234567',
    TRUE,
    'suspended',
    'Luca',
    'Verdi',
    TRUE,
    FALSE,
    TRUE,
    TRUE,
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '60 days'
)
ON CONFLICT (id) DO NOTHING;

-- Inserimento clienti business di test
INSERT INTO customers (
    id, customer_type, email, password_hash, phone,
    email_verified, status, business_name, business_type,
    vat_number, vat_verified, address, postal_code, city, province,
    pec_email, sdi_code,
    newsletter, marketing, marketing_channels,
    gdpr_accepted, privacy_accepted,
    gdpr_accepted_at, privacy_accepted_at, created_at
) VALUES 
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21',
    'business',
    'info@techsolutions.it',
    crypt('TestPassword123!', gen_salt('bf')),
    '+390212345678',
    TRUE,
    'active',
    'Tech Solutions S.r.l.',
    'S.r.l.',
    '12345678901',
    TRUE,
    'Via Roma 123',
    '20121',
    'Milano',
    'MI',
    'techsolutions@pec.it',
    'ABC1234',
    TRUE,
    TRUE,
    ARRAY['email', 'sms'],
    TRUE,
    TRUE,
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '45 days'
),
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'business',
    'amministrazione@designstudio.it',
    crypt('TestPassword123!', gen_salt('bf')),
    '+390612345678',
    TRUE,
    'active',
    'Design Studio S.r.l.s.',
    'S.r.l.s.',
    '10987654321',
    FALSE,
    'Via Milano 456',
    '00185',
    'Roma',
    'RM',
    'designstudio@pec.it',
    'XYZ5678',
    FALSE,
    TRUE,
    ARRAY['email'],
    TRUE,
    TRUE,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days'
),
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23',
    'business',
    'contatti@consulenzepro.it',
    crypt('TestPassword123!', gen_salt('bf')),
    '+390112345678',
    FALSE,
    'pending_email_verification',
    'Consulenze Pro S.a.s.',
    'S.a.s.',
    '11223344556',
    FALSE,
    'Corso Torino 789',
    '10123',
    'Torino',
    'TO',
    'consulenzepro@pec.it',
    'DEF9012',
    TRUE,
    FALSE,
    NULL,
    TRUE,
    TRUE,
    NOW(),
    NOW(),
    NOW() - INTERVAL '2 hours'
)
ON CONFLICT (id) DO NOTHING;

-- Inserimento token di verifica di test
INSERT INTO email_verification_tokens (
    id, customer_id, token, expires_at, used, used_at, created_at
) VALUES 
(
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'verified_token_mario_123456789',
    NOW() - INTERVAL '1 day',
    TRUE,
    NOW() - INTERVAL '29 days',
    NOW() - INTERVAL '30 days'
),
(
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'pending_token_giulia_123456789',
    NOW() + INTERVAL '23 hours',
    FALSE,
    NULL,
    NOW() - INTERVAL '1 hour'
),
(
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21',
    'verified_token_tech_123456789',
    NOW() - INTERVAL '10 days',
    TRUE,
    NOW() - INTERVAL '44 days',
    NOW() - INTERVAL '45 days'
),
(
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a34',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23',
    'pending_token_cons_123456789',
    NOW() + INTERVAL '23 hours',
    FALSE,
    NULL,
    NOW() - INTERVAL '1 hour'
)
ON CONFLICT (id) DO NOTHING;

-- Inserimento cache P.IVA di test
INSERT INTO vat_verifications (
    id, vat_number, is_valid, found_in_registry, ragione_sociale,
    indirizzo, cap, città, provincia, verified_at, expires_at
) VALUES 
(
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41',
    '12345678901',
    TRUE,
    TRUE,
    'Tech Solutions S.r.l.',
    'Via Roma 123',
    '20121',
    'Milano',
    'MI',
    NOW() - INTERVAL '45 days',
    NOW() + INTERVAL '45 days'
),
(
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42',
    '10987654321',
    FALSE,
    FALSE,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '10 days'
)
ON CONFLICT (id) DO NOTHING;

-- Inserimento log audit di test
INSERT INTO signup_audit_log (
    id, customer_id, event_type, ip_address, user_agent, form_data, created_at
) VALUES 
(
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a51',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'signup',
    '192.168.1.100',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0',
    '{"customer_type": "private", "first_name": "Mario", "last_name": "Rossi", "email": "mario.rossi@example.com"}'::jsonb,
    NOW() - INTERVAL '30 days'
),
(
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a52',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'email_verified',
    '192.168.1.100',
    NULL,
    '{"token_used": "verified_token_mario_123456789"}'::jsonb,
    NOW() - INTERVAL '29 days'
),
(
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a53',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21',
    'signup',
    '192.168.1.101',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.0',
    '{"customer_type": "business", "business_name": "Tech Solutions S.r.l.", "vat_number": "12345678901"}'::jsonb,
    NOW() - INTERVAL '45 days'
),
(
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a54',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    'status_change:suspended',
    NULL,
    NULL,
    '{"old_status": "active", "new_status": "suspended", "email_verified": true}'::jsonb,
    NOW() - INTERVAL '10 days'
)
ON CONFLICT (id) DO NOTHING;

-- Inserimento rate limits di test
INSERT INTO rate_limits (
    id, ip_address, endpoint, attempt_count, first_attempt, last_attempt, reset_at
) VALUES 
(
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a61',
    '192.168.1.200',
    '/api/auth/login',
    3,
    NOW() - INTERVAL '10 minutes',
    NOW() - INTERVAL '5 minutes',
    NULL
),
(
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a62',
    '192.168.1.201',
    '/api/auth/signup',
    5,
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '30 minutes',
    NOW() + INTERVAL '23 hours'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VERIFICA INSTALLAZIONE
-- =====================================================
SELECT 'Schema creato con successo!' as status;
