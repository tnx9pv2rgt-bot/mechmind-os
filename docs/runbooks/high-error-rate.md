# RUNBOOK: HighErrorRate
**Severity:** CRITICAL
**Alert:** `sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.01` per 2 minuti
**Impatto cliente:** Le officine vedono errori 500, le prenotazioni falliscono, la dashboard non carica
**SLO impattato:** Error rate < 0.1% (PRD target)

## Sintomi
- Grafana: spike nel pannello "Error Rate" sopra la linea rossa 1%
- Clienti: pagine bianche, toast "Errore del server", prenotazioni perse
- Prometheus: `http_requests_total{status_code="500"}` in crescita

## Cause probabili (in ordine di frequenza)

1. **Deploy in corso con bug** (40%) — codice nuovo ha un errore runtime
2. **Database connection pool esaurito** (25%) — troppe query concorrenti saturano il pool Prisma
3. **Redis down** (15%) — BullMQ e cache falliscono, catena di errori
4. **Migration fallita** (10%) — schema DB incoerente con il codice
5. **Memory leak / OOM** (10%) — processo Node.js ucciso dal OS

## Diagnosi (esegui in ordine, fermati quando trovi la causa)

### Check 1 — Deploy recente? (15 secondi)
```bash
# Controlla l'ultimo deploy su Render
# Oppure: git log --oneline -5 sul server
curl -s https://mechmind-backend.onrender.com/health | python3 -m json.tool
```
Risultato atteso: `{"status": "ok"}`
Se `status: "unhealthy"` o connection refused: vai a Fix 3 (Backend Down)

### Check 2 — Quale endpoint fallisce? (30 secondi)
```bash
# Su Prometheus/Grafana:
# Query: topk(5, sum by(path) (rate(http_requests_total{status_code=~"5.."}[5m])))
curl -s "http://localhost:9090/api/v1/query?query=topk(5,sum+by(path)(rate(http_requests_total{status_code=~%225..%22}[5m])))"
```
Se un solo endpoint: probabile bug nel codice di quell'endpoint
Se tutti gli endpoint: probabile DB o infrastruttura

### Check 3 — Database raggiungibile? (15 secondi)
```bash
curl -s https://mechmind-backend.onrender.com/health | python3 -c "
import sys,json
d = json.load(sys.stdin)
print(f'DB: {d[\"checks\"][\"database\"][\"status\"]}')
print(f'Redis: {d[\"checks\"][\"redis\"][\"status\"]}')
"
```
Se DB down: vai a Fix 2
Se Redis down: vai a Fix 4

### Check 4 — Errori nei log (30 secondi)
```bash
# Su Render Dashboard > Backend > Logs, filtra per "ERROR"
# Oppure Grafana Loki:
# {app="mechmind-backend"} |= "ERROR" | json | line_format "{{.msg}}"
```
Cerca: `PrismaClientKnownRequestError`, `ECONNREFUSED`, `ENOMEM`, stack traces

### Check 5 — RAM del processo (15 secondi)
```bash
curl -s https://mechmind-backend.onrender.com/metrics | grep "process_resident_memory_bytes"
# Se > 512MB: probabile memory leak
```

## Fix

### Fix 1 — Rollback deploy (effort: 2 minuti)
Se il problema e' iniziato dopo un deploy:
```bash
# Su Render Dashboard: Backend > Manual Deploy > seleziona commit precedente
# Oppure:
git revert HEAD && git push origin main
```
Verifica: error rate scende sotto 1% entro 2 minuti

### Fix 2 — Database connection pool (effort: 5 minuti)
```bash
# Controlla connessioni attive su Render PostgreSQL dashboard
# Se pool esaurito, riavvia il backend:
# Render Dashboard > Backend > Manual Deploy (stesso commit)
```
Verifica: `health.checks.database.status == "up"`

### Fix 3 — Riavvio backend (effort: 2 minuti)
```bash
# Render Dashboard > Backend > Manual Deploy (redeploy stesso commit)
```
Verifica: `/health` ritorna 200

### Fix 4 — Redis recovery (effort: 1 minuto)
```bash
# Redis e' gestito da Render, ha auto-recovery
# Se persistente: Render Dashboard > Redis > Restart
```
Verifica: `health.checks.redis.status == "up"`

## Escalation
- Se non risolto in **15 minuti**: contatta il team di sviluppo
- Se impatta **> 50% delle richieste**: considera la maintenance page
- Se dati corrotti: attiva il piano di disaster recovery (`docs/disaster-recovery-plan.md`)

## Post-mortem
Dopo la risoluzione, compila: `docs/runbooks/post-mortem-template.md`
