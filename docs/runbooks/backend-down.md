# RUNBOOK: BackendDown
**Severity:** CRITICAL
**Alert:** `up{job="mechmind-backend"} == 0` per 1 minuto
**Impatto cliente:** L'intera applicazione e' inaccessibile. Le officine non possono prenotare, gestire clienti, o usare nessuna funzionalita'.
**SLO impattato:** Uptime > 99.9% (43.8 min/mese di downtime ammesso)

## Sintomi
- Grafana: pannello "Backend Up" rosso
- Clienti: "Impossibile raggiungere il server", pagina bianca, 502 Bad Gateway
- Prometheus: target "mechmind-backend" in stato DOWN

## Cause probabili (in ordine di frequenza)

1. **Deploy in corso** (30%) — Render sta facendo il deploy, downtime temporaneo
2. **OOM (Out of Memory)** (25%) — Node.js superato il limite RAM, ucciso dal OS
3. **Uncaught exception** (20%) — errore non gestito che crasha il processo
4. **Database irraggiungibile** (15%) — Prisma non riesce a connettersi, startup fallisce
5. **Migration fallita** (10%) — `prisma migrate deploy` fallita, schema incoerente

## Diagnosi (esegui in ordine, fermati quando trovi la causa)

### Check 1 — E' un deploy in corso? (15 secondi)
```bash
# Render Dashboard > Backend > Events
# Cerca "Deploy started" negli ultimi 5 minuti
```
Se deploy in corso: aspetta 2-3 minuti per il completamento
Se nessun deploy: continua diagnosi

### Check 2 — Il processo risponde? (15 secondi)
```bash
curl -s -w "\nHTTP: %{http_code}" https://mechmind-backend.onrender.com/health --max-time 5
```
Se timeout: il processo e' crashato
Se 503: il DB e' down ma il processo e' vivo
Se 200: falso allarme, Prometheus non raggiunge il target

### Check 3 — Log di crash (30 secondi)
```bash
# Render Dashboard > Backend > Logs
# Cerca: "FATAL", "OOM", "Killed", "SIGKILL", "heap out of memory"
```
Se "heap out of memory": vai a Fix 2 (memory)
Se "ECONNREFUSED": vai a Fix 3 (DB)
Se stack trace JavaScript: vai a Fix 4 (bug fix)

### Check 4 — Memoria prima del crash (15 secondi)
```bash
# Se Prometheus ha ancora dati recenti:
curl -s "http://localhost:9090/api/v1/query?query=process_resident_memory_bytes{job='mechmind-backend'}"
# Se > 450MB prima del crash: probabile OOM
```

### Check 5 — Database status (15 secondi)
```bash
# Render Dashboard > PostgreSQL > Status
# Verifica che il DB sia attivo e raggiungibile
```

## Fix

### Fix 1 — Riavvio manuale (effort: 2 minuti)
```bash
# Render Dashboard > Backend > Manual Deploy (stesso commit)
```
Verifica: `/health` ritorna 200 entro 2 minuti

### Fix 2 — OOM fix temporaneo (effort: 5 minuti)
```bash
# Aumenta la RAM del piano Render:
# Render Dashboard > Backend > Settings > Instance Type
# Starter (512MB) → Standard (2GB)
# Oppure aggiungi variabile d'ambiente:
# NODE_OPTIONS=--max-old-space-size=384
```
Verifica: il processo non viene piu' ucciso
**Nota:** Questo e' un fix temporaneo. Trova e risolvi il memory leak.

### Fix 3 — Database recovery (effort: 5 minuti)
```bash
# Render Dashboard > PostgreSQL > verificare stato
# Se il DB e' in maintenance: aspetta
# Se il DB e' down: contatta supporto Render
```

### Fix 4 — Rollback a versione funzionante (effort: 3 minuti)
```bash
# Render Dashboard > Backend > Manual Deploy > seleziona ultimo commit stabile
# Oppure:
git revert HEAD && git push origin main
```
Verifica: il backend torna online con la versione precedente

### Fix 5 — Migration fix (effort: 10 minuti)
```bash
# Se la migration e' fallita:
# 1. Controlla lo stato delle migrations
npx prisma migrate status
# 2. Se bloccata, risolvi manualmente:
npx prisma migrate resolve --applied <migration_name>
# 3. Redeploy
```

## Escalation
- Se non risolto in **5 minuti**: attiva tutti gli sviluppatori
- Se non risolto in **15 minuti**: attiva la maintenance page (`frontend/app/maintenance/page.tsx`)
- Se dati corrotti: attiva il disaster recovery plan (`docs/disaster-recovery-plan.md`)
- **Ogni minuto di downtime conta per l'SLO mensile** (budget: 43.8 min/mese)

## Post-mortem
**OBBLIGATORIO** per ogni episodio BackendDown > 5 minuti.
Template: `docs/runbooks/post-mortem-template.md`
