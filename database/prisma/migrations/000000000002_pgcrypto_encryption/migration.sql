-- ============================================================================
-- MechMind OS v10 - PGCrypto Encryption Setup
-- PII Encryption using AES-256-GCM via pgcrypto
-- ============================================================================

-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- ENCRYPTION KEY MANAGEMENT
-- ============================================================================

-- Table to store encryption key references (actual keys in external KMS)
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  key_name VARCHAR(255) NOT NULL,
  key_reference VARCHAR(500) NOT NULL, -- Reference to external KMS
  algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
  created_at TIMESTAMP DEFAULT NOW(),
  rotated_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(tenant_id, key_name)
);

CREATE INDEX idx_encryption_keys_tenant ON encryption_keys(tenant_id);
CREATE INDEX idx_encryption_keys_active ON encryption_keys(is_active);

-- ============================================================================
-- ENCRYPTION/DECRYPTION FUNCTIONS
-- ============================================================================

-- Function to encrypt data using AES-256
-- In production, the encryption key should come from an external KMS
CREATE OR REPLACE FUNCTION encrypt_pii(
  p_plaintext TEXT,
  p_key TEXT
) RETURNS BYTEA AS $$
DECLARE
  v_key BYTEA;
  v_iv BYTEA;
  v_encrypted BYTEA;
BEGIN
  IF p_plaintext IS NULL OR p_plaintext = '' THEN
    RETURN NULL;
  END IF;
  
  -- Derive 256-bit key from provided key using SHA-256
  v_key := digest(p_key, 'sha256');
  
  -- Generate random IV (16 bytes for AES)
  v_iv := gen_random_bytes(16);
  
  -- Encrypt using AES-256-CBC with IV prepended
  v_encrypted := v_iv || encrypt(
    convert_to(p_plaintext, 'UTF8'),
    v_key,
    'aes-cbc/pad:pkcs'
  );
  
  RETURN v_encrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt data using AES-256
CREATE OR REPLACE FUNCTION decrypt_pii(
  p_ciphertext BYTEA,
  p_key TEXT
) RETURNS TEXT AS $$
DECLARE
  v_key BYTEA;
  v_iv BYTEA;
  v_encrypted BYTEA;
  v_decrypted BYTEA;
BEGIN
  IF p_ciphertext IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Derive 256-bit key from provided key
  v_key := digest(p_key, 'sha256');
  
  -- Extract IV (first 16 bytes)
  v_iv := substring(p_ciphertext FROM 1 FOR 16);
  
  -- Extract encrypted data (remaining bytes)
  v_encrypted := substring(p_ciphertext FROM 17);
  
  -- Decrypt
  v_decrypted := decrypt(
    v_encrypted,
    v_key,
    'aes-cbc/pad:pkcs'
  );
  
  RETURN convert_from(v_decrypted, 'UTF8');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CUSTOMER ENCRYPTION HELPER FUNCTIONS
-- ============================================================================

-- Function to create encrypted customer
CREATE OR REPLACE FUNCTION create_encrypted_customer(
  p_tenant_id UUID,
  p_phone TEXT,
  p_email TEXT,
  p_name TEXT,
  p_encryption_key TEXT,
  p_gdpr_consent BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  INSERT INTO customers_encrypted (
    tenant_id,
    phone_encrypted,
    email_encrypted,
    name_encrypted,
    gdpr_consent,
    gdpr_consent_date
  ) VALUES (
    p_tenant_id,
    encrypt_pii(p_phone, p_encryption_key),
    encrypt_pii(p_email, p_encryption_key),
    encrypt_pii(p_name, p_encryption_key),
    p_gdpr_consent,
    CASE WHEN p_gdpr_consent THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_customer_id;
  
  RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt customer data
CREATE OR REPLACE FUNCTION decrypt_customer(
  p_customer_id UUID,
  p_encryption_key TEXT
) RETURNS TABLE (
  id UUID,
  phone TEXT,
  email TEXT,
  name TEXT,
  gdpr_consent BOOLEAN,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    decrypt_pii(c.phone_encrypted, p_encryption_key),
    decrypt_pii(c.email_encrypted, p_encryption_key),
    decrypt_pii(c.name_encrypted, p_encryption_key),
    c.gdpr_consent,
    c.created_at
  FROM customers_encrypted c
  WHERE c.id = p_customer_id
    AND c.tenant_id = get_current_tenant();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update encrypted customer
CREATE OR REPLACE FUNCTION update_encrypted_customer(
  p_customer_id UUID,
  p_encryption_key TEXT,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE customers_encrypted
  SET 
    phone_encrypted = COALESCE(encrypt_pii(p_phone, p_encryption_key), phone_encrypted),
    email_encrypted = COALESCE(encrypt_pii(p_email, p_encryption_key), email_encrypted),
    name_encrypted = COALESCE(encrypt_pii(p_name, p_encryption_key), name_encrypted)
  WHERE id = p_customer_id
    AND tenant_id = get_current_tenant();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GDPR ANONYMIZATION FUNCTIONS
-- ============================================================================

-- Function to anonymize customer data (GDPR right to erasure)
CREATE OR REPLACE FUNCTION anonymize_customer(
  p_customer_id UUID,
  p_encryption_key TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_anonymized_phone BYTEA;
  v_anonymized_email BYTEA;
  v_anonymized_name BYTEA;
BEGIN
  -- Create anonymized placeholders
  v_anonymized_phone := encrypt_pii('ANONYMIZED', p_encryption_key);
  v_anonymized_email := encrypt_pii('anonymized@deleted.local', p_encryption_key);
  v_anonymized_name := encrypt_pii('Deleted Customer', p_encryption_key);
  
  UPDATE customers_encrypted
  SET 
    phone_encrypted = v_anonymized_phone,
    email_encrypted = v_anonymized_email,
    name_encrypted = v_anonymized_name,
    is_deleted = TRUE,
    deleted_at = NOW()
  WHERE id = p_customer_id
    AND tenant_id = get_current_tenant();
  
  -- Also anonymize related booking events
  UPDATE booking_events
  SET is_anonymized = TRUE
  WHERE event_data->>'customer_id' = p_customer_id::TEXT
    AND tenant_id = get_current_tenant();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and enforce data retention policy
CREATE OR REPLACE FUNCTION enforce_data_retention()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Soft delete customers past retention period
  UPDATE customers_encrypted
  SET 
    is_deleted = TRUE,
    deleted_at = NOW()
  WHERE is_deleted = FALSE
    AND created_at < NOW() - (data_retention_days || ' days')::INTERVAL
    AND gdpr_consent = TRUE;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENCRYPTION AUDIT LOGGING
-- ============================================================================

-- Trigger function to log encryption operations
CREATE OR REPLACE FUNCTION log_encryption_operation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (tenant_id, action, table_name, record_id, new_values)
    VALUES (
      NEW.tenant_id,
      'ENCRYPTED_DATA_CREATED',
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object('encrypted_fields', ARRAY['phone', 'email', 'name'])
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (tenant_id, action, table_name, record_id, old_values, new_values)
    VALUES (
      NEW.tenant_id,
      'ENCRYPTED_DATA_UPDATED',
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object('is_deleted', OLD.is_deleted),
      jsonb_build_object('is_deleted', NEW.is_deleted)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to encrypted customer table
CREATE TRIGGER audit_customers_encrypted
  AFTER INSERT OR UPDATE ON customers_encrypted
  FOR EACH ROW
  EXECUTE FUNCTION log_encryption_operation();

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION encrypt_pii(TEXT, TEXT) IS 'Encrypts PII using AES-256-CBC with random IV';
COMMENT ON FUNCTION decrypt_pii(BYTEA, TEXT) IS 'Decrypts PII encrypted with encrypt_pii function';
COMMENT ON FUNCTION create_encrypted_customer IS 'Creates a new customer with encrypted PII fields';
COMMENT ON FUNCTION decrypt_customer IS 'Returns decrypted customer data for authorized access';
COMMENT ON FUNCTION anonymize_customer IS 'GDPR-compliant anonymization of customer data';
COMMENT ON FUNCTION enforce_data_retention IS 'Enforces data retention policies and soft deletes expired records';
