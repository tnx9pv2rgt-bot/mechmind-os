---
name: risposta-incidente
description: "Runbook strutturati per incident critici: payment failure, auth breach, data corruption, DB down, Redis down, webhook replay. Severity P0-P3. MTR <15min. Uso manuale in emergenza."
user-invocable: true
disable-model-invocation: true
effort: high
allowed-tools: ["Bash", "Read"]
argument-hint: "[payment|auth|db|redis|webhook|data-corruption]"
arguments: tipo
---

# Incident Response — Runbook Nexo Gestionale

## Classificazione Severity

| Severity | Definizione | MTR Target | Escalation |
|----------|------------|------------|-----------|
| P0 | Sistema completamente down / data breach | <15 min | Immediata |
| P1 | Funzionalità core degradata (pagamenti, booking) | <30 min | Entro 5 min |
| P2 | Funzionalità secondaria degradata | <2 ore | Entro 30 min |
| P3 | Problema cosmetic / warning | <24 ore | Next business day |

---

## RUNBOOK 1: Payment Failure (P0)

**Trigger**: Stripe webhook non ricevuto, pagamento non registrato, checkout fallisce.

### Diagnosi Immediata
```bash
# Log ultimi errori payment
cd backend && grep -n "stripe\|payment\|webhook" logs/app.log | tail -50

# Verifica firma webhook Stripe
grep -n "stripe-signature\|constructEvent\|STRIPE_WEBHOOK_SECRET" \
  backend/src/payment-link --include="*.ts" -r

# Stato queue BullMQ
redis-cli LLEN "bull:payment-webhook:waiting"
redis-cli LLEN "bull:payment-webhook:failed"
```

### Azioni Recovery
1. **Firma non valida**: Verifica `STRIPE_WEBHOOK_SECRET` in `.env` vs Stripe Dashboard
2. **Queue failure**: `redis-cli LRANGE "bull:payment-webhook:failed" 0 -1` → analizza payload
3. **Replay webhook**: Stripe Dashboard → Webhooks → resend failed events
4. **Manual reconcile**: Query Prisma per booking confermati senza payment record

### Rollback
```bash
# Se payment duplicati: soft-delete con audit log
# MAI eliminare fisicamente — compliance PCI DSS
```

### Post-Incident
- [ ] Aggiorna audit log con timeline
- [ ] Notifica clienti impattati
- [ ] Root cause analysis entro 24h

---

## RUNBOOK 2: Auth Breach / Token Compromise (P0)

**Trigger**: Accesso non autorizzato rilevato, token JWT trapelato, rate limit anomalo.

### Diagnosi Immediata
```bash
# Login anomali ultimi 60 min
grep -n "401\|403\|jwtId\|invalidate" logs/app.log | tail -100

# Rate limit hits
redis-cli KEYS "throttle:*" | head -20
redis-cli GET "throttle:IP_SOSPETTO"

# Token attivi per utente sospetto
grep -n "jti\|tokenBlacklist\|revokeToken" \
  backend/src/auth --include="*.ts" -r
```

### Azioni Recovery (ordine critico)
1. **Revoca token**: Aggiungi `jti` a blacklist Redis → `SET jwt:blacklist:JTI_VALUE 1 EX 86400`
2. **Force logout**: Invalida tutti i token del tenant compromesso
3. **Reset secret**: Ruota `JWT_SECRET` → richiede re-login tutti gli utenti
4. **Lock account**: `UPDATE users SET locked_at = NOW() WHERE id = 'USER_ID'`
5. **Audit trail**: Tutti gli accessi dell'account nelle ultime 24h

### GDPR Obbligatorio
- [ ] Notifica DPA (Garante Privacy) entro 72h se breach confermato (Art.33 GDPR)
- [ ] Notifica utenti impattati entro 72h (Art.34 GDPR)
- [ ] Documenta: data breach, dati impattati, misure adottate

---

## RUNBOOK 3: Database Down (P0)

**Trigger**: `ECONNREFUSED` su porta 5432, `prisma.$connect()` fallisce, healthcheck rosso.

### Diagnosi
```bash
# Test connessione
docker ps | grep postgres
docker logs nexo-postgres --tail 50

# Connection string
echo $DATABASE_URL | sed 's/:[^:]*@/:*****@/'

# Tentativo connessione diretto
pg_isready -h localhost -p 5432

# Prisma connection test
cd backend && node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$connect().then(() => console.log('OK')).catch(e => console.error(e));
"
```

### Recovery Steps
1. **Docker restart**: `docker compose restart postgres`
2. **Volume check**: `docker volume ls | grep nexo` → verifica volume non corrotto
3. **Backup restore** (se volume corrotto):
   ```bash
   docker compose down postgres
   docker volume rm nexo_postgres_data
   docker compose up -d postgres
   # Restore da backup: pg_restore -d mechmind backup.dump
   ```
4. **Connection pool**: Se DB up ma NestJS non connette → `pm2 restart backend` o riavvia container

### Circuit Breaker
- NestJS si riconnette automaticamente con retry exponential backoff
- Se down >5 min: attiva modalità read-only (cache Redis)

---

## RUNBOOK 4: Redis Down (P0/P1)

**Trigger**: BullMQ non processa job, rate limiter non funziona, cache miss totale.

### Diagnosi
```bash
docker ps | grep redis
docker logs nexo-redis --tail 20
redis-cli ping  # deve rispondere PONG

# Queue status
redis-cli INFO keyspace
redis-cli DBSIZE
```

### Recovery
1. **Restart**: `docker compose restart redis`
2. **Se dati persi**: Queue BullMQ si svuota — i job pending sono persi
   - Booking in stato PENDING dopo Redis down: verificare manualmente
   - Email non inviate: check log SMTP per gap temporale
3. **Persistenza**: Verifica `appendonly yes` in redis.conf

### Degraded Mode
- Rate limiting disabilitato → maggiore rischio DDoS
- Cache miss → DB load aumenta → monitora query time

---

## RUNBOOK 5: Webhook Replay Attack (P1)

**Trigger**: Stesso evento Stripe ricevuto più volte, booking duplicati, pagamenti duplicati.

### Diagnosi
```bash
# Webhook idempotency check
grep -n "idempotency\|eventId\|processedEvents\|stripeEventId" \
  backend/src/payment-link --include="*.ts" -r

# Redis idempotency keys
redis-cli KEYS "webhook:processed:*" | head -20

# Duplicati nel DB
# Query SQL: SELECT stripe_event_id, COUNT(*) FROM payments GROUP BY stripe_event_id HAVING COUNT(*) > 1
```

### Fix
1. **Blocca replay**: Ogni webhook DEVE essere registrato con `stripeEventId` unico
2. **Se duplicati esistono**: Soft-delete i duplicati, mantieni il primo (timestamp più vecchio)
3. **Compensation**: Rimborso automatico via Stripe se doppio addebito

---

## RUNBOOK 6: Data Corruption (P0)

**Trigger**: Dati inconsistenti (booking confermati senza slot, fatture senza importo, stato macchina invalido).

### Diagnosi
```bash
# Integrità referenziale
cd backend && npx prisma db execute --stdin <<EOF
SELECT COUNT(*) FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
WHERE c.id IS NULL;
EOF

# Stato macchina invalido
# Booking con status non valido
grep -n "BookingStatus\|WorkOrderStatus\|InvoiceStatus" \
  backend/prisma/schema.prisma
```

### Recovery
1. **Non eliminare mai** — soft-delete + audit log
2. **Fix stato**: Transizione manuale con `validateTransition` bypassata SOLO in migration
3. **Backup point**: Identifica last-known-good timestamp
4. **Prisma migrate**: Se schema corruption → `prisma migrate status`

---

## Template Post-Mortem (obbligatorio dopo ogni P0/P1)

```markdown
# Post-Mortem: [TITOLO INCIDENT]

**Data**: YYYY-MM-DD HH:MM
**Severity**: P0/P1
**Durata**: X minuti
**Impatto**: N tenant / N operazioni

## Timeline
- HH:MM — Primo segnale
- HH:MM — Detection
- HH:MM — Response iniziata
- HH:MM — Risoluzione

## Root Cause
[Causa tecnica precisa]

## Cosa ha funzionato
- [Lista]

## Cosa NON ha funzionato  
- [Lista]

## Azioni Preventive
- [ ] [Action item con owner e deadline]
- [ ] [Action item con owner e deadline]
```
