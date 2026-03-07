# EU Database Schema for Nexo MechMind OS

> **Document Version**: 1.0.0  
> **Last Updated**: 2026-03-06  
> **Classification**: Technical Database Design  
> **Owner**: Data Architecture Team  
> **Status**: DRAFT

---

## Executive Summary

This document defines the database schema extensions required for EU compliance in Nexo MechMind OS. The schema additions support:

- **TecDoc parts catalog caching** - European automotive parts standardization
- **Digital Product Passport (DPP)** - ESPR regulation blockchain records
- **EU AI Act compliance** - Audit logs and governance tables
- **E-invoicing** - Country-specific invoice storage and tracking
- **Multi-language content** - 24 EU languages support

---

## 1. Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              EU DATABASE SCHEMA OVERVIEW                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           EXISTING TABLES (Multi-tenant)                             │   │
│  │  • tenants, users, customers, vehicles, bookings, services                          │   │
│  │  • parts, suppliers, inventory_items, purchase_orders                               │   │
│  │  • inspections, obd_devices, obd_readings                                           │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                                    │
│                                         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           NEW EU COMPLIANCE TABLES                                   │   │
│  │                                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │  TECDOC TABLES (Parts Catalog Cache)                                         │    │   │
│  │  │  • tecdoc_articles          • tecdoc_vehicles                               │    │   │
│  │  │  • tecdoc_brands            • tecdoc_assembly_groups                        │    │   │
│  │  │  • tecdoc_cross_references  • tecdoc_prices                                 │    │   │
│  │  │  • tecdoc_criteria          • tecdoc_documents                              │    │   │
│  │  └─────────────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │  DPP TABLES (Digital Product Passport)                                       │    │   │
│  │  │  • dpp_products             • dpp_sustainability_records                    │    │   │
│  │  │  • dpp_blockchain_hashes    • dpp_supply_chain_events                       │    │   │
│  │  │  • dpp_repair_information   • dpp_carbon_footprints                         │    │   │
│  │  │  • dpp_certifications       • dpp_circularity_data                          │    │   │
│  │  └─────────────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │  AI ACT TABLES (Compliance & Governance)                                     │    │   │
│  │  │  • ai_systems               • ai_audit_logs                                 │    │   │
│  │  │  • ai_decisions             • ai_model_versions                             │    │   │
│  │  │  • ai_training_data         • ai_bias_metrics                               │    │   │
│  │  │  • ai_risk_assessments      • ai_human_oversight                            │    │   │
│  │  └─────────────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │  E-INVOICING TABLES (Country-Specific)                                       │    │   │
│  │  │  • einvoice_submissions     • einvoice_status_history                       │    │   │
│  │  │  • einvoice_xml_archive     • einvoice_signatures                           │    │   │
│  │  │  • einvoice_errors          • einvoice_notifications                        │    │   │
│  │  └─────────────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │  I18N TABLES (Multi-language Support)                                        │    │   │
│  │  │  • i18n_translations        • i18n_locales                                  │    │   │
│  │  │  • i18n_service_descriptions • i18n_templates                               │    │   │
│  │  │  • i18n_document_templates  • i18n_email_templates                          │    │   │
│  │  └─────────────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │  COMPLIANCE TABLES (GDPR/ESPR/ISO)                                           │    │   │
│  │  │  • gdpr_consent_records     • gdpr_data_retention                           │    │   │
│  │  │  • compliance_certificates  • audit_trail                                   │    │   │
│  │  │  • data_processing_records  • data_subject_requests                         │    │   │
│  │  └─────────────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. TecDoc Tables

### 2.1 tecdoc_articles

```sql
-- Main TecDoc articles cache
CREATE TABLE tecdoc_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- TecDoc Identifiers
    tecdoc_article_id BIGINT NOT NULL,
    article_number VARCHAR(50) NOT NULL,
    brand_id INTEGER NOT NULL,
    brand_name VARCHAR(100) NOT NULL,
    
    -- Generic Article Info
    generic_article_id INTEGER,
    generic_article_name VARCHAR(200),
    generic_article_description TEXT,
    assembly_group_name VARCHAR(200),
    
    -- Product Info
    article_name VARCHAR(500),
    article_description TEXT,
    packing_unit INTEGER,
    quantity_per_packing_unit DECIMAL(10,2),
    
    -- Physical Attributes
    weight_kg DECIMAL(8,3),
    length_mm INTEGER,
    width_mm INTEGER,
    height_mm INTEGER,
    
    -- Status
    is_valid BOOLEAN DEFAULT true,
    valid_from DATE,
    valid_to DATE,
    
    -- Metadata
    data_quality_rating INTEGER CHECK (data_quality_rating BETWEEN 1 AND 5),
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(tecdoc_article_id),
    UNIQUE(article_number, brand_id)
);

-- Indexes
CREATE INDEX idx_tecdoc_articles_number ON tecdoc_articles(article_number);
CREATE INDEX idx_tecdoc_articles_brand ON tecdoc_articles(brand_id);
CREATE INDEX idx_tecdoc_articles_generic ON tecdoc_articles(generic_article_id);
CREATE INDEX idx_tecdoc_articles_valid ON tecdoc_articles(is_valid, valid_from, valid_to);
CREATE INDEX idx_tecdoc_articles_search ON tecdoc_articles USING gin(to_tsvector('simple', article_name || ' ' || COALESCE(article_description, '')));
```

### 2.2 tecdoc_vehicles

```sql
-- Vehicle database from TecDoc
CREATE TABLE tecdoc_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- TecDoc Vehicle Identifiers
    tecdoc_vehicle_id BIGINT NOT NULL,
    linkage_target_id BIGINT NOT NULL,
    linkage_target_type VARCHAR(1) NOT NULL CHECK (linkage_target_type IN ('P', 'O')),
    
    -- Vehicle Identification
    manufacturer_id INTEGER NOT NULL,
    manufacturer_name VARCHAR(100) NOT NULL,
    model_id INTEGER NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    
    -- Vehicle Details
    type_name VARCHAR(200),
    year_of_construction_from INTEGER,
    year_of_construction_to INTEGER,
    month_of_construction_from INTEGER,
    month_of_construction_to INTEGER,
    
    -- Technical Data (JSON for flexibility)
    engine_codes JSONB,
    engine_capacity_cc INTEGER,
    power_kw INTEGER,
    power_hp INTEGER,
    fuel_type VARCHAR(50),
    drive_type VARCHAR(20),
    
    -- KBA/German Registration
    kba_numbers JSONB,
    hsn VARCHAR(4),
    tsn VARCHAR(3),
    
    -- Body & Platform
    body_type VARCHAR(50),
    number_of_doors INTEGER,
    platform VARCHAR(50),
    
    -- Metadata
    is_valid BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tecdoc_vehicle_id)
);

-- Indexes
CREATE INDEX idx_tecdoc_vehicles_manufacturer ON tecdoc_vehicles(manufacturer_id);
CREATE INDEX idx_tecdoc_vehicles_model ON tecdoc_vehicles(model_id);
CREATE INDEX idx_tecdoc_vehicles_year ON tecdoc_vehicles(year_of_construction_from, year_of_construction_to);
CREATE INDEX idx_tecdoc_vehicles_kba ON tecdoc_vehicles USING gin(kba_numbers);
CREATE INDEX idx_tecdoc_vehicles_engine ON tecdoc_vehicles USING gin(engine_codes);
```

### 2.3 tecdoc_cross_references

```sql
-- OE to aftermarket cross-references
CREATE TABLE tecdoc_cross_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source Article
    source_article_id BIGINT NOT NULL REFERENCES tecdoc_articles(tecdoc_article_id),
    source_article_number VARCHAR(50) NOT NULL,
    source_brand_id INTEGER NOT NULL,
    source_brand_name VARCHAR(100) NOT NULL,
    
    -- Target Article
    target_article_id BIGINT REFERENCES tecdoc_articles(tecdoc_article_id),
    target_article_number VARCHAR(50) NOT NULL,
    target_brand_id INTEGER NOT NULL,
    target_brand_name VARCHAR(100) NOT NULL,
    
    -- Reference Type
    reference_type VARCHAR(20) NOT NULL CHECK (reference_type IN ('OE', 'AFTERMARKET', 'COMPARABLE', 'REPLACEMENT')),
    quality_grade VARCHAR(10),
    
    -- Sorting and Filtering
    sort_order INTEGER DEFAULT 0,
    is_oem_reference BOOLEAN DEFAULT false,
    
    -- Metadata
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(source_article_id, target_article_number, target_brand_id)
);

-- Indexes
CREATE INDEX idx_tecdoc_xref_source ON tecdoc_cross_references(source_article_id);
CREATE INDEX idx_tecdoc_xref_target ON tecdoc_cross_references(target_article_number, target_brand_id);
CREATE INDEX idx_tecdoc_xref_type ON tecdoc_cross_references(reference_type);
```

### 2.4 tecdoc_prices

```sql
-- Cached pricing from TecDoc and distributors
CREATE TABLE tecdoc_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Article Reference
    article_id BIGINT NOT NULL REFERENCES tecdoc_articles(tecdoc_article_id),
    
    -- Source
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('TECDOC', 'DISTRIBUTOR', 'SUPPLIER')),
    source_id VARCHAR(50),
    source_name VARCHAR(100),
    
    -- Pricing
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    net_price DECIMAL(12,4) NOT NULL,
    gross_price DECIMAL(12,4),
    vat_rate DECIMAL(5,2) DEFAULT 22.00,
    
    -- Quantity Breaks
    min_quantity INTEGER DEFAULT 1,
    price_valid_from DATE,
    price_valid_to DATE,
    
    -- Availability
    stock_quantity INTEGER,
    stock_status VARCHAR(20),
    estimated_delivery_days INTEGER,
    
    -- Metadata
    is_preferred BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(article_id, source_type, source_id)
);

-- Indexes
CREATE INDEX idx_tecdoc_prices_article ON tecdoc_prices(article_id);
CREATE INDEX idx_tecdoc_prices_source ON tecdoc_prices(source_type, source_id);
CREATE INDEX idx_tecdoc_prices_valid ON tecdoc_prices(price_valid_from, price_valid_to);
```

---

## 3. Digital Product Passport (DPP) Tables

### 3.1 dpp_products

```sql
-- Main DPP product registry
CREATE TABLE dpp_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Product Identification
    product_identifier VARCHAR(255) NOT NULL UNIQUE,
    gtn VARCHAR(14),
    sku VARCHAR(100),
    
    -- TecDoc Linkage
    tecdoc_article_id BIGINT REFERENCES tecdoc_articles(tecdoc_article_id),
    oe_numbers JSONB,
    
    -- Product Category (ESPR classification)
    espr_category VARCHAR(100),
    product_group VARCHAR(100),
    
    -- DPP Status
    dpp_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (dpp_status IN ('DRAFT', 'PUBLISHED', 'UPDATED', 'DEPRECATED')),
    
    -- Blockchain Reference
    blockchain_network VARCHAR(50) DEFAULT 'HYPERLEDGER_FABRIC',
    blockchain_transaction_hash VARCHAR(128),
    blockchain_block_number BIGINT,
    blockchain_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- QR Code / Data Matrix
    qr_code_data VARCHAR(500),
    gs1_digital_link VARCHAR(500),
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Data Integrity
    data_hash VARCHAR(64) NOT NULL,
    schema_version VARCHAR(10) DEFAULT '1.0'
);

-- Indexes
CREATE INDEX idx_dpp_products_identifier ON dpp_products(product_identifier);
CREATE INDEX idx_dpp_products_tecdoc ON dpp_products(tecdoc_article_id);
CREATE INDEX idx_dpp_products_status ON dpp_products(dpp_status);
CREATE INDEX idx_dpp_products_blockchain ON dpp_products(blockchain_transaction_hash);
```

### 3.2 dpp_sustainability_records

```sql
-- Sustainability data for DPP (ESPR compliance)
CREATE TABLE dpp_sustainability_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to Product
    product_id UUID NOT NULL REFERENCES dpp_products(id) ON DELETE CASCADE,
    
    -- Carbon Footprint
    carbon_footprint_kg_co2e DECIMAL(12,4),
    carbon_footprint_methodology VARCHAR(100),
    carbon_footprint_verified_by VARCHAR(200),
    carbon_footprint_verification_date DATE,
    
    -- Material Composition
    materials JSONB NOT NULL, -- [{"material": "Steel", "percentage": 80, "recycled": true}]
    hazardous_substances JSONB, -- ESPR regulated substances
    
    -- Circularity
    recycled_content_percentage DECIMAL(5,2),
    recyclable BOOLEAN,
    recyclability_rate DECIMAL(5,2),
    
    -- Durability
    expected_lifetime_years INTEGER,
    warranty_period_months INTEGER,
    
    -- Metadata
    data_source VARCHAR(100),
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(product_id)
);

-- Indexes
CREATE INDEX idx_dpp_sustainability_product ON dpp_sustainability_records(product_id);
```

### 3.3 dpp_blockchain_hashes

```sql
-- Immutable blockchain anchoring records
CREATE TABLE dpp_blockchain_hashes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to Product
    product_id UUID NOT NULL REFERENCES dpp_products(id) ON DELETE CASCADE,
    
    -- Record Type
    record_type VARCHAR(50) NOT NULL, -- 'PRODUCT_CREATED', 'SUSTAINABILITY_UPDATED', etc.
    
    -- Content Hash
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 of the JSON-LD DPP content
    previous_hash VARCHAR(64), -- For chain verification
    
    -- Blockchain Details
    blockchain_network VARCHAR(50) NOT NULL,
    transaction_hash VARCHAR(128) NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    smart_contract_address VARCHAR(42),
    
    -- Off-chain Storage
    ipfs_hash VARCHAR(128), -- IPFS CID for document storage
    storage_uri VARCHAR(500),
    
    -- Verification
    merkle_root VARCHAR(64),
    signature VARCHAR(256),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(product_id, record_type, block_number)
);

-- Indexes
CREATE INDEX idx_dpp_blockchain_product ON dpp_blockchain_hashes(product_id);
CREATE INDEX idx_dpp_blockchain_tx ON dpp_blockchain_hashes(transaction_hash);
CREATE INDEX idx_dpp_blockchain_hash ON dpp_blockchain_hashes(content_hash);
```

### 3.4 dpp_supply_chain_events

```sql
-- Supply chain events for DPP traceability
CREATE TABLE dpp_supply_chain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to Product
    product_id UUID NOT NULL REFERENCES dpp_products(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type VARCHAR(50) NOT NULL, -- 'MANUFACTURED', 'SHIPPED', 'RECEIVED', 'INSTALLED', 'RECYCLED'
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Location
    location_name VARCHAR(200),
    location_country VARCHAR(2),
    location_gps_lat DECIMAL(10,8),
    location_gps_lon DECIMAL(11,8),
    
    -- Actor
    actor_type VARCHAR(50), -- 'MANUFACTURER', 'DISTRIBUTOR', 'WORKSHOP', 'RECYCLER'
    actor_name VARCHAR(200),
    actor_identifier VARCHAR(100),
    
    -- Transaction Details
    transaction_reference VARCHAR(100),
    quantity INTEGER,
    batch_number VARCHAR(100),
    
    -- Documentation
    document_references JSONB, -- Links to certificates, invoices, etc.
    
    -- Blockchain
    blockchain_transaction_hash VARCHAR(128),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dpp_supply_chain_product ON dpp_supply_chain_events(product_id);
CREATE INDEX idx_dpp_supply_chain_event ON dpp_supply_chain_events(event_type, event_timestamp);
```

---

## 4. EU AI Act Tables

### 4.1 ai_systems

```sql
-- Registry of all AI systems in the platform
CREATE TABLE ai_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- System Identification
    system_id VARCHAR(100) NOT NULL UNIQUE,
    system_name VARCHAR(200) NOT NULL,
    system_version VARCHAR(50) NOT NULL,
    system_description TEXT NOT NULL,
    
    -- EU AI Act Classification
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('MINIMAL', 'LIMITED', 'HIGH', 'UNACCEPTABLE')),
    risk_classification_reason TEXT,
    annex_iii_area VARCHAR(100), -- e.g., 'CRITICAL_INFRASTRUCTURE', 'EDUCATION', etc.
    
    -- Purpose and Context
    intended_purpose TEXT NOT NULL,
    expected_output TEXT,
    domain VARCHAR(100) NOT NULL DEFAULT 'automotive',
    
    -- Deployment
    deployment_status VARCHAR(20) NOT NULL DEFAULT 'DEVELOPMENT' CHECK (deployment_status IN ('DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION', 'RETIRED')),
    deployment_date DATE,
    
    -- Governance
    owner_team VARCHAR(100) NOT NULL,
    technical_contact UUID REFERENCES users(id),
    compliance_contact UUID REFERENCES users(id),
    
    -- CE Marking
    ce_marked BOOLEAN DEFAULT false,
    ce_marking_date DATE,
    notified_body VARCHAR(200),
    conformity_assessment_report_url VARCHAR(500),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(system_id, system_version)
);

-- Indexes
CREATE INDEX idx_ai_systems_risk ON ai_systems(risk_level);
CREATE INDEX idx_ai_systems_status ON ai_systems(deployment_status);
```

### 4.2 ai_audit_logs

```sql
-- Immutable audit logs for AI Act Article 12
CREATE TABLE ai_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- System Reference
    system_id VARCHAR(100) NOT NULL REFERENCES ai_systems(system_id),
    system_version VARCHAR(50) NOT NULL,
    
    -- Event Details
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('DECISION', 'OVERRIDE', 'INCIDENT', 'MAINTENANCE', 'DEPLOYMENT', 'UPDATE')),
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Input/Output (encrypted for privacy)
    input_data_encrypted BYTEA,
    output_data_encrypted BYTEA,
    input_hash VARCHAR(64), -- For integrity verification
    output_hash VARCHAR(64),
    
    -- Decision Details
    confidence_score DECIMAL(5,4),
    prediction_value VARCHAR(255),
    alternative_predictions JSONB,
    
    -- Feature Importance (for explainability)
    feature_importance JSONB, -- [{"feature": "age", "importance": 0.34}]
    
    -- Governance
    risk_level_at_time VARCHAR(20),
    human_oversight_applied BOOLEAN DEFAULT false,
    human_reviewer_id UUID REFERENCES users(id),
    override_reason TEXT,
    
    -- Context
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100),
    ip_address INET,
    
    -- Retention (6 years minimum per AI Act)
    retention_until DATE NOT NULL,
    
    -- Integrity
    log_hash VARCHAR(64) NOT NULL,
    previous_log_hash VARCHAR(64),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (event_timestamp);

-- Create partitions for monthly retention management
CREATE TABLE ai_audit_logs_2026_01 PARTITION OF ai_audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE ai_audit_logs_2026_02 PARTITION OF ai_audit_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- Continue for all months...

-- Indexes
CREATE INDEX idx_ai_audit_system ON ai_audit_logs(system_id, event_timestamp);
CREATE INDEX idx_ai_audit_event ON ai_audit_logs(event_type, event_timestamp);
CREATE INDEX idx_ai_audit_tenant ON ai_audit_logs(tenant_id);
CREATE INDEX idx_ai_audit_retention ON ai_audit_logs(retention_until);
```

### 4.3 ai_model_versions

```sql
-- Model versioning and lineage for AI Act
CREATE TABLE ai_model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- System Reference
    system_id VARCHAR(100) NOT NULL REFERENCES ai_systems(system_id),
    
    -- Version Details
    model_version VARCHAR(50) NOT NULL,
    model_name VARCHAR(200),
    model_type VARCHAR(50), -- 'RANDOM_FOREST', 'NEURAL_NETWORK', 'LLM', etc.
    
    -- Model Storage
    model_artifact_url VARCHAR(500),
    model_hash VARCHAR(64) NOT NULL, -- SHA-256 of model binary
    model_size_bytes BIGINT,
    
    -- Training Info
    training_data_start_date DATE,
    training_data_end_date DATE,
    training_data_size INTEGER,
    training_duration_hours DECIMAL(8,2),
    training_metrics JSONB,
    
    -- Performance
    accuracy DECIMAL(5,4),
    precision DECIMAL(5,4),
    recall DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    
    -- Validation
    validation_results JSONB,
    bias_audit_results JSONB,
    
    -- Deployment
    deployed_at TIMESTAMP WITH TIME ZONE,
    deployed_by UUID REFERENCES users(id),
    deployment_environment VARCHAR(20),
    rollback_available BOOLEAN DEFAULT true,
    
    -- Status
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'VALIDATED', 'APPROVED', 'DEPLOYED', 'DEPRECATED', 'ROLLED_BACK')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(system_id, model_version)
);

-- Indexes
CREATE INDEX idx_ai_model_system ON ai_model_versions(system_id);
CREATE INDEX idx_ai_model_status ON ai_model_versions(status);
```

### 4.4 ai_bias_metrics

```sql
-- Bias detection results for AI Act Article 10
CREATE TABLE ai_bias_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Model Reference
    model_id UUID NOT NULL REFERENCES ai_model_versions(id),
    
    -- Evaluation Details
    evaluation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    evaluation_dataset VARCHAR(200),
    sample_size INTEGER,
    
    -- Fairness Metrics
    demographic_parity_difference DECIMAL(5,4),
    equalized_odds_difference DECIMAL(5,4),
    disparate_impact_ratio DECIMAL(5,4),
    
    -- Detailed Metrics by Group
    metrics_by_group JSONB, -- {"gender": {"male": {"tpr": 0.85}, "female": {"tpr": 0.82}}}
    
    -- Sensitive Attributes Tested
    sensitive_attributes JSONB, -- ["gender", "age_group", "region"]
    
    -- Thresholds and Compliance
    fairness_threshold DECIMAL(5,4) DEFAULT 0.05,
    is_compliant BOOLEAN GENERATED ALWAYS AS (
        demographic_parity_difference <= fairness_threshold AND
        equalized_odds_difference <= fairness_threshold AND
        disparate_impact_ratio BETWEEN 0.8 AND 1.25
    ) STORED,
    
    -- Remediation
    remediation_actions TEXT,
    retest_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_bias_model ON ai_bias_metrics(model_id);
CREATE INDEX idx_ai_bias_compliant ON ai_bias_metrics(is_compliant);
```

---

## 5. E-Invoicing Tables

### 5.1 einvoice_submissions

```sql
-- Master table for all e-invoice submissions
CREATE TABLE einvoice_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Invoice Reference
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Country/Gateway
    country_code VARCHAR(2) NOT NULL,
    gateway_type VARCHAR(50) NOT NULL, -- 'SDI', 'CHORUS_PRO', 'ZRE', 'OZG', 'PEPPOL'
    
    -- Submission Details
    submission_id VARCHAR(100), -- External ID from gateway
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submission_status VARCHAR(20) DEFAULT 'PENDING' CHECK (submission_status IN ('PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'DELIVERED', 'PAID')),
    
    -- Format
    format_type VARCHAR(20) NOT NULL, -- 'FATTURAPA', 'FACTURX', 'XRECHNUNG', 'PEPPOL_BIS3'
    format_version VARCHAR(20),
    
    -- XML Content
    xml_content_encrypted BYTEA, -- Encrypted storage
    xml_hash VARCHAR(64), -- For integrity
    
    -- Signature
    signature_type VARCHAR(20), -- 'XADES', 'CADES', 'XML_DSIG'
    signature_valid BOOLEAN,
    signature_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Recipient
    recipient_vat VARCHAR(20),
    recipient_sdi_code VARCHAR(7),
    recipient_pec VARCHAR(255),
    
    -- Totals
    invoice_total DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_einvoice_invoice ON einvoice_submissions(invoice_id);
CREATE INDEX idx_einvoice_country ON einvoice_submissions(country_code);
CREATE INDEX idx_einvoice_status ON einvoice_submissions(submission_status);
CREATE INDEX idx_einvoice_submission ON einvoice_submissions(submission_id);
```

### 5.2 einvoice_status_history

```sql
-- Status change tracking for e-invoices
CREATE TABLE einvoice_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    submission_id UUID NOT NULL REFERENCES einvoice_submissions(id) ON DELETE CASCADE,
    
    -- Status Change
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    status_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Source
    notification_source VARCHAR(50), -- 'GATEWAY', 'MANUAL', 'SYSTEM'
    external_reference VARCHAR(100),
    
    -- Details
    status_message TEXT,
    error_code VARCHAR(50),
    error_description TEXT,
    
    -- Raw Notification (for debugging)
    raw_notification_encrypted BYTEA,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_einvoice_history_submission ON einvoice_status_history(submission_id);
CREATE INDEX idx_einvoice_history_date ON einvoice_status_history(status_date);
```

### 5.3 einvoice_xml_archive

```sql
-- Long-term archive of e-invoice XMLs (compliance requirement)
CREATE TABLE einvoice_xml_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    submission_id UUID NOT NULL REFERENCES einvoice_submissions(id),
    
    -- Archive Details
    archive_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    retention_until DATE NOT NULL, -- 10+ years for tax compliance
    
    -- Storage
    storage_type VARCHAR(20) NOT NULL, -- 'S3', 'GLACIER', 'TAPE'
    storage_location VARCHAR(500),
    storage_bucket VARCHAR(100),
    storage_key VARCHAR(500),
    
    -- Integrity
    content_hash VARCHAR(64) NOT NULL,
    encryption_key_id VARCHAR(100),
    
    -- Access
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_einvoice_archive_retention ON einvoice_xml_archive(retention_until);
```

---

## 6. Multi-Language (i18n) Tables

### 6.1 i18n_translations

```sql
-- Core translations table for 24 EU languages
CREATE TABLE i18n_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Key
    namespace VARCHAR(50) NOT NULL, -- 'common', 'booking', 'invoicing', etc.
    key VARCHAR(200) NOT NULL,
    
    -- Locale
    locale VARCHAR(5) NOT NULL, -- 'en', 'de', 'fr', 'it', etc.
    
    -- Content
    value TEXT NOT NULL,
    value_html TEXT, -- For rich text content
    
    -- Metadata
    description TEXT, -- Context for translators
    plural_form VARCHAR(20), -- 'zero', 'one', 'two', 'few', 'many', 'other'
    
    -- Status
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'REVIEW', 'APPROVED', 'DEPRECATED')),
    
    -- Versioning
    version INTEGER DEFAULT 1,
    previous_version UUID REFERENCES i18n_translations(id),
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(namespace, key, locale)
);

-- Indexes
CREATE INDEX idx_i18n_key ON i18n_translations(namespace, key);
CREATE INDEX idx_i18n_locale ON i18n_translations(locale);
CREATE INDEX idx_i18n_status ON i18n_translations(status);

-- Partial index for approved translations (performance)
CREATE INDEX idx_i18n_approved ON i18n_translations(namespace, key, locale) 
    WHERE status = 'APPROVED';
```

### 6.2 i18n_service_descriptions

```sql
-- Localized service descriptions for workshops
CREATE TABLE i18n_service_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference
    service_id UUID NOT NULL REFERENCES services(id),
    locale VARCHAR(5) NOT NULL,
    
    -- Content
    name VARCHAR(200) NOT NULL,
    short_description TEXT,
    full_description TEXT,
    customer_instructions TEXT,
    
    -- TecRMI Mapping
    tecrmi_operation_code VARCHAR(50),
    labor_time_minutes INTEGER,
    
    -- SEO
    meta_title VARCHAR(70),
    meta_description VARCHAR(160),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(service_id, locale)
);

-- Indexes
CREATE INDEX idx_i18n_service_service ON i18n_service_descriptions(service_id);
CREATE INDEX idx_i18n_service_locale ON i18n_service_descriptions(locale);
```

---

## 7. GDPR & Compliance Tables

### 7.1 gdpr_consent_records

```sql
-- Granular consent tracking for GDPR
CREATE TABLE gdpr_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Subject
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    customer_id UUID REFERENCES customers(id),
    user_id UUID REFERENCES users(id),
    
    -- Consent Type
    consent_type VARCHAR(50) NOT NULL, -- 'MARKETING', 'AI_PROCESSING', 'DATA_SHARING', 'ANALYTICS'
    consent_scope TEXT NOT NULL, -- Description of what is consented
    
    -- Consent Details
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    -- Context
    consent_method VARCHAR(20), -- 'CLICK', 'FORM', 'VERBAL', 'WRITTEN'
    ip_address INET,
    user_agent TEXT,
    
    -- Legal Basis
    legal_basis VARCHAR(20) NOT NULL, -- 'CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'LEGITIMATE_INTEREST'
    lawful_basis_description TEXT,
    
    -- Record Keeping
    consent_form_version VARCHAR(20),
    privacy_policy_version VARCHAR(20),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_gdpr_consent_customer ON gdpr_consent_records(customer_id);
CREATE INDEX idx_gdpr_consent_type ON gdpr_consent_records(consent_type);
CREATE INDEX idx_gdpr_consent_granted ON gdpr_consent_records(granted, granted_at);
```

### 7.2 data_subject_requests

```sql
-- GDPR Data Subject Access Requests (DSAR)
CREATE TABLE data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Subject
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    customer_id UUID REFERENCES customers(id),
    email VARCHAR(255) NOT NULL,
    
    -- Request Details
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'RESTRICTION', 'OBJECTION')),
    request_description TEXT,
    
    -- Status Tracking
    status VARCHAR(20) DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'VALIDATING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED')),
    
    -- Timeline
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE NOT NULL, -- 30 days from received
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Identity Verification
    identity_verified BOOLEAN DEFAULT false,
    identity_verification_method VARCHAR(50),
    
    -- Response
    response_method VARCHAR(20), -- 'EMAIL', 'PORTAL', 'POST'
    response_data_encrypted BYTEA,
    
    -- Audit
    handled_by UUID REFERENCES users(id),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dsar_customer ON data_subject_requests(customer_id);
CREATE INDEX idx_dsar_status ON data_subject_requests(status);
CREATE INDEX idx_dsar_due ON data_subject_requests(due_date);
```

### 7.3 compliance_certificates

```sql
-- ISO and regulatory certifications
CREATE TABLE compliance_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Certificate Details
    certificate_type VARCHAR(50) NOT NULL, -- 'ISO27001', 'ISO42001', 'SOC2', 'GDPR_SEAL'
    certificate_number VARCHAR(100) NOT NULL,
    issuing_body VARCHAR(200) NOT NULL,
    
    -- Scope
    scope_description TEXT NOT NULL,
    scope_systems TEXT[],
    
    -- Validity
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'RENEWAL_PENDING')),
    
    -- Documentation
    certificate_document_url VARCHAR(500),
    audit_report_url VARCHAR(500),
    
    -- Reminders
    renewal_reminder_sent BOOLEAN DEFAULT false,
    renewal_reminder_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cert_type ON compliance_certificates(certificate_type);
CREATE INDEX idx_cert_expiry ON compliance_certificates(expiry_date);
```

---

## 8. Row-Level Security (RLS) Policies

```sql
-- Enable RLS on all EU tables
ALTER TABLE tecdoc_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tecdoc_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpp_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE einvoice_submissions ENABLE ROW LEVEL SECURITY;

-- TecDoc articles - readable by all tenants (shared catalog)
CREATE POLICY tecdoc_articles_read_all ON tecdoc_articles
    FOR SELECT USING (true);

-- DPP products - tenant isolation
CREATE POLICY dpp_products_tenant_isolation ON dpp_products
    FOR ALL USING (
        created_by IN (
            SELECT id FROM users WHERE tenant_id = current_setting('app.current_tenant')::UUID
        )
    );

-- AI audit logs - tenant isolation with admin override
CREATE POLICY ai_audit_logs_tenant_isolation ON ai_audit_logs
    FOR SELECT USING (
        tenant_id = current_setting('app.current_tenant')::UUID
        OR current_user = 'admin'
    );

-- E-invoice submissions - tenant isolation
CREATE POLICY einvoice_tenant_isolation ON einvoice_submissions
    FOR ALL USING (
        tenant_id = current_setting('app.current_tenant')::UUID
    );
```

---

## 9. Prisma Schema Additions

```prisma
// schema.prisma additions for EU compliance

// ==========================================
// TECDOC MODELS
// ==========================================

model TecDocArticle {
  id                    String   @id @default(uuid())
  tecdocArticleId       BigInt   @unique @map("tecdoc_article_id")
  articleNumber         String   @map("article_number")
  brandId               Int      @map("brand_id")
  brandName             String   @map("brand_name")
  genericArticleId      Int?     @map("generic_article_id")
  genericArticleName    String?  @map("generic_article_name")
  articleName           String?  @map("article_name")
  articleDescription    String?  @map("article_description")
  weightKg              Decimal? @map("weight_kg") @db.Decimal(8, 3)
  isValid               Boolean  @default(true) @map("is_valid")
  lastSyncedAt          DateTime @default(now()) @map("last_synced_at")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  // Relations
  prices           TecDocPrice[]
  crossReferences  TecDocCrossReference[]
  dppProducts      DPPProduct[]

  @@unique([articleNumber, brandId])
  @@index([articleNumber])
  @@index([brandId])
  @@map("tecdoc_articles")
}

model TecDocPrice {
  id                    String   @id @default(uuid())
  articleId             BigInt   @map("article_id")
  sourceType            String   @map("source_type")
  sourceId              String?  @map("source_id")
  currency              String   @default("EUR")
  netPrice              Decimal  @map("net_price") @db.Decimal(12, 4)
  stockQuantity         Int?     @map("stock_quantity")
  estimatedDeliveryDays Int?     @map("estimated_delivery_days")
  lastSyncedAt          DateTime @default(now()) @map("last_synced_at")

  article TecDocArticle @relation(fields: [articleId], references: [tecdocArticleId])

  @@index([articleId])
  @@map("tecdoc_prices")
}

// ==========================================
// DPP MODELS
// ==========================================

model DPPProduct {
  id                       String    @id @default(uuid())
  productIdentifier        String    @unique @map("product_identifier")
  tecdocArticleId          BigInt?   @map("tecdoc_article_id")
  dppStatus                String    @default("DRAFT") @map("dpp_status")
  blockchainTransactionHash String?  @map("blockchain_transaction_hash")
  dataHash                 String    @map("data_hash")
  createdBy                String    @map("created_by")
  publishedAt              DateTime? @map("published_at")
  createdAt                DateTime  @default(now()) @map("created_at")
  updatedAt                DateTime  @updatedAt @map("updated_at")

  // Relations
  article           TecDocArticle?      @relation(fields: [tecdocArticleId], references: [tecdocArticleId])
  creator           User                @relation(fields: [createdBy], references: [id])
  sustainability    DPPSustainability?
  blockchainHashes  DPPBlockchainHash[]
  supplyChainEvents DPPSupplyChainEvent[]

  @@map("dpp_products")
}

model DPPSustainability {
  id                          String   @id @default(uuid())
  productId                   String   @unique @map("product_id")
  carbonFootprintKgCo2e       Decimal? @map("carbon_footprint_kg_co2e") @db.Decimal(12, 4)
  materials                   Json
  recycledContentPercentage   Decimal? @map("recycled_content_percentage") @db.Decimal(5, 2)
  recyclable                  Boolean?
  expectedLifetimeYears       Int?     @map("expected_lifetime_years")
  createdAt                   DateTime @default(now()) @map("created_at")
  updatedAt                   DateTime @updatedAt @map("updated_at")

  product DPPProduct @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("dpp_sustainability_records")
}

model DPPBlockchainHash {
  id                    String   @id @default(uuid())
  productId             String   @map("product_id")
  recordType            String   @map("record_type")
  contentHash           String   @map("content_hash")
  blockchainNetwork     String   @map("blockchain_network")
  transactionHash       String   @map("transaction_hash")
  blockNumber           BigInt   @map("block_number")
  blockTimestamp        DateTime @map("block_timestamp")
  ipfsHash              String?  @map("ipfs_hash")
  createdAt             DateTime @default(now()) @map("created_at")

  product DPPProduct @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, recordType, blockNumber])
  @@index([transactionHash])
  @@map("dpp_blockchain_hashes")
}

// ==========================================
// AI ACT MODELS
// ==========================================

model AISystem {
  id                    String    @id @default(uuid())
  systemId              String    @unique @map("system_id")
  systemName            String    @map("system_name")
  systemVersion         String    @map("system_version")
  riskLevel             String    @map("risk_level")
  intendedPurpose       String    @map("intended_purpose")
  deploymentStatus      String    @default("DEVELOPMENT") @map("deployment_status")
  deploymentDate        DateTime? @map("deployment_date")
  ownerTeam             String    @map("owner_team")
  technicalContact      String?   @map("technical_contact")
  ceMarked              Boolean   @default(false) @map("ce_marked")
  ceMarkingDate         DateTime? @map("ce_marking_date")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  // Relations
  auditLogs     AIAuditLog[]
  modelVersions AIModelVersion[]

  @@unique([systemId, systemVersion])
  @@map("ai_systems")
}

model AIAuditLog {
  id                    String   @id @default(uuid())
  systemId              String   @map("system_id")
  eventType             String   @map("event_type")
  eventTimestamp        DateTime @default(now()) @map("event_timestamp")
  confidenceScore       Decimal? @map("confidence_score") @db.Decimal(5, 4)
  predictionValue       String?  @map("prediction_value")
  featureImportance     Json?    @map("feature_importance")
  humanOversightApplied Boolean  @default(false) @map("human_oversight_applied")
  humanReviewerId       String?  @map("human_reviewer_id")
  tenantId              String?  @map("tenant_id")
  userId                String?  @map("user_id")
  retentionUntil        DateTime @map("retention_until")
  logHash               String   @map("log_hash")
  createdAt             DateTime @default(now()) @map("created_at")

  system    AISystem @relation(fields: [systemId], references: [systemId])
  reviewer  User?    @relation(fields: [humanReviewerId], references: [id], name: "AIReviewer")
  tenant    Tenant?  @relation(fields: [tenantId], references: [id])
  user      User?    @relation(fields: [userId], references: [id], name: "AIUser")

  @@index([systemId, eventTimestamp])
  @@index([tenantId])
  @@index([retentionUntil])
  @@map("ai_audit_logs")
}

model AIModelVersion {
  id                    String    @id @default(uuid())
  systemId              String    @map("system_id")
  modelVersion          String    @map("model_version")
  modelHash             String    @map("model_hash")
  trainingDataStartDate DateTime? @map("training_data_start_date")
  trainingDataEndDate   DateTime? @map("training_data_end_date")
  accuracy              Decimal?  @db.Decimal(5, 4)
  deployedAt            DateTime? @map("deployed_at")
  status                String    @default("DRAFT")
  createdAt             DateTime  @default(now()) @map("created_at")

  system     AISystem       @relation(fields: [systemId], references: [systemId])
  biasChecks AIBiasMetric[]

  @@unique([systemId, modelVersion])
  @@map("ai_model_versions")
}

model AIBiasMetric {
  id                           String   @id @default(uuid())
  modelId                      String   @map("model_id")
  evaluationDate               DateTime @default(now()) @map("evaluation_date")
  demographicParityDifference  Decimal? @map("demographic_parity_difference") @db.Decimal(5, 4)
  equalizedOddsDifference      Decimal? @map("equalized_odds_difference") @db.Decimal(5, 4)
  disparateImpactRatio         Decimal? @map("disparate_impact_ratio") @db.Decimal(5, 4)
  metricsByGroup               Json     @map("metrics_by_group")
  sensitiveAttributes          Json     @map("sensitive_attributes")
  isCompliant                  Boolean  @map("is_compliant")
  createdAt                    DateTime @default(now()) @map("created_at")

  model AIModelVersion @relation(fields: [modelId], references: [id])

  @@index([modelId])
  @@index([isCompliant])
  @@map("ai_bias_metrics")
}

// ==========================================
// E-INVOICING MODELS
// ==========================================

model EInvoiceSubmission {
  id                    String    @id @default(uuid())
  invoiceId             String    @map("invoice_id")
  tenantId              String    @map("tenant_id")
  countryCode           String    @map("country_code")
  gatewayType           String    @map("gateway_type")
  submissionId          String?   @map("submission_id")
  submissionDate        DateTime  @default(now()) @map("submission_date")
  submissionStatus      String    @default("PENDING") @map("submission_status")
  formatType            String    @map("format_type")
  xmlHash               String    @map("xml_hash")
  signatureType         String?   @map("signature_type")
  recipientVat          String?   @map("recipient_vat")
  invoiceTotal          Decimal   @map("invoice_total") @db.Decimal(12, 2)
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  invoice  Invoice               @relation(fields: [invoiceId], references: [id])
  tenant   Tenant                @relation(fields: [tenantId], references: [id])
  history  EInvoiceStatusHistory[]

  @@index([invoiceId])
  @@index([countryCode])
  @@index([submissionStatus])
  @@map("einvoice_submissions")
}

model EInvoiceStatusHistory {
  id                 String    @id @default(uuid())
  submissionId       String    @map("submission_id")
  previousStatus     String?   @map("previous_status")
  newStatus          String    @map("new_status")
  statusDate         DateTime  @default(now()) @map("status_date")
  notificationSource String?   @map("notification_source")
  statusMessage      String?   @map("status_message")
  errorCode          String?   @map("error_code")
  createdAt          DateTime  @default(now()) @map("created_at")

  submission EInvoiceSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)

  @@index([submissionId])
  @@index([statusDate])
  @@map("einvoice_status_history")
}

// ==========================================
// I18N MODELS
// ==========================================

model I18nTranslation {
  id              String    @id @default(uuid())
  namespace       String
  key             String
  locale          String
  value           String
  valueHtml       String?   @map("value_html")
  description     String?
  pluralForm      String?   @map("plural_form")
  status          String    @default("DRAFT")
  version         Int       @default(1)
  previousVersion String?   @map("previous_version")
  createdBy       String?   @map("created_by")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedBy       String?   @map("updated_by")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@unique([namespace, key, locale])
  @@index([namespace, key])
  @@index([locale])
  @@map("i18n_translations")
}

// ==========================================
// GDPR MODELS
// ==========================================

model GDPRConsentRecord {
  id                        String    @id @default(uuid())
  tenantId                  String    @map("tenant_id")
  customerId                String?   @map("customer_id")
  userId                    String?   @map("user_id")
  consentType               String    @map("consent_type")
  consentScope              String    @map("consent_scope")
  granted                   Boolean
  grantedAt                 DateTime? @map("granted_at")
  revokedAt                 DateTime? @map("revoked_at")
  consentMethod             String?   @map("consent_method")
  legalBasis                String    @map("legal_basis")
  privacyPolicyVersion      String?   @map("privacy_policy_version")
  createdAt                 DateTime  @default(now()) @map("created_at")
  updatedAt                 DateTime  @updatedAt @map("updated_at")

  tenant   Tenant    @relation(fields: [tenantId], references: [id])
  customer Customer? @relation(fields: [customerId], references: [id])
  user     User?     @relation(fields: [userId], references: [id])

  @@index([customerId])
  @@index([consentType])
  @@index([granted, grantedAt])
  @@map("gdpr_consent_records")
}
```

---

*Document maintained by Data Architecture Team*  
*Next Review: 2026-04-01*
