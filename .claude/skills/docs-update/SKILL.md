---
name: docs-update
description: Aggiorna documentazione dopo modifiche. Usa quando hai aggiunto modulo, modello, endpoint, decisione architetturale, o procedura.
disable-model-invocation: true
allowed-tools: [Read, Write, Edit, Grep]
---

# Docs Update — Mappa Modifiche → Documenti

## Quale modifica → quale documento aggiornare

| Modifica | Documento da aggiornare |
|----------|------------------------|
| Nuovo modulo/controller | `docs/04-API-REFERENCE.md` + `docs/02-ARCHITECTURE.md` |
| Nuovo modello Prisma | `docs/02-ARCHITECTURE.md` (module map) |
| Decisione architetturale | `docs/03-ADR-DECISIONS.md` (nuovo ADR) |
| Nuovo termine business | `docs/05-DOMAIN-GLOSSARY.md` |
| Cambio convenzione | `docs/06-CODING-CONVENTIONS.md` |
| Cambio deploy/infra | `docs/07-DEPLOYMENT.md` |
| Cambio strategia test | `docs/08-TEST-STRATEGY.md` |
| Nuova domain exception | `docs/09-ERROR-CATALOG.md` |
| Nuova procedura operativa | `docs/10-RUNBOOK.md` |
| Nuova dipendenza tra servizi | `docs/11-DEPENDENCY-MAP.md` |

## Formato ADR (Architecture Decision Record)
```markdown
### ADR-XX: Titolo della decisione

**Status:** Accepted
**Date:** YYYY-MM-DD
**Context:** Perché è stata presa questa decisione
**Decision:** Cosa è stato deciso
**Consequences:** Cosa comporta (pro e contro)
```

## Formato endpoint in API Reference
```markdown
### VERB /v1/resource
- **Auth:** JWT Bearer
- **Query:** `page`, `limit`, `search`, `status`
- **Body:** `{ field: type }`
- **Response:** `{ data: T[], meta: { total, page, limit } }`
- **Errors:** 400 (validazione), 401 (non autenticato), 404 (non trovato)
```

## Regole
- Aggiorna docs NELLA STESSA PR del codice, non in PR separate
- Mantieni numerazione consistente (ADR-01, ADR-02, ...)
- Usa italiano per glossario e runbook, inglese per API reference
- Non documentare codice ovvio — documenta decisioni e procedure
