---
name: fix-coverage
description: "DEPRECATA — sostituita da /audit-modulo. La generazione test e i 10 quality gate sono ora orchestrati da audit-modulo (Fase 2.1). Non usare più questa skill: chiama /audit-modulo {NOME_MODULO}."
when_to_use: "MAI. Sempre redirigere a /audit-modulo."
metadata:
  version: "2.0.0-deprecated"
  replaced_by: "audit-modulo"
  deprecated_on: "2026-04-29"
---

# fix-coverage — DEPRECATA

> **Apri sempre con questa riga:** `⚠️ fix-coverage skill DEPRECATA. Reindirizzo a /audit-modulo.`

## Cessazione

Dal 2026-04-29 questa skill **cessa di esistere come entità separata**. Tutte le sue funzionalità (generazione test Jest, 10 quality gate, mock once enforcement, ceiling protection, AST validation) sono state **assorbite dentro `/audit-modulo`** — Fase 2.1 "Generazione & Riparazione Autonoma Test".

## Cosa fare

Se l'utente o un'altra skill chiama `/fix-coverage NOME_MODULO`:

1. Rispondi: `⚠️ fix-coverage è stata sostituita da audit-modulo. Eseguo /audit-modulo NOME_MODULO.`
2. Esegui `/audit-modulo NOME_MODULO` con gli stessi argomenti.
3. NON eseguire la vecchia pipeline fix-coverage.
4. NON chiamare `tools/fix-coverage` (mai chiamato comunque).

## Mappatura legacy → audit-modulo

| Vecchio fix-coverage | Nuovo audit-modulo |
|----------------------|---------------------|
| Step 0 — Pre-flight TS | FASE 2.1 Gate 1 |
| Step 2 — Generazione test | FASE 2.1.a |
| Gate 1-9 | FASE 2.1.b (10 gate, +1 Determinism) |
| Step 10 — Update MODULI_NEXO.md | FASE 4.3 (.audit-decisions.jsonl append) |
| Step 11 — Report finale | FASE 4.4 (output a schermo) |

## Comando da emettere subito

```
/audit-modulo {NOME_MODULO}
```

Niente altro. La skill termina qui.
