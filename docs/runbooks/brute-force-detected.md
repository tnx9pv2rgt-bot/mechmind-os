# RUNBOOK: BruteForceDetected
**Severity:** WARNING
**Alert:** `rate(auth_failures_total[1m]) > 0.333` per 1 minuto (> 20 failures/min)
**Impatto cliente:** Se attacco reale: rischio accesso non autorizzato ai dati delle officine. Se falso positivo: nessun impatto.
**SLO impattato:** Sicurezza — nessun accesso non autorizzato ai dati dei clienti

## Sintomi
- Grafana: spike nel pannello "Auth Failures" sopra 20/min
- Prometheus: `auth_failures_total` in crescita rapida
- Possibile: account bloccati (failedAttempts >= 5)

## Cause probabili (in ordine di frequenza)

1. **Utente che ha dimenticato la password** (40%) — riprova in loop, un singolo IP/email
2. **Test CI/CD con credenziali errate** (25%) — GitHub Actions o script automatici
3. **Attacco brute force reale** (20%) — multipli IP, multipli account target
4. **Bot/crawler** (10%) — tentativi automatizzati generici
5. **Integrazione esterna mal configurata** (5%) — API key scaduta o errata

## Diagnosi (esegui in ordine, fermati quando trovi la causa)

### Check 1 — Pattern dei failure (30 secondi)
```bash
# Prometheus: raggruppamento per reason
curl -s "http://localhost:9090/api/v1/query?query=sum+by(reason)(rate(auth_failures_total[5m]))"
```
- `invalid_credentials`: utente non trovato → possibile enumerazione
- `invalid_password`: utente esiste ma password errata → brute force su account specifico
- `invalid_tenant`: tenant sbagliato → probabile errore di configurazione

### Check 2 — IP di origine (1 minuto)
```bash
# Nei log (Render Dashboard > Logs oppure Loki):
# Cerca: "Invalid credentials" e filtra per IP
# {app="mechmind-backend"} |= "Invalid credentials" | json | line_format "{{.ip}} {{.email}}"
```
Se singolo IP: probabile utente confuso o bot singolo
Se multipli IP diversi: probabile attacco distribuito

### Check 3 — Account target (30 secondi)
```bash
# Nei log, cerca l'email target:
# {app="mechmind-backend"} |= "Failed login attempt" | json
```
Se singolo account: utente ha dimenticato la password → contattalo
Se multipli account: attacco reale

### Check 4 — E' un test CI? (15 secondi)
```bash
# Controlla se GitHub Actions sta eseguendo test:
# GitHub > Actions > workflows in esecuzione
# Se i test usano email/password di test su staging: falso positivo
```

## Fix

### Fix 1 — Falso positivo (utente confuso) (effort: 2 minuti)
```bash
# Nessuna azione tecnica necessaria
# Il rate limiter (5 tentativi/min) protegge gia' l'account
# L'account si sblocca automaticamente dopo il lockout
# Opzionale: contatta l'utente per suggerire il reset password
```

### Fix 2 — Attacco brute force reale (effort: 5 minuti)
```bash
# 1. Verifica che il rate limiter stia bloccando (429):
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status_code='429',path='/v1/auth/login'}[5m])"

# 2. Se l'attaccante bypassa il rate limiter (es. IP rotation):
#    Aggiungi l'IP al blocklist nel firewall Render/Cloudflare

# 3. Se l'attacco e' su account specifici:
#    Gli account si bloccano automaticamente dopo 5 tentativi
#    (failedAttempts >= MAX_FAILED_ATTEMPTS in auth.service.ts)
```

### Fix 3 — Notifica GDPR se dati esposti (effort: 15 minuti)
```bash
# Se un account e' stato effettivamente compromesso (login riuscito dopo brute force):
# 1. Revoca tutte le sessioni dell'utente
# 2. Forza il cambio password
# 3. Se dati PII esposti: notifica il Garante entro 72 ore (GDPR Art. 33)
# 4. Documenta l'incidente: docs/gdpr-incident-response.md
```

### Fix 4 — CI/CD fix (effort: 5 minuti)
Se il problema e' causato dai test automatici:
```bash
# 1. Aggiorna le credenziali nel workflow CI
# 2. Assicurati che i test usino un ambiente dedicato (staging)
# 3. Aggiungi un filtro all'alert per escludere IP del CI runner
```

## Escalation
- Se confermato attacco reale su **> 10 account**: allerta tutti gli sviluppatori
- Se un account e' stato **effettivamente compromesso**: GDPR incident response (`docs/gdpr-incident-response.md`)
- Se l'attacco persiste per **> 1 ora**: considera Cloudflare WAF rules o IP ban

## Post-mortem
Obbligatorio se un account e' stato compromesso.
Template: `docs/runbooks/post-mortem-template.md`
