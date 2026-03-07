# Metabase BI Dashboard Setup - MechMind OS

Guida completa per l'installazione e configurazione di Metabase Business Intelligence per MechMind OS.

## 📋 Indice

- [Overview](#overview)
- [Architettura](#architettura)
- [Prerequisiti](#prerequisiti)
- [Installazione](#installazione)
- [Configurazione](#configurazione)
- [Dashboard Disponibili](#dashboard-disponibili)
- [Row-Level Security](#row-level-security)
- [Embedding](#embedding)
- [Troubleshooting](#troubleshooting)

## Overview

Metabase fornisce Business Intelligence self-hosted per MechMind OS con:

- **6 Dashboard pre-configurati**: Bookings, Revenue, Customers, Mechanics, Vehicles, Executive
- **Row-Level Security (RLS)**: Isolamento dati multi-tenant automatico
- **Embedding sicuro**: URL firmate JWT con scadenza configurabile
- **Real-time analytics**: Viste SQL aggiornate in tempo reale

## Architettura

```
┌─────────────────────────────────────────────────────────────────┐
│                        MechMind OS                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Frontend   │    │    Backend   │    │   Database   │      │
│  │  (Next.js)   │◄──►│   (NestJS)   │◄──►│  (Postgres)  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                                      │
│         │                   │ JWT Signed URL                      │
│         ▼                   ▼                                      │
│  ┌────────────────────────────────────────────────────────┐      │
│  │                    Metabase (Docker)                    │      │
│  │  • Embedded Dashboards    • Row-Level Security         │      │
│  │  • SQL Analytics Views    • Tenant Isolation           │      │
│  └────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisiti

- Docker & Docker Compose
- MechMind OS backend running
- PostgreSQL database access
- 2GB RAM disponibile per Metabase

## Installazione

### 1. Avvia Metabase

```bash
cd /Users/romanogiovanni1993gmail.com/Desktop/PROGETTI/Nexo gestionale/mechmind-os/infrastructure

# Avvia Metabase e il suo database
docker-compose -f docker-compose.metabase.yml up -d

# Verifica lo stato
docker-compose -f docker-compose.metabase.yml ps
docker-compose -f docker-compose.metabase.yml logs -f metabase
```

### 2. Setup Iniziale

1. Accedi a Metabase: http://localhost:3001
2. Completa il wizard di setup:
   - Language: Italiano
   - User: admin@mechmind.local (usa una password sicura)
   - Database: "I'll add my data later"

### 3. Configura la Connessione Database

In Metabase Admin > Databases > Add Database:

```yaml
Database type: PostgreSQL
Name: MechMind OS
Host: host.docker.internal  # o l'IP del tuo PostgreSQL
Port: 5432
Database name: mechmind     # nome del tuo database
Username: postgres          # o utente dedicato
Password: [tua password]
SSL: Disabilita per localhost
```

### 4. Configura le Viste Analytics

Le viste vengono create automaticamente all'avvio del container Metabase tramite lo script in `init-scripts/01-create-views.sql`.

Per verificare:
```sql
-- In Metabase SQL Editor o psql
SELECT * FROM analytics.dashboard_summary LIMIT 5;
SELECT * FROM analytics.daily_booking_metrics LIMIT 5;
```

## Configurazione

### Variabili d'Ambiente Backend

Aggiungi al file `.env` del backend:

```env
# Metabase Configuration
METABASE_URL=http://localhost:3001
METABASE_SECRET_KEY=change_this_to_a_32_character_secret_key
METABASE_EMBEDDING_ENABLED=true
METABASE_DB_PASSWORD=metabase_secure_password

# Frontend origin per CORS embedding
FRONTEND_URL=http://localhost:3000
```

**Importante**: `METABASE_SECRET_KEY` deve essere:
- Esattamente 32 caratteri per AES-256
- Uguale a `MB_ENCRYPTION_SECRET_KEY` in docker-compose
- Mantenuta segreta e non committata

### Genera una Secret Key Sicura

```bash
# Genera 32 caratteri random
openssl rand -base64 32 | cut -c1-32

# O usa Python
python3 -c "import secrets; print(secrets.token_urlsafe(32)[:32])"
```

### Configurazione Metabase Embedding

1. In Metabase, vai su **Admin settings > Embedding**
2. Abilita **Embedded analytics SDK**
3. Copia la **Secret Key** e incollala in `.env`
4. Aggiungi l'origine frontend: `http://localhost:3000`

## Dashboard Disponibili

### 1. Booking Overview (ID: 1)
**Metriche**: Prenotazioni giornaliere, tasso completamento, cancellazioni

**Viste SQL**:
- `analytics.daily_booking_metrics`
- `analytics.slot_utilization`

**KPI principali**:
- Total bookings per giorno
- Completion rate (%)
- Cancellation rate (%)
- Average duration

### 2. Revenue Analytics (ID: 2)
**Metriche**: Fatturato mensile, trend anno/anno, metodi di pagamento

**Viste SQL**:
- `analytics.monthly_revenue`
- `analytics.invoice_analytics`

**KPI principali**:
- Revenue mensile
- Paid vs Pending vs Unpaid
- Revenue per payment method
- Year-over-year growth

### 3. Customer Insights (ID: 3)
**Metriche**: Nuovi clienti, retention rate, LTV

**Viste SQL**:
- `analytics.customer_insights`
- `analytics.customer_cohorts`

**KPI principali**:
- New vs Returning customers
- Retention rate by cohort
- Customer LTV
- Days since last visit

### 4. Mechanic Performance (ID: 4)
**Metriche**: Ore lavorate, efficienza, revenue generato

**Viste SQL**:
- `analytics.mechanic_performance`

**KPI principali**:
- Hours worked per mechanic
- Utilization rate (%)
- Revenue generated
- Services completed

### 5. Vehicle Analytics (ID: 5)
**Metriche**: Servizi per marca/modello, trend stagionali

**Viste SQL**:
- `analytics.vehicle_analytics`
- `analytics.service_trends`

**KPI principali**:
- Services by make/model
- Average service cost
- Vehicle age distribution
- Service frequency

### 6. Executive Summary (ID: 6)
**Metriche**: KPI strategici riepilogativi

**Viste SQL**:
- `analytics.dashboard_summary`

**KPI principali**:
- Revenue (30d, 7d, today)
- Active customers
- Slot utilization
- Completion rate

## Row-Level Security

### Come funziona

Ogni vista include `tenant_id` che permette il filtraggio automatico:

```sql
-- Esempio: La vista daily_booking_metrics include tenant_id
SELECT * FROM analytics.daily_booking_metrics 
WHERE tenant_id = 'current-tenant-uuid';
```

### Configurazione RLS in Metabase

Per ogni dashboard, configura un filtro obbligatorio:

1. In Metabase, apri il dashboard
2. Click su **Edit** > **Filters**
3. Aggiungi filtro **Field Filter** → `tenant_id`
4. Imposta come **Required**
5. Nascondi il filtro nell'UI (locked filter)

### Parametri Embedding

Il backend include automaticamente `tenant_id` nel JWT:

```typescript
const payload = {
  resource: { dashboard: 1 },
  params: { 
    tenant_id: req.user.tenantId,  // Isolamento automatico
    user_id: req.user.id           // Audit trail
  },
  exp: Math.round(Date.now() / 1000) + 600
};
```

## Embedding

### API Endpoints

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/v1/analytics/metabase/dashboard-url?dashboard=overview` | URL firmato per dashboard |
| `GET /api/v1/analytics/metabase/question-url?questionId=1` | URL firmato per singola domanda |
| `GET /api/v1/analytics/metabase/config` | Configurazione Metabase |
| `GET /api/v1/analytics/metabase/health` | Health check |

### Frontend Integration

```tsx
import { MetabaseClient } from '@/app/dashboard/analytics/metabase-client'

// Singola dashboard
<MetabaseClient dashboard="overview" height={800} />

// Con selezione tabs
<MetabaseDashboardSelector defaultDashboard="revenue" />
```

### Renew Automatico

L'URL JWT scade dopo 10 minuti. Il frontend:
1. Richiede nuovo URL 2 minuti prima della scadenza
2. Aggiorna l'iframe senza ricaricare la pagina
3. Mostra stato di loading durante il refresh

## Troubleshooting

### Metabase non si avvia

```bash
# Controlla i log
docker-compose -f docker-compose.metabase.yml logs metabase

# Verifica la connessione al database Metabase
docker-compose -f docker-compose.metabase.yml exec postgres-metabase psql -U metabase -d metabase -c "\dt"

# Rimuovi e ricrea i volumi (attenzione: perde i dati Metabase)
docker-compose -f docker-compose.metabase.yml down -v
docker-compose -f docker-compose.metabase.yml up -d
```

### Embedding non funziona

1. **Verifica secret key**:
   ```bash
   # Deve essere identica in .env e docker-compose
   grep METABASE_SECRET_KEY backend/.env
   grep MB_ENCRYPTION_SECRET_KEY infrastructure/docker-compose.metabase.yml
   ```

2. **Verifica embedding abilitato**:
   - Admin Settings > Embedding > Enabled
   - Origine frontend corretta

3. **Verifica JWT**:
   ```bash
   # Decodifica il token per debug
   echo "YOUR_JWT_TOKEN" | cut -d'.' -f2 | base64 -d
   ```

### Dashboard non carica (blank iframe)

1. **Controlla CORS**:
   - Metabase Admin > Settings > General > Site URL deve matchare
   - Verifica `MB_EMBEDDING_APP_ORIGIN`

2. **Controlla tenant_id**:
   ```sql
   -- Verifica che il tenant esista nei dati
   SELECT DISTINCT tenant_id FROM bookings LIMIT 5;
   ```

3. **Verifica viste**:
   ```sql
   -- Le viste devono esistere
   SELECT * FROM analytics.dashboard_summary WHERE tenant_id = '...';
   ```

### Performance lenta

1. **Aggiungi indici** (se necessario):
   ```sql
   CREATE INDEX CONCURRENTLY idx_bookings_tenant_created 
   ON bookings(tenant_id, created_at);
   ```

2. **Materialized views** (per dataset grandi):
   ```sql
   CREATE MATERIALIZED VIEW analytics.mv_daily_metrics AS ...
   CREATE INDEX ON analytics.mv_daily_metrics(tenant_id, day);
   
   -- Refresh periodico
   REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_daily_metrics;
   ```

### Errori di connessione database

```bash
# Verifica che Metabase possa raggiungere il DB principale
docker-compose -f docker-compose.metabase.yml exec metabase ping host.docker.internal

# Se usi Docker Desktop, host.docker.internal dovrebbe funzionare
# Altrimenti usa l'IP del container:
docker network inspect mechmind-backend
```

## Manutenzione

### Backup

```bash
# Backup database Metabase
docker-compose -f docker-compose.metabase.yml exec postgres-metabase pg_dump -U metabase metabase > metabase_backup.sql

# Backup configurazione (se necessario)
docker cp mechmind-metabase:/metabase-data ./metabase-data-backup
```

### Aggiornamento

```bash
# Ferma i container
docker-compose -f docker-compose.metabase.yml down

# Aggiorna l'immagine
# Modifica docker-compose.metabase.yml con la nuova versione

# Riavvia
docker-compose -f docker-compose.metabase.yml up -d
```

## Security Best Practices

1. **Non esporre Metabase pubblicamente** - Usa solo embedding o VPN
2. **Ruota la secret key** periodicamente
3. **Usa HTTPS in produzione**
4. **Limita i permessi DB** - Crea utente read-only per Metabase
5. **Audita gli accessi** - Logga ogni richiesta embed

## Riferimenti

- [Metabase Embedding Docs](https://www.metabase.com/docs/latest/embedding/introduction)
- [Metabase API Reference](https://www.metabase.com/docs/latest/api/)
- [JWT Signing](https://www.metabase.com/docs/latest/embedding/static-embedding)

## Supporto

Per problemi o domande:
1. Controlla i log: `docker-compose logs -f metabase`
2. Verifica la configurazione con l'endpoint `/api/v1/analytics/metabase/health`
3. Consulta il team DevOps per problemi di infrastruttura
