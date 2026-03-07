# Metabase BI Infrastructure

Configurazione Docker e script di inizializzazione per Metabase Business Intelligence.

## Struttura

```
metabase/
├── init-scripts/
│   └── 01-create-views.sql    # Viste SQL per analytics
├── .env.example               # Template configurazione
└── README.md                  # Questo file
```

## Quick Start

```bash
# Dalla directory infrastructure
cd /Users/romanogiovanni1993gmail.com/Desktop/PROGETTI/Nexo gestionale/mechmind-os/infrastructure

# Copia e configura le variabili d'ambiente
cp metabase/.env.example metabase/.env
# Modifica metabase/.env con i tuoi valori

# Avvia Metabase
docker-compose -f docker-compose.metabase.yml up -d

# Verifica
open http://localhost:3001
```

## Comandi Utili

```bash
# Log
docker-compose -f docker-compose.metabase.yml logs -f metabase

# Stop
docker-compose -f docker-compose.metabase.yml down

# Stop e rimuovi dati (attenzione!)
docker-compose -f docker-compose.metabase.yml down -v

# Aggiorna Metabase
docker-compose -f docker-compose.metabase.yml pull
docker-compose -f docker-compose.metabase.yml up -d

# Backup database Metabase
docker-compose -f docker-compose.metabase.yml exec postgres-metabase pg_dump -U metabase metabase > metabase_backup.sql
```

## Viste Analytics

Le viste vengono create automaticamente al primo avvio:

| Vista | Descrizione |
|-------|-------------|
| `analytics.daily_booking_metrics` | Metriche giornaliere prenotazioni |
| `analytics.monthly_revenue` | Fatturato mensile dettagliato |
| `analytics.customer_insights` | Analisi clienti e retention |
| `analytics.mechanic_performance` | Performance meccanici |
| `analytics.vehicle_analytics` | Analisi per marca/modello |
| `analytics.service_trends` | Trend servizi nel tempo |
| `analytics.slot_utilization` | Utilizzo slot prenotabili |
| `analytics.customer_cohorts` | Analisi cohort retention |
| `analytics.invoice_analytics` | Metriche fatturazione |
| `analytics.dashboard_summary` | Riepilogo KPI dashboard |

## Troubleshooting

### Porta 3001 già in uso

```bash
# Trova il processo che usa la porta
lsof -i :3001

# Oppure cambia porta in docker-compose.metabase.yml
ports:
  - "3002:3000"  # Usa porta 3002 invece di 3001
```

### Database connection failed

Verifica che il container possa raggiungere il database principale:

```bash
# Se PostgreSQL è in Docker
docker network connect mechmind-backend mechmind-metabase

# Test connessione
docker-compose -f docker-compose.metabase.yml exec metabase nc -zv postgres 5432
```

### JWT signing fallisce

Verifica che la secret key sia esattamente 32 caratteri:

```bash
# Conta caratteri
echo -n "your-secret-key" | wc -c

# Deve restituire 32
```

## Risorse

- [Metabase Docs](https://www.metabase.com/docs/)
- [Embedding Guide](https://www.metabase.com/docs/latest/embedding/introduction)
- [SQL Best Practices](https://www.metabase.com/learn/sql-questions)
