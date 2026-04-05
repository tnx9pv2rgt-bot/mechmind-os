# RUNBOOK: CircuitBreakerOpen
**Severity:** CRITICAL
**Alert:** `circuit_breaker_state == 1` per 30 secondi
**Impatto cliente:** Richieste che dipendono dal servizio protetto ricevono 503 immediato.
**SLO impattato:** Availability — dipende da quale circuit breaker e' aperto

## Sintomi
- Grafana: circuit_breaker_state{service="prisma"} = 1 (o redis)
- Clienti: 503 "Database temporarily unavailable" o cache miss
- Backend: log `Circuit breaker OPEN for <service> — failing fast`

## Cause probabili (in ordine di frequenza)

1. **Database lento (query > 5s)** (35%) — carico elevato, lock contention, missing index
2. **Database irraggiungibile** (25%) — maintenance Render, network issue
3. **Redis irraggiungibile** (20%) — crash, OOM, maintenance
4. **Spike di traffico** (15%) — pool esaurito, timeout sulle connessioni
5. **Migration in corso** (5%) — tabella bloccata durante ALTER TABLE

## Diagnosi (esegui in ordine)

### Check 1 — Quale circuit breaker? (5 secondi)
```bash
curl -s http://localhost:3002/metrics | grep circuit_breaker_state
```
- `service="prisma"` = problema database
- `service="redis"` = problema cache/session

### Check 2 — Database status (15 secondi)
```bash
# Render Dashboard > PostgreSQL > Status
# Verifica stato e connessioni attive
curl -s "http://localhost:9090/api/v1/query?query=db_query_duration_seconds{quantile='0.95'}"
```
Se p95 > 5s: query lente, vai a Fix 2
Se database down: vai a Fix 3

### Check 3 — Redis status (15 secondi)
```bash
# Render Dashboard > Redis > Status
# Oppure:
redis-cli -u $REDIS_URL ping
```
Se PONG: Redis OK, il problema e' latenza
Se timeout: Redis down, vai a Fix 4

### Check 4 — Connection pool (15 secondi)
```bash
curl -s "http://localhost:9090/api/v1/query?query=process_open_fds"
```
Se file descriptors elevati: pool esaurito

## Fix

### Fix 1 — Aspetta il recovery automatico (effort: 0 minuti)
```bash
# Il circuit breaker entra in HALF-OPEN dopo resetTimeout (15s per Prisma, 10s per Redis)
# Se il servizio risponde, il circuito si chiude automaticamente
# Monitora: curl -s http://localhost:3002/metrics | grep circuit_breaker_state
```

### Fix 2 — Database lento (effort: 5 minuti)
```bash
# 1. Identifica query lente
# Render Dashboard > PostgreSQL > Logs oppure:
# SELECT pid, now() - pg_stat_activity.query_start AS duration, query
# FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC;

# 2. Kill query bloccante (se sicuro)
# SELECT pg_cancel_backend(<pid>);

# 3. Se missing index: crea ticket per domani
```

### Fix 3 — Database irraggiungibile (effort: 5 minuti)
```bash
# Render Dashboard > PostgreSQL > verificare stato
# Se maintenance: aspetta
# Se down: contatta supporto Render
# Fallback: il circuit breaker protegge le richieste, 503 e' meglio di 20s timeout
```

### Fix 4 — Redis down (effort: 2 minuti)
```bash
# Redis circuit breaker fallback e' graceful (return null = cache miss)
# Le richieste vanno a DB direttamente, piu' lento ma funzionante
# Render Dashboard > Redis > restart se necessario
```

## Escalation
- **Prisma CB open > 5 minuti**: attiva tutti gli sviluppatori, probabile issue DB serio
- **Redis CB open > 15 minuti**: degradazione accettabile, fix non urgente se fuori orario
- **Entrambi open**: EMERGENCY — infrastruttura down, contattare Render support

## Post-mortem
Obbligatorio se il circuit breaker Prisma resta aperto > 10 minuti.
Template: `docs/runbooks/post-mortem-template.md`
