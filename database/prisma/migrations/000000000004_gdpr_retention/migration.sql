-- ============================================================================
-- Migration: 000000000004_gdpr_retention
-- Description: GDPR compliance tables for data retention and consent tracking
-- Version: MechMind OS v10
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TENANT TABLE UPDATES - Data Retention Configuration
-- ============================================================================

-- Add data_retention_days column to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 2555; -- 7 years default

-- Add GDPR compliance fields to tenants
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS gdpr_compliant BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dpa_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS dpa_version VARCHAR(10);

-- Add index for retention policy queries
CREATE INDEX IF NOT EXISTS idx_tenants_data_retention 
ON tenants(data_retention_days) 
WHERE data_retention_days IS NOT NULL;

COMMENT ON COLUMN tenants.data_retention_days IS 'Number of days to retain customer data before anonymization';
COMMENT ON COLUMN tenants.gdpr_compliant IS 'Whether tenant has signed DPA and is GDPR compliant';
COMMENT ON COLUMN tenants.dpa_signed_at IS 'Timestamp when DPA was signed';

-- ============================================================================
-- 3. CUSTOMERS_ENCRYPTED TABLE UPDATES - Consent Tracking
-- ============================================================================

-- Add GDPR consent fields if they don't exist (checking schema first)
DO $$
BEGIN
    -- Add gdpr_consent column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers_encrypted' AND column_name = 'gdpr_consent'
    ) THEN
        ALTER TABLE customers_encrypted ADD COLUMN gdpr_consent BOOLEAN DEFAULT false;
    END IF;

    -- Add gdpr_consent_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers_encrypted' AND column_name = 'gdpr_consent_date'
    ) THEN
        ALTER TABLE customers_encrypted ADD COLUMN gdpr_consent_date TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add gdpr_consent_ip column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers_encrypted' AND column_name = 'gdpr_consent_ip'
    ) THEN
        ALTER TABLE customers_encrypted ADD COLUMN gdpr_consent_ip INET;
    END IF;

    -- Add marketing_consent column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers_encrypted' AND column_name = 'marketing_consent'
    ) THEN
        ALTER TABLE customers_encrypted ADD COLUMN marketing_consent BOOLEAN DEFAULT false;
    END IF;

    -- Add marketing_consent_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers_encrypted' AND column_name = 'marketing_consent_date'
    ) THEN
        ALTER TABLE customers_encrypted ADD COLUMN marketing_consent_date TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add call_recording_consent column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers_encrypted' AND column_name = 'call_recording_consent'
    ) THEN
        ALTER TABLE customers_encrypted ADD COLUMN call_recording_consent BOOLEAN DEFAULT false;
    END IF;

    -- Add anonymized_at column for tracking erasure
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers_encrypted' AND column_name = 'anonymized_at'
    ) THEN
        ALTER TABLE customers_encrypted ADD COLUMN anonymized_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add deletion_requested_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers_encrypted' AND column_name = 'deletion_requested_at'
    ) THEN
        ALTER TABLE customers_encrypted ADD COLUMN deletion_requested_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add data_subject_request_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers_encrypted' AND column_name = 'data_subject_request_id'
    ) THEN
        ALTER TABLE customers_encrypted ADD COLUMN data_subject_request_id UUID;
    END IF;
END $$;

-- Add indexes for consent queries
CREATE INDEX IF NOT EXISTS idx_customers_encrypted_gdpr_consent 
ON customers_encrypted(gdpr_consent) 
WHERE gdpr_consent = true;

CREATE INDEX IF NOT EXISTS idx_customers_encrypted_consent_date 
ON customers_encrypted(gdpr_consent_date);

CREATE INDEX IF NOT EXISTS idx_customers_encrypted_anonymized 
ON customers_encrypted(anonymized_at) 
WHERE anonymized_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_encrypted_deletion_requested 
ON customers_encrypted(deletion_requested_at) 
WHERE deletion_requested_at IS NOT NULL;

COMMENT ON COLUMN customers_encrypted.gdpr_consent IS 'General GDPR consent for data processing';
COMMENT ON COLUMN customers_encrypted.gdpr_consent_date IS 'Timestamp when GDPR consent was given';
COMMENT ON COLUMN customers_encrypted.gdpr_consent_ip IS 'IP address from which consent was given';
COMMENT ON COLUMN customers_encrypted.marketing_consent IS 'Consent for marketing communications';
COMMENT ON COLUMN customers_encrypted.anonymized_at IS 'Timestamp when customer data was anonymized (Art. 17)';
COMMENT ON COLUMN customers_encrypted.deletion_requested_at IS 'Timestamp when deletion request was received';

-- ============================================================================
-- 4. CONSENT AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_audit_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers_encrypted(id) ON DELETE SET NULL,
    
    -- Consent details
    consent_type VARCHAR(50) NOT NULL, -- 'GDPR', 'MARKETING', 'CALL_RECORDING', 'DATA_SHARING'
    granted BOOLEAN NOT NULL,
    
    -- Context
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    ip_source INET,
    user_agent TEXT,
    
    -- Method of consent collection
    collection_method VARCHAR(50), -- 'WEB_FORM', 'PHONE', 'EMAIL', 'API', 'IMPORT'
    collection_point VARCHAR(100), -- 'SIGNUP', 'BOOKING', 'SETTINGS', 'VOICE_CALL'
    
    -- Legal basis
    legal_basis VARCHAR(50), -- 'CONSENT', 'CONTRACT', 'LEGITIMATE_INTEREST', 'LEGAL_OBLIGATION'
    
    -- Verification
    verified_identity BOOLEAN DEFAULT false,
    verification_method VARCHAR(50),
    
    -- Revocation tracking
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID,
    revocation_reason TEXT,
    
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- RLS support
    CONSTRAINT consent_audit_log_type_check CHECK (consent_type IN (
        'GDPR', 'MARKETING', 'CALL_RECORDING', 'DATA_SHARING', 'THIRD_PARTY', 'ANALYTICS'
    ))
);

-- Indexes for consent audit log
CREATE INDEX idx_consent_audit_log_tenant ON consent_audit_log(tenant_id);
CREATE INDEX idx_consent_audit_log_customer ON consent_audit_log(customer_id);
CREATE INDEX idx_consent_audit_log_type ON consent_audit_log(consent_type);
CREATE INDEX idx_consent_audit_log_timestamp ON consent_audit_log(timestamp);
CREATE INDEX idx_consent_audit_log_tenant_type_time ON consent_audit_log(tenant_id, consent_type, timestamp);
CREATE INDEX idx_consent_audit_log_granted ON consent_audit_log(granted);

-- Partial index for active consents (not revoked)
CREATE INDEX idx_consent_audit_log_active ON consent_audit_log(customer_id, consent_type, granted) 
WHERE revoked_at IS NULL AND granted = true;

COMMENT ON TABLE consent_audit_log IS 'Audit trail for all consent changes for GDPR compliance';
COMMENT ON COLUMN consent_audit_log.consent_type IS 'Type of consent being tracked';
COMMENT ON COLUMN consent_audit_log.collection_method IS 'How the consent was obtained';
COMMENT ON COLUMN consent_audit_log.legal_basis IS 'GDPR legal basis for processing';

-- ============================================================================
-- 5. DATA SUBJECT REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Request identification
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    request_type VARCHAR(50) NOT NULL, -- 'ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY', 'RESTRICTION'
    
    -- Requester information
    requester_email VARCHAR(255),
    requester_phone VARCHAR(50),
    customer_id UUID REFERENCES customers_encrypted(id) ON DELETE SET NULL,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'RECEIVED' NOT NULL, -- 'RECEIVED', 'VERIFICATION_PENDING', 'VERIFIED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'
    
    -- Timeline
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    deadline_at TIMESTAMP WITH TIME ZONE, -- 30 days from receipt
    
    -- Identity verification
    verification_method VARCHAR(50),
    verification_documents TEXT[], -- List of documents provided
    identity_verified BOOLEAN DEFAULT false,
    
    -- Processing details
    priority VARCHAR(20) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
    assigned_to UUID,
    
    -- Data export (for access/portability requests)
    export_format VARCHAR(20), -- 'JSON', 'CSV', 'PDF'
    export_url TEXT,
    export_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Deletion details
    deletion_snapshot_created BOOLEAN DEFAULT false,
    deletion_snapshot_url TEXT,
    
    -- Rejection details
    rejection_reason TEXT,
    rejection_basis VARCHAR(100), -- GDPR article allowing rejection
    
    -- Communication
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID,
    
    -- SLA tracking
    sla_met BOOLEAN,
    sla_breach_reason TEXT,
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'EMAIL', -- 'EMAIL', 'WEB_FORM', 'PHONE', 'MAIL'
    notes TEXT,
    metadata JSONB,
    
    -- Constraints
    CONSTRAINT data_subject_requests_type_check CHECK (request_type IN (
        'ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY', 'RESTRICTION', 'OBJECTION'
    )),
    CONSTRAINT data_subject_requests_status_check CHECK (status IN (
        'RECEIVED', 'VERIFICATION_PENDING', 'VERIFIED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'
    )),
    CONSTRAINT data_subject_requests_priority_check CHECK (priority IN (
        'LOW', 'NORMAL', 'HIGH', 'URGENT'
    ))
);

-- Indexes for data subject requests
CREATE INDEX idx_data_subject_requests_tenant ON data_subject_requests(tenant_id);
CREATE INDEX idx_data_subject_requests_customer ON data_subject_requests(customer_id);
CREATE INDEX idx_data_subject_requests_status ON data_subject_requests(status);
CREATE INDEX idx_data_subject_requests_type ON data_subject_requests(request_type);
CREATE INDEX idx_data_subject_requests_received ON data_subject_requests(received_at);
CREATE INDEX idx_data_subject_requests_deadline ON data_subject_requests(deadline_at);
CREATE INDEX idx_data_subject_requests_ticket ON data_subject_requests(ticket_number);
CREATE INDEX idx_data_subject_requests_pending ON data_subject_requests(tenant_id, status) 
WHERE status NOT IN ('COMPLETED', 'REJECTED', 'CANCELLED');

COMMENT ON TABLE data_subject_requests IS 'Tracking table for GDPR data subject requests (Art. 12-22)';
COMMENT ON COLUMN data_subject_requests.ticket_number IS 'Unique identifier for the request (e.g., GDPR-2026-0001)';
COMMENT ON COLUMN data_subject_requests.deadline_at IS 'SLA deadline for request completion (30 days from receipt)';

-- ============================================================================
-- 6. DATA RETENTION EXECUTION LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_retention_execution_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    
    -- Execution details
    execution_type VARCHAR(50) NOT NULL, -- 'AUTOMATED_ANONYMIZATION', 'MANUAL_DELETION', 'RETENTION_POLICY'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Statistics
    customers_anonymized INTEGER DEFAULT 0,
    bookings_anonymized INTEGER DEFAULT 0,
    recordings_deleted INTEGER DEFAULT 0,
    logs_deleted INTEGER DEFAULT 0,
    
    -- Retention parameters
    retention_days_applied INTEGER,
    cutoff_date DATE,
    
    -- Execution status
    status VARCHAR(50) DEFAULT 'RUNNING', -- 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL'
    error_message TEXT,
    
    -- Audit
    executed_by UUID,
    ip_address INET,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT data_retention_execution_log_type_check CHECK (execution_type IN (
        'AUTOMATED_ANONYMIZATION', 'MANUAL_DELETION', 'RETENTION_POLICY', 'GDPR_REQUEST', 'BULK_OPERATION'
    ))
);

CREATE INDEX idx_retention_log_tenant ON data_retention_execution_log(tenant_id);
CREATE INDEX idx_retention_log_type ON data_retention_execution_log(execution_type);
CREATE INDEX idx_retention_log_status ON data_retention_execution_log(status);
CREATE INDEX idx_retention_log_started ON data_retention_execution_log(started_at);

COMMENT ON TABLE data_retention_execution_log IS 'Audit log for all data retention/deletion operations';

-- ============================================================================
-- 7. CALL RECORDINGS TABLE (For voice call retention)
-- ============================================================================

CREATE TABLE IF NOT EXISTS call_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers_encrypted(id) ON DELETE SET NULL,
    
    -- Call details
    call_sid VARCHAR(100) NOT NULL UNIQUE, -- Twilio Call SID
    phone_number VARCHAR(50),
    direction VARCHAR(20), -- 'INBOUND', 'OUTBOUND'
    
    -- Recording details
    recording_url TEXT,
    recording_sid VARCHAR(100),
    duration_seconds INTEGER,
    
    -- Retention
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    retention_until TIMESTAMP WITH TIME ZONE, -- Auto-delete after this date (30 days default)
    deleted_at TIMESTAMP WITH TIME ZONE,
    deletion_reason VARCHAR(50),
    
    -- Consent tracking
    consent_verified BOOLEAN DEFAULT false,
    consent_log_id BIGINT REFERENCES consent_audit_log(id),
    
    -- Metadata
    transcription TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT call_recordings_direction_check CHECK (direction IN ('INBOUND', 'OUTBOUND'))
);

CREATE INDEX idx_call_recordings_tenant ON call_recordings(tenant_id);
CREATE INDEX idx_call_recordings_customer ON call_recordings(customer_id);
CREATE INDEX idx_call_recordings_retention ON call_recordings(retention_until) 
WHERE retention_until IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_call_recordings_recorded ON call_recordings(recorded_at);

COMMENT ON TABLE call_recordings IS 'Call recordings with automatic retention management';
COMMENT ON COLUMN call_recordings.retention_until IS 'Date when recording should be automatically deleted';

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE consent_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
CREATE POLICY tenant_isolation_consent_audit ON consent_audit_log
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation_data_requests ON data_subject_requests
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation_retention_log ON data_retention_execution_log
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE POLICY tenant_isolation_recordings ON call_recordings
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ============================================================================
-- 9. TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_data_subject_requests_updated_at
    BEFORE UPDATE ON data_subject_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set deadline_at automatically (30 days from received_at)
CREATE OR REPLACE FUNCTION set_request_deadline()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deadline_at IS NULL THEN
        NEW.deadline_at = NEW.received_at + INTERVAL '30 days';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_data_request_deadline
    BEFORE INSERT ON data_subject_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_request_deadline();

-- Trigger to set retention_until for call recordings (30 days default)
CREATE OR REPLACE FUNCTION set_recording_retention()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.retention_until IS NULL THEN
        NEW.retention_until = NEW.recorded_at + INTERVAL '30 days';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_call_recording_retention
    BEFORE INSERT ON call_recordings
    FOR EACH ROW
    EXECUTE FUNCTION set_recording_retention();

-- ============================================================================
-- 10. VIEWS FOR COMPLIANCE REPORTING
-- ============================================================================

-- View: Pending data subject requests
CREATE OR REPLACE VIEW pending_data_subject_requests AS
SELECT 
    dsr.*,
    EXTRACT(DAY FROM (dsr.deadline_at - NOW())) as days_until_deadline,
    CASE 
        WHEN dsr.deadline_at < NOW() THEN 'OVERDUE'
        WHEN dsr.deadline_at < NOW() + INTERVAL '7 days' THEN 'URGENT'
        ELSE 'NORMAL'
    END as sla_status
FROM data_subject_requests dsr
WHERE dsr.status NOT IN ('COMPLETED', 'REJECTED', 'CANCELLED');

-- View: Consent status summary per customer
CREATE OR REPLACE VIEW customer_consent_summary AS
SELECT 
    c.id as customer_id,
    c.tenant_id,
    c.gdpr_consent,
    c.gdpr_consent_date,
    c.marketing_consent,
    c.marketing_consent_date,
    c.call_recording_consent,
    (SELECT COUNT(*) FROM consent_audit_log cal 
     WHERE cal.customer_id = c.id AND cal.consent_type = 'GDPR' AND cal.granted = true) as gdpr_consent_count,
    (SELECT COUNT(*) FROM consent_audit_log cal 
     WHERE cal.customer_id = c.id AND cal.consent_type = 'GDPR' AND cal.revoked_at IS NOT NULL) as gdpr_revocation_count,
    (SELECT MAX(timestamp) FROM consent_audit_log cal 
     WHERE cal.customer_id = c.id) as last_consent_change
FROM customers_encrypted c
WHERE c.is_deleted = false OR c.is_deleted IS NULL;

-- View: Data retention status
CREATE OR REPLACE VIEW data_retention_status AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.data_retention_days,
    (SELECT COUNT(*) FROM customers_encrypted c 
     WHERE c.tenant_id = t.id 
     AND (c.is_deleted = false OR c.is_deleted IS NULL)
     AND c.anonymized_at IS NULL) as active_customers,
    (SELECT COUNT(*) FROM customers_encrypted c 
     WHERE c.tenant_id = t.id 
     AND c.anonymized_at IS NOT NULL) as anonymized_customers,
    (SELECT COUNT(*) FROM call_recordings cr 
     WHERE cr.tenant_id = t.id 
     AND cr.deleted_at IS NULL
     AND cr.retention_until < NOW()) as expired_recordings,
    (SELECT COUNT(*) FROM data_subject_requests dsr 
     WHERE dsr.tenant_id = t.id 
     AND dsr.status NOT IN ('COMPLETED', 'REJECTED', 'CANCELLED')) as pending_requests
FROM tenants t;

-- ============================================================================
-- 11. STORED PROCEDURES FOR GDPR OPERATIONS
-- ============================================================================

-- Procedure: Anonymize customer data (Art. 17 - Right to Erasure)
CREATE OR REPLACE FUNCTION anonymize_customer(
    p_customer_id UUID,
    p_request_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT 'GDPR deletion request'
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    anonymized_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_tenant_id UUID;
    v_anonymized_at TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Get tenant_id
    SELECT tenant_id INTO v_tenant_id FROM customers_encrypted WHERE id = p_customer_id;
    
    IF v_tenant_id IS NULL THEN
        RETURN QUERY SELECT false, 'Customer not found'::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    -- Update customer record with anonymized data
    UPDATE customers_encrypted
    SET 
        phone_encrypted = '\x44454C45544544'::bytea, -- 'DELETED' encrypted
        email_encrypted = '\x44454C45544544'::bytea,
        name_encrypted = '\x44454C45544544'::bytea,
        gdpr_consent = false,
        marketing_consent = false,
        call_recording_consent = false,
        is_deleted = true,
        deleted_at = v_anonymized_at,
        anonymized_at = v_anonymized_at,
        data_subject_request_id = p_request_id,
        data_retention_days = 0
    WHERE id = p_customer_id;

    -- Log the retention execution
    INSERT INTO data_retention_execution_log (
        tenant_id, execution_type, status, customers_anonymized, executed_by, completed_at
    ) VALUES (
        v_tenant_id, 'GDPR_REQUEST', 'COMPLETED', 1, p_request_id, v_anonymized_at
    );

    RETURN QUERY SELECT true, 'Customer anonymized successfully'::TEXT, v_anonymized_at;
END;
$$ LANGUAGE plpgsql;

-- Procedure: Get expired recordings for deletion
CREATE OR REPLACE FUNCTION get_expired_recordings(
    p_batch_size INTEGER DEFAULT 100
)
RETURNS TABLE (
    recording_id UUID,
    tenant_id UUID,
    recording_url TEXT,
    retention_until TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.id as recording_id,
        cr.tenant_id,
        cr.recording_url,
        cr.retention_until
    FROM call_recordings cr
    WHERE cr.retention_until < NOW()
      AND cr.deleted_at IS NULL
    LIMIT p_batch_size;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. GRANTS
-- ============================================================================

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON consent_audit_log TO app_user;
GRANT SELECT, INSERT, UPDATE ON data_subject_requests TO app_user;
GRANT SELECT, INSERT ON data_retention_execution_log TO app_user;
GRANT SELECT, INSERT, UPDATE ON call_recordings TO app_user;
GRANT USAGE, SELECT ON SEQUENCE consent_audit_log_id_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE data_retention_execution_log_id_seq TO app_user;

-- ============================================================================
-- Migration Complete
-- ============================================================================
