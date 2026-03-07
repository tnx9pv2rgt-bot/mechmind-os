# MechMind OS Architecture Overview

MechMind OS is a multi-tenant SaaS platform for automotive repair shops, featuring AI-powered voice booking capabilities.

## System Architecture

```mermaid
flowchart TB
    subgraph "Client Layer"
        WEB[Web App]
        MOBILE[Mobile App]
        PHONE[Phone Calls]
    end

    subgraph "API Gateway Layer"
        LB[Load Balancer]
        GW[API Gateway]
        AUTH[Auth Service]
    end

    subgraph "Application Layer"
        API[API Services]
        VOICE[Voice Service]
        WEBHOOK[Webhook Handler]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL)]
        CACHE[(Redis)]
        QUEUE[(Message Queue)]
    end

    subgraph "External Services"
        VAPI[Vapi AI]
        SENDGRID[SendGrid]
        TWILIO[Twilio]
        STRIPE[Stripe]
    end

    WEB --> LB
    MOBILE --> LB
    PHONE --> VAPI
    
    LB --> GW
    GW --> AUTH
    GW --> API
    
    VAPI --> WEBHOOK
    WEBHOOK --> API
    
    API --> DB
    API --> CACHE
    API --> QUEUE
    
    API --> SENDGRID
    API --> TWILIO
    API --> STRIPE
    VOICE --> VAPI
```

## Component Overview

### Client Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| Web App | React, TypeScript | Shop management interface |
| Mobile App | React Native | On-the-go access |
| Phone | PSTN/SIP | Voice booking channel |

### API Gateway Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| Load Balancer | AWS ALB | Traffic distribution |
| API Gateway | Kong | Rate limiting, routing |
| Auth Service | Node.js, JWT | Authentication & authorization |

### Application Layer

| Service | Language | Responsibility |
|---------|----------|----------------|
| API Services | Go | Core business logic |
| Voice Service | Python | Vapi integration |
| Webhook Handler | Python | Async event processing |
| Worker | Go | Background jobs |

### Data Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| Primary Database | PostgreSQL 15 | Transactional data |
| Read Replica | PostgreSQL 15 | Read scaling |
| Cache | Redis 7 | Session & query caching |
| Queue | Redis/RabbitMQ | Async job processing |

## Multi-Tenant Architecture

MechMind OS uses a **single database, schema-per-tenant** approach with Row-Level Security (RLS).

```mermaid
flowchart LR
    subgraph "Single Database"
        subgraph "Tenant A Schema"
            A_BOOKINGS[bookings]
            A_CUSTOMERS[customers]
            A_MECHANICS[mechanics]
        end
        
        subgraph "Tenant B Schema"
            B_BOOKINGS[bookings]
            B_CUSTOMERS[customers]
            B_MECHANICS[mechanics]
        end
        
        subgraph "Shared Schema"
            TENANTS[tenants]
            USERS[users]
            AUDIT[audit_log]
        end
    end
    
    API --> TENANTS
    API --> A_BOOKINGS
    API --> B_BOOKINGS
```

### Tenant Isolation

```sql
-- Row-Level Security Policy Example
CREATE POLICY tenant_isolation ON bookings
    USING (shop_id = current_setting('app.current_tenant')::UUID);

-- Set tenant context
SET app.current_tenant = '550e8400-e29b-41d4-a716-446655440000';
```

## Scalability Design

### Horizontal Scaling

```
┌─────────────────────────────────────────────────────────┐
│                      Load Balancer                       │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
   │ API-1   │        │ API-2   │        │ API-3   │
   │ (Pod)   │        │ (Pod)   │        │ (Pod)   │
   └────┬────┘        └────┬────┘        └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │  PostgreSQL  │
                    │   Primary    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Replica    │
                    └─────────────┘
```

### Auto-Scaling Configuration

```yaml
# HPA Configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

## Data Flow

### Booking Creation Flow

```mermaid
sequenceDiagram
    participant C as Customer
    participant API as API Gateway
    participant S as Booking Service
    participant DB as PostgreSQL
    participant Cache as Redis
    participant V as Vapi
    participant W as Webhook

    C->>API: POST /v1/bookings/reserve
    API->>S: Reserve slot
    S->>DB: Acquire advisory lock
    DB-->>S: Lock acquired
    S->>Cache: Cache reservation
    S-->>API: Reservation confirmed
    API-->>C: Return reservation

    C->>V: Confirm via voice
    V->>W: booking-intent webhook
    W->>API: POST /webhooks/vapi/booking-intent
    API->>S: Confirm booking
    S->>DB: Create booking record
    S->>Cache: Invalidate slot cache
    S->>V: Send confirmation
    V-->>C: Booking confirmed
```

## Technology Stack

### Backend

| Layer | Technology | Version |
|-------|------------|---------|
| API Framework | Go + Gin | 1.21 |
| Voice Service | Python + FastAPI | 3.11 |
| Database | PostgreSQL | 15 |
| Cache | Redis | 7.0 |
| Queue | RabbitMQ | 3.12 |

### Frontend

| Layer | Technology | Version |
|-------|------------|---------|
| Web | React | 18 |
| Mobile | React Native | 0.72 |
| UI Library | Material-UI | 5 |

### Infrastructure

| Layer | Technology |
|-------|------------|
| Cloud | AWS |
| Orchestration | Kubernetes (EKS) |
| CI/CD | GitHub Actions |
| Monitoring | Datadog |
| Logging | Datadog |

## Security Architecture

See [security.md](security.md) for detailed security documentation.

```mermaid
flowchart TB
    subgraph "Security Layers"
        WAF[AWS WAF]
        AUTH[OAuth 2.0 / JWT]
        TLS[TLS 1.3]
        RLS[Row-Level Security]
        ENC[Encryption at Rest]
    end
    
    Client --> WAF
    WAF --> TLS
    TLS --> AUTH
    AUTH --> RLS
    RLS --> ENC
```

## Deployment Architecture

```mermaid
flowchart LR
    subgraph "Development"
        DEV[Local Docker]
    end
    
    subgraph "CI/CD"
        CI[GitHub Actions]
    end
    
    subgraph "Environments"
        SANDBOX[Sandbox]
        STAGING[Staging]
        PROD[Production]
    end
    
    DEV --> CI
    CI --> SANDBOX
    CI --> STAGING
    STAGING --> PROD
```

## Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Response Time (p95) | < 200ms | > 500ms |
| API Response Time (p99) | < 500ms | > 1s |
| Database Query Time | < 50ms | > 100ms |
| Voice Webhook Latency | < 2s | > 5s |
| Availability | 99.9% | < 99.5% |

## Capacity Planning

### Current Capacity

| Resource | Current | Max |
|----------|---------|-----|
| API Pods | 5 | 50 |
| DB Connections | 100 | 500 |
| Cache Memory | 4GB | 32GB |
| Storage | 500GB | 5TB |

### Growth Projections

| Metric | Current | 6 Months | 12 Months |
|--------|---------|----------|-----------|
| Shops | 100 | 250 | 500 |
| Daily Bookings | 1,000 | 3,000 | 8,000 |
| API Requests/day | 100K | 300K | 800K |

## Disaster Recovery

### RPO/RTO

| Scenario | RPO | RTO |
|----------|-----|-----|
| Database failure | 5 min | 15 min |
| Region failure | 1 hour | 4 hours |
| Complete disaster | 24 hours | 24 hours |

### Backup Strategy

- **Full backups**: Daily at 02:00 UTC
- **WAL archiving**: Continuous
- **Cross-region replication**: Enabled
- **Retention**: 30 days (production), 7 days (staging)

## Documentation Index

- [Database Architecture](database.md)
- [Voice Flow](voice-flow.md)
- [Security Model](security.md)
- [Compliance](compliance.md)
