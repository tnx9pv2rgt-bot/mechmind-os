---
name: audit-all
description: Wrapper unattended che esegue audit-modulo su TUTTI i moduli backend + TUTTO il frontend in batch da 4 (Mac mini 8GB). Chiama la skill audit-modulo esistente senza riscriverla. Aggiorna MODULI_NEXO.md al termine.
---

# audit-all — Audit Completo Backend + Frontend (Unattended)

> **Apri sempre con:** `🔁 audit-all avviato — backend + frontend completo.`

---

## REGOLA ZERO

Questa skill è un **puro orchestratore**. NON reimplementa alcuna logica di audit.
Per ogni modulo/area, **richiama la skill esistente `/audit-modulo`** con i parametri corretti.

La logica di qualità (15 quality gates, 6 assi backend, 8 assi frontend, coverage, mutation, security) vive interamente in:

```
.claude/skills/audit-modulo/SKILL.md
```

---

## LISTA MODULI BACKEND (50 moduli)

```
accounting, admin, ai-compliance, ai-diagnostic, ai-scheduling,
analytics, auth, benchmarking, booking, campaign, canned-job,
common, customer, declined-service, dvi, estimate, fleet, gdpr,
inventory-alerts, invoice, iot, kiosk, labor-guide, lib, location,
membership, middleware, notifications, obd, parts, payment-link,
payroll, peppol, portal, predictive-maintenance, production-board,
public-token, rentri, reviews, security-incident, services, sms,
subscription, tire, types, vehicle-history, voice,
webhook-subscription, webhooks, work-order
```

## LISTA AREE FRONTEND

```
app, components, hooks, lib
```

---

## ESECUZIONE

### FASE 1 — Backend (batch da 4, con worktree isolation)

Per ogni batch di 4 moduli, lancia 4 agenti paralleli con `isolation: "worktree"`:

```
Agent({ subagent_type: "general-purpose", isolation: "worktree",
  prompt: "Esegui la skill /audit-modulo per il modulo '<MODULO>'.
           Segui ESATTAMENTE le istruzioni in .claude/skills/audit-modulo/SKILL.md.
           Input: <MODULO>
           Al termine riporta: modulo, statements%, branches%, esito (✅/⚠️/❌), blockers."
})
```

**Ordine di priorità** (da più critico a meno critico, basato su MODULI_NEXO.md):

Batch 1:  webhooks, public-token, vehicle-history, sms
Batch 2:  security-incident, ai-scheduling, ai-compliance, production-board
Batch 3:  payroll, inventory-alerts, middleware, portal
Batch 4:  services, kiosk, location, fleet
Batch 5:  common, lib, labor-guide, webhook-subscription
Batch 6:  peppol, payment-link, rentri, declined-service
Batch 7:  admin, membership, parts, invoice
Batch 8:  ai-diagnostic, analytics, benchmarking, campaign
Batch 9:  canned-job, customer, dvi, gdpr
Batch 10: iot, notifications, obd, reviews
Batch 11: subscription, tire, voice, work-order
Batch 12: accounting, auth, booking, estimate (già OK ma reverifica)
Batch 13: predictive-maintenance, types (già OK, verifica)

### FASE 2 — Frontend (batch da 4)

```
Agent({ subagent_type: "general-purpose", isolation: "worktree",
  prompt: "Esegui la skill /audit-modulo con flag --frontend per l'area '<AREA>'.
           Segui ESATTAMENTE le istruzioni in .claude/skills/audit-modulo/SKILL.md.
           Verifica che ogni componente funzioni alla perfezione:
           RTL tests, axe accessibilità, Playwright E2E sui percorsi critici.
           Input: <AREA> --frontend
           Al termine riporta: area, esito per ogni componente, blockers."
})
```

Batch F1: app, components, hooks, lib  (4 agenti paralleli)

---

## REGOLA RISORSE (Mac mini 8GB)

- MAX 4 agenti in parallelo in un singolo message (rispetta il limite RAM)
- Ogni batch aspetta completamento prima del batch successivo
- Se un agente fallisce per OOM: re-esegui da solo (batch da 1)

---

## AGGIORNAMENTO MODULI_NEXO.md

Al termine di ogni batch, per ogni modulo completato scrivi in `MODULI_NEXO.md`:

```
| YYYY-MM-DD HH:MM | backend | <modulo> | audit-all | X% / Y% | ✅/⚠️/❌ |
```

---

## REPORT FINALE

Al completamento di tutti i batch, scrivi:

```
docs/audit-reports/audit-all-YYYY-MM-DD.md
```

Con:
- Totale moduli processati
- ✅ OK (≥90/90) / ⚠️ CEILING / ❌ FALLITI
- Lista blockers per ogni modulo con problemi
- Coverage delta rispetto a MODULI_NEXO.md precedente

---

## COME RICHIAMARE

```bash
# Dall'utente:
/audit-all

# Equivalente manuale per singolo modulo (usa audit-modulo direttamente):
/audit-modulo booking
/audit-modulo auth --frontend
```
