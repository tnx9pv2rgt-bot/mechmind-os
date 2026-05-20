# Incident Response Runbook

**Sistema:** Nexo Gestionale (ERP automotive multi-tenant)
**APM:** Sentry (`SENTRY_DSN` backend, `NEXT_PUBLIC_SENTRY_DSN` frontend)
**Aggiornato:** 2026-05-03

---

## Livelli di Severità

| Livello | Condizione | SLA Risposta | SLA Risoluzione |
|---------|-----------|-------------|-----------------|
| **P0** | Sistema down — tutti i tenant irraggiungibili | 15 min | 1 ora |
| **P1** | Funzione core rotta (booking, invoice, auth, pagamenti) | 30 min | 4 ore |
| **P2** | Degradazione parziale (lentezza >2s p95, funzione secondaria) | 2 ore | 24 ore |

---

## Escalation

```
Sentry alert (automatico, soglia: 1 errore 500 / 5 min)
  └─→ Email on-call (immediato)
        └─→ Se no ACK entro 15 min → chiamata telefonica
              └─→ Se P0 e no ACK entro 30 min → escalation CEO
```

**Alert configurati in Sentry:**
- Spike: >10 errori 5xx in 5 minuti → P1
- Spike: >50 errori 5xx in 5 minuti → P0
- New issue: qualsiasi nuovo errore → Slack #dev-alerts

---

## P0 Runbook — Sistema Down

```bash
# 1. Verifica stato servizi
curl -f https://api.nexo-gestionale.com/health || echo "BACKEND DOWN"
curl -f https://nexo-gestionale.com/api/health || echo "FRONTEND DOWN"

# 2. Verifica database
docker compose ps postgres redis
# Se down → riavvia
docker compose restart postgres redis

# 3. Verifica backend
docker compose ps backend
docker compose logs backend --tail=50
# Se OOM kill → scala memoria o riavvia
docker compose restart backend

# 4. Rollback se deploy recente ha causato il problema
git log --oneline -5
# Identifica ultimo commit stabile
git checkout <commit-hash>
docker compose up -d --build backend

# 5. Verifica recovery
curl -f https://api.nexo-gestionale.com/health
```

---

## P1 Runbook — Funzione Core Rotta

```bash
# 1. Identifica il modulo in Sentry → Issues → filter by transaction
# 2. Leggi stack trace completo — mai esporre ai clienti
# 3. Check database per migration recenti
cd backend && npx prisma migrate status

# 4. Check Redis
redis-cli ping  # → PONG
redis-cli info memory | grep used_memory_human

# 5. Rollback hotfix se necessario
git revert HEAD --no-edit
docker compose up -d --build backend

# 6. Notifica clienti se downtime > 30 min
# Aggiorna statuspage (Betteruptime / StatusPage)
```

---

## P2 Runbook — Degradazione

```bash
# 1. Identifica endpoint lento in Sentry → Performance → p95 latency
# 2. Check query lente PostgreSQL
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE state = 'active' AND query_start < now() - interval '5 seconds';

# 3. Check BullMQ queue backlog
redis-cli llen bull:email-queue
redis-cli llen bull:gdpr-export

# 4. Cache eviction
redis-cli info stats | grep evicted_keys

# 5. Restart worker se bloccato
docker compose restart worker
```

---

## Fire Drill Schedule

| Frequenza | Tipo | Responsabile |
|-----------|------|-------------|
| Mensile | Simulazione P1 (errore 500 controllato) | Lead dev |
| Trimestrale | Simulazione P0 (restart completo) | CTO |
| Semestrale | Full DR test (restore da backup) | Team ops |

---

## Post-Mortem Template

Dopo ogni P0/P1:
1. **Timeline:** cosa è successo e quando
2. **Root cause:** causa tecnica esatta
3. **Impact:** tenant/funzionalità/durata
4. **Fix:** cosa è stato fatto
5. **Prevention:** cosa evita la ricorrenza
6. **Action items:** TODO con owner e deadline

Template: `docs/runbooks/post-mortem-template.md`
