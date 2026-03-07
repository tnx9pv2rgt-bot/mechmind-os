# MechMind OS — Technical Specifications

> **Version:** 2.0.0  
> **Last Updated:** 2026-02-28  
> **Classification:** Engineering Reference  

---

## 1. Technology Stack

### 1.1 Core Stack Overview

| Layer | Technology | Version | Purpose | Status |
|-------|------------|---------|---------|--------|
| **Frontend Runtime** | Next.js | 14.1.0 | App Router, SSR, Edge Runtime | Production |
| **UI Framework** | React | 18.2.0 | Component Architecture, Concurrent Features | Production |
| **Type System** | TypeScript | 5.3.3 | Static Type Safety, IDE Support | Production |
| **Styling Engine** | Tailwind CSS | 3.4.1 | Utility-First CSS, Design System | Production |
| **Animation** | Framer Motion | 10.18.0 | Declarative Animations, Gestures | Production |
| **Form Management** | React Hook Form | 7.49.0 | Performance-Optimized Forms | Production |
| **Validation** | Zod | 3.22.4 | Schema Validation, Type Inference | Production |
| **State Management** | Zustand | 4.5.0 | Lightweight Global State | Production |
| **Query Client** | TanStack Query | 5.17.0 | Server State, Caching, Sync | Production |

### 1.2 Backend Infrastructure

| Layer | Technology | Version | Purpose | Status |
|-------|------------|---------|---------|--------|
| **API Framework** | NestJS | 10.3.0 | Modular Architecture, DI Container | Production |
| **Runtime** | Node.js | 20.11.0 LTS | Event Loop, V8 Engine | Production |
| **ORM** | Prisma | 5.8.0 | Type-Safe Database Access | Production |
| **API Spec** | OpenAPI 3.1 | - | Auto-Generated Documentation | Production |
| **API Client** | tRPC | 11.0.0-next | End-to-End Type Safety | Beta |

### 1.3 Data Layer

| Component | Technology | Version | Purpose | Config |
|-----------|------------|---------|---------|--------|
| **Primary Database** | PostgreSQL | 15.4 | ACID Transactions, JSONB | Primary: db.mechmind.io:5432 |
| **Read Replicas** | PostgreSQL | 15.4 | Read Scaling, Analytics | 2x replicas (eu-west, us-east) |
| **Connection Pool** | PgBouncer | 1.21.0 | Connection Multiplexing | max_clients: 10,000 |
| **Cache Layer** | Redis | 7.2.3 | Session Store, BullMQ, Cache | Cluster: 3 nodes |
| **Search Index** | PostgreSQL FTS | 15.4 | Full-Text Search | GIN indexes on tsvector |
| **Queue Engine** | BullMQ | 5.1.0 | Background Jobs, Scheduling | Redis-backed |

### 1.4 Security & Authentication

| Component | Technology | Version | Purpose | Implementation |
|-----------|------------|---------|---------|----------------|
| **Token Auth** | JWT (jose) | 5.2.0 | Stateless Access Tokens | RS256, 15min expiry |
| **Refresh Tokens** | JWT + Redis | - | Secure Token Rotation | 7-day rotation window |
| **MFA Engine** | speakeasy | 2.0.0 | TOTP Generation/Verification | RFC 6238 compliant |
| **Password Hashing** | bcrypt | 5.1.1 | Credential Storage | cost_factor: 12 |
| **PII Encryption** | AES-256-GCM | - | Field-Level Encryption | KMS-backed keys |
| **TLS** | OpenSSL | 3.1.x | Transport Security | TLS 1.3 only |

### 1.5 External Integrations

| Service | Provider | Cost Model | SLA | Fallback Strategy |
|---------|----------|------------|-----|-------------------|
| **Email Delivery** | Resend | $0-20/mo (10k-100k emails) | 99.99% | Queue + retry (exponential backoff) |
| **SMS Gateway** | Twilio | €0.0075/SMS | 99.95% | Email notification fallback |
| **BI/Analytics** | Metabase | $0 (self-hosted) | N/A | Direct SQL export |
| **File Storage** | AWS S3 | $0.023/GB | 99.99% | Multi-region replication |
| **CDN** | CloudFront | $0.085/GB | 99.9% | Origin failover |
| **Monitoring** | Datadog | Usage-based | 99.9% | Local log aggregation |

### 1.6 Testing & Quality

| Layer | Tool | Version | Coverage Target | Execution |
|-------|------|---------|-----------------|-----------|
| **Unit Tests** | Vitest | 1.2.0 | 80% logic | CI (2m avg) |
| **E2E Tests** | Playwright | 1.41.0 | Critical paths | CI + Nightly (8m avg) |
| **API Tests** | Postman/Newman | 10.x | All endpoints | CI per deploy |
| **Linting** | ESLint + Prettier | 8.56.0 / 3.2.0 | Zero warnings | Pre-commit hook |
| **Type Check** | tsc | 5.3.3 | Strict mode | CI blocking |
| **Security Scan** | Snyk + CodeQL | - | Critical/High | Weekly + PR gate |

---

## 2. Database Architecture

### 2.1 Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   companies     │     │      users      │     │      mfa        │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │◄────┤ company_id (FK) │     │ id (PK)         │
│ name            │     │ id (PK)         │◄────┤ user_id (FK)    │
│ tax_id          │     │ email (UQ)      │     │ type            │
│ plan            │     │ role            │     │ secret (enc)    │
│ settings (jsonb)│     │ status          │     │ verified        │
│ created_at      │     │ last_login      │     │ created_at      │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         │              ┌────────┴────────┐
         │              │                 │
         │        ┌─────┴─────┐     ┌─────┴─────┐
         │        │           │     │           │
┌────────▼────────┐  ┌────────▼────────┐  ┌────▼────┐  ┌───────────┐
│  subscriptions  │  │  activity_logs  │  │sessions │  │  audits   │
├─────────────────┤  ├─────────────────┤  ├─────────┤  ├───────────┤
│ id (PK)         │  │ id (PK)         │  │id (PK)  │  │id (PK)    │
│ company_id (FK) │  │ user_id (FK)    │  │user(FK) │  │user(FK)   │
│ stripe_sub_id   │  │ action          │  │token    │  │action     │
│ status          │  │ entity_type     │  │expires  │  │entity     │
│ current_period   │  │ entity_id       │  │ip       │  │changes    │
│ cancel_at_period │  │ metadata (jsonb)│  │ua       │  │timestamp  │
└─────────────────┘  └─────────────────┘  └─────────┘  └───────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   employees     │     │     shifts      │     │   time_off      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │◄────┤ employee_id(FK) │◄────┤ employee_id(FK) │
│ company_id (FK) │     │ id (PK)         │     │ id (PK)         │
│ user_id (FK)    │     │ start_time      │     │ type            │
│ department      │     │ end_time        │     │ start_date      │
│ position        │     │ status          │     │ end_date        │
│ hire_date       │     │ notes           │     │ status          │
│ salary (enc)    │     │ created_by(FK)  │     │ approved_by(FK) │
└─────────────────┘     └─────────────────┘     └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│   webhooks      │     │   notifications │
├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │
│ company_id (FK) │     │ user_id (FK)    │
│ url             │     │ type            │
│ events (array)  │     │ channel         │
│ secret (enc)    │     │ title           │
│ status          │     │ content         │
│ last_triggered  │     │ read_at         │
│ fail_count      │     │ created_at      │
└─────────────────┘     └─────────────────┘
```

### 2.2 Core Tables Specification

#### 2.2.1 `companies` — Tenant Isolation Root
```sql
CREATE TABLE companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    tax_id          VARCHAR(50) UNIQUE,
    vat_number      VARCHAR(50),
    address         JSONB,
    billing_email   VARCHAR(255),
    plan            plan_type NOT NULL DEFAULT 'free',
    settings        JSONB DEFAULT '{}',
    status          company_status DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ  -- Soft delete
);

-- Indexes
CREATE INDEX idx_companies_plan ON companies(plan) WHERE status = 'active';
CREATE INDEX idx_companies_tax_id ON companies(tax_id);
```

**RLS Policy:**
```sql
CREATE POLICY company_isolation ON companies
    FOR ALL USING (id = current_setting('app.current_company')::UUID);
```

#### 2.2.2 `users` — Identity & Access
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    role            user_role NOT NULL DEFAULT 'user',
    department      VARCHAR(100),
    status          user_status DEFAULT 'pending',
    email_verified  BOOLEAN DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    failed_logins   INTEGER DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    preferences     JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, email)
);

-- Indexes
CREATE INDEX idx_users_company ON users(company_id, status);
CREATE INDEX idx_users_email ON users(email) WHERE status = 'active';
CREATE INDEX idx_users_role ON users(company_id, role);
```

#### 2.2.3 `employees` — HR Master Data
```sql
CREATE TABLE employees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    user_id         UUID UNIQUE REFERENCES users(id),
    employee_code   VARCHAR(50),  -- Internal ID
    department      VARCHAR(100),
    position        VARCHAR(100),
    employment_type employment_enum DEFAULT 'full_time',
    hire_date       DATE NOT NULL,
    termination_date DATE,
    salary_encrypted BYTEA,  -- AES-256-GCM encrypted
    bank_iban_encrypted BYTEA,
    tax_code_encrypted BYTEA,
    documents       JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, employee_code)
);

-- Indexes
CREATE INDEX idx_employees_company ON employees(company_id, employment_type);
CREATE INDEX idx_employees_department ON employees(company_id, department);
CREATE INDEX idx_employees_hire_date ON employees(hire_date);
```

#### 2.2.4 `shifts` — Time Tracking
```sql
CREATE TABLE shifts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ,
    break_duration  INTERVAL DEFAULT '0 minutes',
    location        GEOGRAPHY(POINT, 4326),  -- PostGIS
    notes           TEXT,
    status          shift_status DEFAULT 'scheduled',
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX idx_shifts_employee ON shifts(employee_id, start_time DESC);
CREATE INDEX idx_shifts_date ON shifts(start_time) WHERE status = 'completed';
CREATE INDEX idx_shifts_location ON shifts USING GIST(location);
```

#### 2.2.5 `time_off` — Leave Management
```sql
CREATE TABLE time_off (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    type            leave_type NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    days_requested  DECIMAL(4,1) NOT NULL,
    reason          TEXT,
    status          leave_status DEFAULT 'pending',
    requested_at    TIMESTAMPTZ DEFAULT NOW(),
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    
    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT positive_days CHECK (days_requested > 0)
);

-- Indexes
CREATE INDEX idx_timeoff_employee ON time_off(employee_id, start_date DESC);
CREATE INDEX idx_timeoff_status ON time_off(status, start_date) WHERE status = 'pending';
CREATE INDEX idx_timeoff_overlapping ON time_off(employee_id, start_date, end_date);
```

#### 2.2.6 `mfa_credentials` — Multi-Factor Auth
```sql
CREATE TABLE mfa_credentials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            mfa_type NOT NULL DEFAULT 'totp',
    secret_encrypted BYTEA NOT NULL,  -- Encrypted TOTP secret
    backup_codes    BYTEA[],  -- Encrypted backup codes
    verified        BOOLEAN DEFAULT FALSE,
    enabled_at      TIMESTAMPTZ,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, type)
);

CREATE INDEX idx_mfa_user ON mfa_credentials(user_id);
```

#### 2.2.7 `sessions` — Active Sessions
```sql
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,  -- SHA-256 hash
    expires_at      TIMESTAMPTZ NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    mfa_verified    BOOLEAN DEFAULT FALSE,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT not_expired CHECK (expires_at > created_at)
);

CREATE INDEX idx_sessions_user ON sessions(user_id, revoked_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_sessions_expires ON sessions(expires_at) WHERE revoked_at IS NULL;
```

#### 2.2.8 `activity_logs` — Audit Trail
```sql
CREATE TABLE activity_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    company_id      UUID NOT NULL REFERENCES companies(id),
    action          action_type NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID,
    old_values      JSONB,
    new_values      JSONB,
    metadata        JSONB DEFAULT '{}',
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Partitioning by month for performance
CREATE TABLE activity_logs_y2024m01 PARTITION OF activity_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Indexes
CREATE INDEX idx_activity_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_company ON activity_logs(company_id, created_at DESC);
CREATE INDEX idx_activity_entity ON activity_logs(entity_type, entity_id);
```

#### 2.2.9 `notifications` — User Notifications
```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,
    channel         channel_type DEFAULT 'in_app',
    priority        priority_enum DEFAULT 'normal',
    title           VARCHAR(255) NOT NULL,
    content         TEXT,
    action_url      VARCHAR(500),
    data            JSONB DEFAULT '{}',
    read_at         TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;
```

#### 2.2.10 `webhooks` — Outbound Integrations
```sql
CREATE TABLE webhooks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    url             VARCHAR(500) NOT NULL,
    events          webhook_event[] NOT NULL,
    secret_encrypted BYTEA NOT NULL,
    headers         JSONB DEFAULT '{}',
    status          webhook_status DEFAULT 'active',
    last_triggered_at TIMESTAMPTZ,
    last_error      TEXT,
    fail_count      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_company ON webhooks(company_id, status);
```

#### 2.2.11 `subscriptions` — Billing Records
```sql
CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    stripe_sub_id   VARCHAR(100) UNIQUE,
    stripe_cus_id   VARCHAR(100),
    status          subscription_status NOT NULL,
    plan            plan_type NOT NULL,
    quantity        INTEGER DEFAULT 1,
    current_period_start TIMESTAMPTZ,
    current_period_end   TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at     TIMESTAMPTZ,
    trial_start     TIMESTAMPTZ,
    trial_end       TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_company ON subscriptions(company_id, status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_sub_id);
```

### 2.3 Row Level Security (RLS)

All tables implement **tenant isolation** via PostgreSQL RLS:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
-- ... etc

-- Set company context (called on every request)
SET app.current_company = '550e8400-e29b-41d4-a716-446655440000';

-- Generic tenant isolation policy
CREATE POLICY tenant_isolation ON users
    FOR ALL USING (company_id = current_setting('app.current_company')::UUID);

-- Admin override policy
CREATE POLICY admin_all_access ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user')::UUID
            AND u.role = 'super_admin'
        )
    );
```

**RLS Performance Impact:** <2ms overhead per query with proper indexing.

### 2.4 Performance Optimizations

| Strategy | Implementation | Impact |
|----------|----------------|--------|
| **Connection Pooling** | PgBouncer (transaction mode) | 10,000 concurrent clients → 100 DB connections |
| **Read Replicas** | 2x async replicas (EU, US) | 70% read traffic offloaded |
| **Partitioning** | activity_logs by month | Query time: O(n) → O(1/month) |
| **Materialized Views** | daily_stats, monthly_reports | Report generation: 3s → 200ms |
| **Covering Indexes** | Frequently accessed columns | Index-only scans: 40% of queries |
| **GIN Indexes** | JSONB fields, arrays | JSONB queries: 100ms → 5ms |

---

## 3. Security Architecture

### 3.1 Encryption Standards

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENCRYPTION LAYERS                             │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Transport                                              │
│  ├── TLS 1.3 (mandatory, no fallback)                           │
│  ├── HSTS: max-age=31536000; includeSubDomains                  │
│  └── Certificate pinning on mobile clients                      │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Data at Rest                                           │
│  ├── PostgreSQL: AES-256-XTS (AWS RDS encryption)               │
│  ├── S3: SSE-S3 with KMS keys                                   │
│  └── Redis: TLS + AUTH on all connections                       │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Field-Level Encryption (PII)                          │
│  ├── Algorithm: AES-256-GCM                                     │
│  ├── Key Rotation: 90 days                                      │
│  ├── Encrypted Fields:                                          │
│  │   ├── employees.salary_encrypted                             │
│  │   ├── employees.bank_iban_encrypted                          │
│  │   ├── employees.tax_code_encrypted                           │
│  │   ├── mfa_credentials.secret_encrypted                       │
│  │   └── webhooks.secret_encrypted                              │
│  └── KMS: AWS KMS with automatic rotation                       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 GDPR Compliance Matrix

| Article | Requirement | Implementation | Status |
|---------|-------------|----------------|--------|
| **Art. 5** | Principles | Lawfulness, purpose limitation, data minimization | ✓ Compliant |
| **Art. 6** | Lawful basis | Consent (signup), Contract (service), Legal (billing) | ✓ Compliant |
| **Art. 7** | Consent | Granular checkboxes, withdrawal mechanism | ✓ Compliant |
| **Art. 12-14** | Transparency | Privacy policy, data usage disclosure | ✓ Compliant |
| **Art. 15** | Right of access | Self-service data export (/api/v1/me/export) | ✓ Compliant |
| **Art. 16** | Right to rectification | In-app profile editing | ✓ Compliant |
| **Art. 17** | Right to erasure | Soft delete + 30-day purge | ✓ Compliant |
| **Art. 18** | Right to restriction | Account suspension preserves data | ✓ Compliant |
| **Art. 20** | Data portability | JSON export, standard formats | ✓ Compliant |
| **Art. 25** | Privacy by design | Encryption, minimization, RLS | ✓ Compliant |
| **Art. 30** | Records of processing | Automated registry generation | ✓ Compliant |
| **Art. 32** | Security | AES-256, MFA, audit logging | ✓ Compliant |
| **Art. 33** | Breach notification | 72h automated alerting | ✓ Compliant |
| **Art. 34** | Communication | User notification within 72h | ✓ Compliant |

### 3.3 Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Client │────►│   Login     │────►│   Verify    │────►│    MFA      │
│         │     │  Endpoint   │     │ Credentials │     │  Required?  │
└─────────┘     └─────────────┘     └──────┬──────┘     └──────┬──────┘
                                           │                     │
                                           │              ┌──────┴──────┐
                                           │              │             │
                                           ▼              ▼             ▼
                                    ┌──────────┐   ┌──────────┐  ┌──────────┐
                                    │   Fail   │   │  Pass    │  │ TOTP     │
                                    │ + Log    │   │ + Check  │  │ Verify   │
                                    │ + Rate   │   │ MFA Flag │  │          │
                                    │  Limit   │   └────┬─────┘  └────┬─────┘
                                    └──────────┘        │             │
                                                        ▼             ▼
                                                 ┌─────────────────────┐
                                                 │   Issue Tokens      │
                                                 │                     │
                                                 │   Access: 15min     │
                                                 │   RS256 signed      │
                                                 │                     │
                                                 │   Refresh: 7days    │
                                                 │   Redis stored      │
                                                 │   Rotatable         │
                                                 └──────────┬──────────┘
                                                            │
                                                            ▼
                                                 ┌─────────────────────┐
                                                 │   Set Cookies       │
                                                 │                     │
                                                 │   __session: HttpOnly│
                                                 │   __refresh: Secure  │
                                                 │   SameSite=Strict    │
                                                 └─────────────────────┘
```

### 3.4 RBAC Permission Matrix

| Resource | Action | User | Manager | Admin | Super Admin |
|----------|--------|------|---------|-------|-------------|
| **Profile** | read | ✓ | ✓ | ✓ | ✓ |
| | update | ✓ | ✓ | ✓ | ✓ |
| **Employees** | read | Own | Dept | All | All |
| | create | ✗ | ✗ | ✓ | ✓ |
| | update | Own | Dept | All | All |
| | delete | ✗ | ✗ | ✓ | ✓ |
| **Shifts** | read | Own | Team | All | All |
| | create | Own | Team | All | All |
| | approve | ✗ | ✓ | ✓ | ✓ |
| **Time Off** | read | Own | Team | All | All |
| | request | ✓ | ✓ | ✓ | ✓ |
| | approve | ✗ | ✓ | ✓ | ✓ |
| **Company** | read | ✓ | ✓ | ✓ | ✓ |
| | update | ✗ | ✗ | ✓ | ✓ |
| | billing | ✗ | ✗ | ✓ | ✓ |
| | delete | ✗ | ✗ | ✗ | ✓ |
| **Users** | manage | ✗ | ✗ | ✓ | ✓ |
| **Webhooks** | manage | ✗ | ✗ | ✓ | ✓ |
| **System** | audit | ✗ | ✗ | ✗ | ✓ |
| | config | ✗ | ✗ | ✗ | ✓ |

### 3.5 Rate Limiting Strategy

```
┌────────────────────────────────────────────────────────────────┐
│                     RATE LIMIT TIERS                           │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│    Tier      │   Limit      │   Window     │   Scope           │
├──────────────┼──────────────┼──────────────┼───────────────────┤
│ Anonymous    │ 10 req       │ 1 minute     │ IP address        │
│ Authenticated│ 100 req      │ 1 minute     │ User ID           │
│ API Key      │ 1,000 req    │ 1 minute     │ API key           │
│ Burst        │ 20 req       │ 1 second     │ IP/User           │
│ Webhook      │ 100 calls    │ 1 minute     │ Webhook ID        │
│ Login        │ 5 attempts   │ 5 minutes    │ IP + Username     │
│ MFA Verify   │ 3 attempts   │ 1 minute     │ User ID           │
│ Export       │ 1 request    │ 1 hour       │ User ID           │
└──────────────┴──────────────┴──────────────┴───────────────────┘

Implementation: Redis-backed sliding window counter
Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

---

## 4. Scalability & Performance

### 4.1 Concurrency Control

```
┌─────────────────────────────────────────────────────────────────┐
│                  ADVISORY LOCK PATTERNS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PAYROLL CALCULATION                                         │
│  ─────────────────────                                          │
│     BEGIN;                                                      │
│     SELECT pg_advisory_lock(hashtext('payroll:' || company_id));│
│     -- Calculate payroll...                                     │
│     SELECT pg_advisory_unlock(hashtext('payroll:' || company_id));│
│     COMMIT;                                                     │
│                                                                 │
│  2. INVENTORY RESERVATION                                       │
│  ─────────────────────────                                      │
│     SELECT pg_try_advisory_lock(resource_id)                    │
│     FOR UPDATE SKIP LOCKED;                                     │
│                                                                 │
│  3. WEBHOOK DELIVERY                                            │
│  ────────────────────                                           │
│     SELECT * FROM webhooks                                      │
│     WHERE status = 'pending'                                    │
│     FOR UPDATE SKIP LOCKED                                      │
│     LIMIT 10;                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Connection Pooling

```
┌─────────────────────────────────────────────────────────────┐
│              DATABASE CONNECTION ARCHITECTURE                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   App Servers (x10)         PgBouncer         PostgreSQL    │
│   ┌──────────────┐         ┌─────────┐       ┌─────────┐   │
│   │ App Instance │         │  Pool   │       │ Primary │   │
│   │              │◄───────►│  100    │◄─────►│         │   │
│   │  100 conn    │   1000  │  conn   │  100  │  500    │   │
│   └──────────────┘         └────┬────┘       │  max    │   │
│                                 │            └────┬────┘   │
│                                 │                 │        │
│                                 │            ┌────┴────┐   │
│                                 └───────────►│ Replica │   │
│                                              │ (EU)    │   │
│                                              └─────────┘   │
│                                              ┌─────────┐   │
│                                              │ Replica │   │
│                                              │ (US)    │   │
│                                              └─────────┘   │
│                                                             │
│   Pool Settings:                                           │
│   ├── pool_mode: transaction                               │
│   ├── max_client_conn: 10,000                              │
│   ├── default_pool_size: 20                                │
│   ├── reserve_pool_size: 5                                 │
│   └── reserve_pool_timeout: 3s                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Caching Strategy

```
┌────────────────────────────────────────────────────────────────┐
│                    REDIS CACHE LAYERS                          │
├──────────────────┬──────────────────┬──────────────────────────┤
│      Layer       │     TTL          │        Examples          │
├──────────────────┼──────────────────┼──────────────────────────┤
│ L1: Application  │ 5 minutes        │ User sessions, CSRF      │
│                  │                  │ Active subscriptions     │
├──────────────────┼──────────────────┼──────────────────────────┤
│ L2: Query Cache  │ 1 minute         │ Dashboard aggregates     │
│                  │                  │ Employee counts          │
│                  │                  │ Recent shifts            │
├──────────────────┼──────────────────┼──────────────────────────┤
│ L3: API Response │ 30 seconds       │ Public endpoints         │
│                  │                  │ Company settings (public)│
├──────────────────┼──────────────────┼──────────────────────────┤
│ L4: Job Queue    │ Until processed  │ Email delivery           │
│                  │                  │ Webhook dispatch         │
│                  │                  │ Report generation        │
├──────────────────┼──────────────────┼──────────────────────────┤
│ L5: Rate Limit   │ Sliding window   │ API throttling           │
│                  │                  │ Login attempts           │
└──────────────────┴──────────────────┴──────────────────────────┘

Cache Invalidation Strategy:
├── Write-Through: Critical data (sessions, MFA)
├── Write-Behind: Non-critical aggregates
├── Cache-Aside: Most application data
└── TTL-Based: Public/static content
```

### 4.4 Horizontal Scaling

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCALING TRAJECTORY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CURRENT: Single Region (EU)                                    │
│  ───────────────────────────                                    │
│     10,000 active users                                        │
│     3 app servers (2 vCPU, 4GB)                                │
│     1 primary DB (db.r6g.xlarge)                               │
│     1 Redis cluster (cache.r6g.large)                          │
│                                                                 │
│  PHASE 1: Multi-AZ (0-50k users)                               │
│  ────────────────────────────────                               │
│     + Read replica in secondary AZ                             │
│     + App servers: 3 → 6                                       │
│     + Connection pooler per AZ                                 │
│     ~$2,500/month                                               │
│                                                                 │
│  PHASE 2: Multi-Region (50k-200k users)                        │
│  ─────────────────────────────────────                          │
│     + US-East region deployment                                │
│     + Cross-region read replicas                               │
│     + Global Redis (Redis Cluster)                             │
│     + CDN edge caching                                         │
│     ~$8,000/month                                               │
│                                                                 │
│  PHASE 3: Global Scale (200k+ users)                           │
│  ───────────────────────────────────                            │
│     + APAC region                                              │
│     + Database sharding by region                              │
│     + Kubernetes auto-scaling                                  │
│     + Dedicated analytics pipeline                             │
│     ~$25,000/month                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Performance Benchmarks

| Metric | Target | Current | Test Method |
|--------|--------|---------|-------------|
| **API p99 Latency** | <200ms | 145ms | k6, 1000 RPS |
| **Auth Endpoint** | <100ms | 78ms | k6, 500 RPS |
| **Dashboard Load** | <1.5s | 1.2s | Lighthouse |
| **Report Generation** | <5s | 3.4s | 10k records |
| **CSV Export (10k rows)** | <3s | 2.1s | Production data |
| **Database Query p99** | <50ms | 32ms | pg_stat_statements |
| **Redis Operation** | <5ms | 1.2ms | redis-benchmark |
| **Time to Interactive** | <3s | 2.4s | Lighthouse |

---

## 5. External Dependencies

### 5.1 Service Level Agreements

| Service | Provider | Cost Model | Monthly Cost* | SLA | Downtime/Year | Fallback |
|---------|----------|------------|---------------|-----|---------------|----------|
| **Email Delivery** | Resend | $0.001/email | $0-20 | 99.99% | 52.6 min | Queue + exponential retry (max 72h) |
| **SMS Gateway** | Twilio | €0.0075/SMS | Variable | 99.95% | 4.38 hours | Email notification + in-app alert |
| **Payment Processing** | Stripe | 2.9% + €0.25 | Variable | 99.99% | 52.6 min | Manual invoicing workflow |
| **Cloud Infrastructure** | AWS | Usage-based | $800-2500 | 99.99% | 52.6 min | Multi-AZ failover |
| **Analytics/BI** | Metabase | $0 (self-hosted) | Hosting only | N/A | Self-managed | Direct SQL export + CSV |
| **File Storage** | AWS S3 | $0.023/GB | ~$15 | 99.99% | 52.6 min | Cross-region replication |
| **CDN** | CloudFront | $0.085/GB | ~$50 | 99.9% | 8.77 hours | Origin pull fallback |
| **Monitoring** | Datadog | $15/host/mo | ~$150 | 99.9% | 8.77 hours | Local log aggregation |
| **Secrets Management** | AWS Secrets Manager | $0.40/secret/mo | ~$20 | 99.99% | 52.6 min | Environment variable fallback |
| **KMS** | AWS KMS | $1/key/mo + $0.03/10k req | ~$30 | 99.99% | 52.6 min | Manual key rotation |

*Estimated for 10,000 active users

### 5.2 Dependency Risk Matrix

| Service | Criticality | Vendor Lock-in | Migration Effort | Alternatives |
|---------|-------------|----------------|------------------|--------------|
| PostgreSQL | Critical | Low | 2 weeks | MySQL, CockroachDB |
| Redis | Critical | Low | 1 week | KeyDB, Dragonfly |
| Stripe | High | Medium | 4 weeks | Adyen, PayPal |
| AWS | High | Medium | 8 weeks | GCP, Azure |
| Resend | Medium | Low | 1 week | SendGrid, Mailgun |
| Twilio | Medium | Low | 1 week | Vonage, MessageBird |
| Datadog | Low | Low | 2 weeks | Grafana Cloud, New Relic |
| Metabase | Low | None | N/A | Superset, Redash |

### 5.3 Circuit Breaker Configuration

```typescript
// Circuit breaker settings for external services
export const CIRCUIT_BREAKER_CONFIG = {
  resend: {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    halfOpenRequests: 3,
    fallback: 'queue_for_retry'
  },
  twilio: {
    failureThreshold: 3,
    resetTimeoutMs: 60000,
    halfOpenRequests: 2,
    fallback: 'email_notification'
  },
  stripe: {
    failureThreshold: 3,
    resetTimeoutMs: 60000,
    halfOpenRequests: 1,
    fallback: 'manual_processing'
  },
  webhookDelivery: {
    failureThreshold: 10,
    resetTimeoutMs: 300000,  // 5 min
    halfOpenRequests: 1,
    fallback: 'disable_webhook'
  }
};
```

---

## 6. Deployment & Operations

### 6.1 Infrastructure Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION ARCHITECTURE                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│   │   Route 53  │    │  CloudFront │    │    WAF      │            │
│   │   DNS       │───►│    CDN      │───►│  Firewall   │            │
│   └─────────────┘    └──────┬──────┘    └──────┬──────┘            │
│                             │                  │                    │
│                             ▼                  ▼                    │
│                      ┌────────────────────────────────┐             │
│                      │        ALB (HTTPS)             │             │
│                      │    Health checks, SSL          │             │
│                      └──────────────┬─────────────────┘             │
│                                     │                               │
│                    ┌────────────────┼────────────────┐              │
│                    │                │                │              │
│                    ▼                ▼                ▼              │
│              ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│              │  App 1   │    │  App 2   │    │  App 3   │          │
│              │Next.js   │    │Next.js   │    │Next.js   │          │
│              │Container │    │Container │    │Container │          │
│              └────┬─────┘    └────┬─────┘    └────┬─────┘          │
│                   │               │               │                 │
│                   └───────────────┼───────────────┘                 │
│                                   │                                 │
│                        ┌──────────┴──────────┐                     │
│                        │                     │                     │
│                        ▼                     ▼                     │
│                 ┌──────────┐          ┌──────────┐                 │
│                 │  Redis   │          │PgBouncer │                 │
│                 │ Cluster  │          │  Pool    │                 │
│                 └────┬─────┘          └────┬─────┘                 │
│                      │                     │                       │
│                      │            ┌────────┴────────┐              │
│                      │            │                 │              │
│                      │            ▼                 ▼              │
│                      │     ┌──────────┐      ┌──────────┐         │
│                      │     │ Primary  │◄────►│ Replica  │         │
│                      │     │   RDS    │  Sync│   RDS    │         │
│                      │     └──────────┘      └──────────┘         │
│                      │                                             │
│                      └────────────────────────────────────────►    │
│                          Background Workers (BullMQ)               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 6.2 CI/CD Pipeline

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│   Push   │──►│  Build   │──►│   Test   │──►│  Deploy  │──►│ Monitor  │
│  (main)  │   │  & Lint  │   │  & Scan  │   │ Staging  │   │  Staging │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └────┬─────┘
                                                                  │
                                                                  ▼
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Promote  │◄──│  Manual  │◄──│  E2E      │◄──│  Deploy  │◄──│   Smoke  │
│Production│   │ Approval │   │  Tests   │   │  Prod    │   │  Tests   │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

---

## 7. API Specifications

### 7.1 REST Endpoints

| Endpoint | Method | Auth | Rate Limit | Description |
|----------|--------|------|------------|-------------|
| `/api/v1/auth/login` | POST | None | 5/min | Email/password login |
| `/api/v1/auth/mfa/verify` | POST | Partial | 3/min | TOTP verification |
| `/api/v1/auth/refresh` | POST | Refresh | 10/min | Token rotation |
| `/api/v1/auth/logout` | POST | Access | 100/min | Session termination |
| `/api/v1/me` | GET | Access | 100/min | Current user profile |
| `/api/v1/me/export` | POST | Access | 1/hour | GDPR data export |
| `/api/v1/employees` | GET | Access | 100/min | List employees |
| `/api/v1/employees` | POST | Admin | 50/min | Create employee |
| `/api/v1/employees/:id` | GET | Access | 100/min | Get employee |
| `/api/v1/employees/:id` | PATCH | Admin | 50/min | Update employee |
| `/api/v1/employees/:id` | DELETE | Admin | 20/min | Delete employee |
| `/api/v1/shifts` | GET | Access | 100/min | List shifts |
| `/api/v1/shifts` | POST | Access | 50/min | Create shift |
| `/api/v1/shifts/:id/approve` | POST | Manager | 50/min | Approve shift |
| `/api/v1/time-off` | GET | Access | 100/min | List time-off requests |
| `/api/v1/time-off` | POST | Access | 10/min | Request time-off |
| `/api/v1/time-off/:id/approve` | POST | Manager | 50/min | Approve request |
| `/api/v1/webhooks` | GET | Admin | 100/min | List webhooks |
| `/api/v1/webhooks` | POST | Admin | 20/min | Create webhook |
| `/api/v1/webhooks/:id/test` | POST | Admin | 5/min | Test webhook |

### 7.2 Webhook Events

| Event | Payload | Retry |
|-------|---------|-------|
| `user.created` | User object | 3x exponential |
| `user.updated` | User changes | 3x exponential |
| `employee.created` | Employee object | 3x exponential |
| `employee.updated` | Employee changes | 3x exponential |
| `shift.created` | Shift object | 3x exponential |
| `shift.approved` | Shift + approver | 3x exponential |
| `time_off.requested` | Time off object | 3x exponential |
| `time_off.approved` | Time off + approver | 3x exponential |
| `invoice.paid` | Invoice object | 5x exponential |
| `invoice.failed` | Invoice + error | 5x exponential |

---

## 8. Monitoring & Observability

### 8.1 Key Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONITORING DASHBOARDS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  APPLICATION METRICS                                            │
│  ├── Request rate (RPS) by endpoint                             │
│  ├── Response time p50/p95/p99                                  │
│  ├── Error rate (5xx, 4xx breakdown)                            │
│  ├── Active users (WebSocket connections)                       │
│  └── Queue depth (BullMQ)                                       │
│                                                                 │
│  INFRASTRUCTURE METRICS                                         │
│  ├── CPU/Memory utilization by service                          │
│  ├── Database connections (active/idle)                         │
│  ├── Cache hit rate (Redis)                                     │
│  ├── Disk I/O and latency                                       │
│  └── Network throughput                                         │
│                                                                 │
│  BUSINESS METRICS                                               │
│  ├── Daily/Monthly Active Users (DAU/MAU)                       │
│  ├── Feature adoption rates                                     │
│  ├── API usage by tier/plan                                     │
│  └── Conversion funnel                                          │
│                                                                 │
│  SECURITY METRICS                                               │
│  ├── Failed login attempts                                      │
│  ├── MFA adoption rate                                          │
│  ├── Rate limit violations                                      │
│  └── Suspicious activity alerts                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Error Rate | >1% | >5% | Auto-rollback if >10% |
| Response Time p99 | >500ms | >1000ms | Scale up containers |
| DB Connections | >70% | >90% | Alert DBA, review pool |
| Redis Memory | >70% | >90% | Eviction review |
| Queue Depth | >1000 | >5000 | Scale workers |
| Failed Logins (IP) | >10/min | >50/min | Auto-block IP |
| Disk Usage | >70% | >85% | Cleanup/purge logs |

---

## 9. Changelog

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2025-01-15 | Initial specification | Engineering |
| 1.1.0 | 2025-03-20 | Added MFA schema | Security Team |
| 1.2.0 | 2025-06-10 | Updated caching strategy | Platform Team |
| 2.0.0 | 2026-02-28 | Complete rewrite, v2 architecture | Engineering |

---

**Document Owner:** Platform Engineering Team  
**Review Cycle:** Quarterly  
**Next Review:** 2026-05-28
