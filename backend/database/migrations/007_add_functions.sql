-- Migration 007: Aggiunta funzioni utility
-- Data: 2026-02-28

-- =====================================================
-- FUNZIONI UTILITY
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
