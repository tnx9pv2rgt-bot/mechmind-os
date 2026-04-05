# RUNBOOK: HighP95Latency
**Severity:** WARNING
**Alert:** `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 0.5` per 5 minuti
**Impatto cliente:** Le officine sperimentano rallentamenti, le pagine caricano lentamente, timeout su operazioni lunghe
**SLO impattato:** p95 < 150ms (PRD target), p99 < 500ms

## Sintomi
- Grafana: pannello "p95 Latency" sopra 500ms per 5+ minuti
- Clienti: spinner che girano a lungo, timeout su prenotazioni
- Prometheus: `http_request_duration_seconds` con valori alti

## Cause probabili (in ordine di frequenza)

1. **Query Prisma lenta senza indice** (35%) — tabella cresciuta, full scan
2. **N+1 query** (25%) — findMany senza `include`, loop di query singole
3. **Redis cache miss dopo restart** (15%) — cold cache, tutte le richieste vanno al DB
4. **Connection pool contention** (15%) — troppi tenant attivi contemporaneamente
5. **BullMQ queue bloccata** (10%) — job processor lento rallenta il response path

## Diagnosi (esegui in ordine, fermati quando trovi la causa)

### Check 1 — Quale endpoint e' lento? (30 secondi)
```bash
# Prometheus: identifica gli endpoint con p95 > 500ms
# Query: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path))
curl -s "http://localhost:9090/api/v1/query?query=topk(5,histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket[5m]))by(le,path)))"
```
Se un singolo endpoint: probabile query lenta specifica
Se tutti: probabile DB o infrastruttura

### Check 2 — Database query duration (30 secondi)
```bash
# Controlla la metrica db_query_duration_seconds
curl -s https://mechmind-backend.onrender.com/metrics | grep "db_query_duration_seconds"
# Se p95 > 100ms: query lente a livello DB
```

### Check 3 — Event loop lag (15 secondi)
```bash
curl -s https://mechmind-backend.onrender.com/metrics | grep "nodejs_eventloop_lag_p99"
# Se > 100ms: il processo e' bloccato (CPU-bound o sync I/O)
```
Se event loop lag alto: probabile operazione sincrona bloccante o GC pressure

### Check 4 — Connessioni DB attive (30 secondi)
```bash
# Su Render PostgreSQL dashboard: controlla "Active Connections"
# Se vicino al limite (tipicamente 20-100): pool contention
```

### Check 5 — Redis latenza (15 secondi)
```bash
curl -s https://mechmind-backend.onrender.com/health | python3 -c "
import sys,json
d = json.load(sys.stdin)
print(f'Redis latency: {d[\"checks\"][\"redis\"].get(\"latency\", \"N/A\")}ms')
print(f'DB latency: {d[\"checks\"][\"database\"].get(\"latency\", \"N/A\")}ms')
"
```
Se Redis latency > 10ms: possibile network issue verso Redis

## Fix

### Fix 1 — Identifica e ottimizza query lenta (effort: 15-30 minuti)
```bash
# 1. Identifica l'endpoint lento da Check 1
# 2. Trova il service corrispondente nel codice
# 3. Controlla le query Prisma: cerca findMany senza where/take/skip
# 4. Aggiungi indice in schema.prisma se necessario:
#    @@index([tenantId, createdAt])
# 5. npx prisma migrate dev --name add-index-xxx
```
Verifica: p95 scende sotto 500ms entro 5 minuti

### Fix 2 — Redis cache warm-up (effort: 2 minuti)
Se il problema e' iniziato dopo un restart Redis:
```bash
# Il cache si riempie automaticamente con le richieste
# Aspetta 5-10 minuti per il warm-up naturale
# Se urgente: riavvia il backend per forzare il pre-load delle cache
```

### Fix 3 — Riavvio backend (effort: 2 minuti)
Se sospetti connection pool leak o memory issue:
```bash
# Render Dashboard > Backend > Manual Deploy (stesso commit)
```
Verifica: p95 torna sotto 150ms dopo il riavvio

## Escalation
- Se non risolto in **30 minuti**: analisi delle slow query con EXPLAIN ANALYZE
- Se impatta l'SLO giornaliero: prioritizza il fix come hotfix

## Post-mortem
Dopo la risoluzione, compila: `docs/runbooks/post-mortem-template.md`
