-- Migration 003: Creazione tabella vat_verifications (cache P.IVA)
-- Data: 2026-02-28

-- =====================================================
-- TABELLA VAT_VERIFICATIONS (CACHE)
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
