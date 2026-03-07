-- Migration 001: Creazione tabella customers
-- Data: 2026-02-28

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

-- Commenti
COMMENT ON TABLE customers IS 'Tabella principale dei clienti registrati';
COMMENT ON COLUMN customers.customer_type IS 'Tipo cliente: privato o business';
COMMENT ON COLUMN customers.status IS 'Stato account: pending_email_verification, active, suspended';
COMMENT ON COLUMN customers.vat_number IS 'Partita IVA (solo per business)';
COMMENT ON COLUMN customers.pec_email IS 'Email PEC per fatturazione elettronica';
COMMENT ON COLUMN customers.sdi_code IS 'Codice SDI per fatturazione elettronica (7 caratteri)';
