# 📊 MODULI NEXO — Coverage Reale c8 (2026-05-01)

> Dati reali misurati con `npx c8 ... npx jest`. Nessuna invenzione.
> Target: Statements ≥90% AND Branches ≥90%

| Modulo | Statements% | Branches% | Stato |
|--------|------------|-----------|-------|
| accounting | 97.63 | 81.18 | ⚠️ DA FIXARE |
| admin | 93.63 | 75.96 | ⚠️ DA FIXARE |
| ai-compliance | 92.36 | 73.68 | ⚠️ DA FIXARE |
| ai-diagnostic | 96.66 | 85.10 | ⚠️ DA FIXARE |
| ai-scheduling | 93.26 | 72.44 | ⚠️ DA FIXARE |
| analytics | 97.57 | 85.95 | ⚠️ DA FIXARE |
| auth | 95.81 | 84.55 | ⚠️ DA FIXARE |
| benchmarking | 95.98 | 81.42 | ⚠️ DA FIXARE |
| booking | 97.35 | 85.22 | ⚠️ DA FIXARE |
| campaign | 96.95 | 82.92 | ⚠️ DA FIXARE |
| canned-job | 95.53 | 83.70 | ⚠️ DA FIXARE |
| common | 93.85 | 77.45 | ⚠️ DA FIXARE |
| customer | 95.78 | 86.56 | ⚠️ DA FIXARE |
| declined-service | 93.42 | 80.00 | ⚠️ DA FIXARE |
| dvi | 97.45 | 83.98 | ⚠️ DA FIXARE |
| estimate | 98.86 | 90.35 | ✅ OK |
| fleet | 97.61 | 75.86 | ⚠️ DA FIXARE |
| gdpr | 97.63 | 88.76 | ⚠️ DA FIXARE |
| inventory-alerts | 92.69 | 75.00 | ⚠️ DA FIXARE |
| invoice | 98.18 | 81.77 | ⚠️ DA FIXARE |
| iot | 98.38 | 80.63 | ⚠️ DA FIXARE |
| kiosk | 90.81 | 78.82 | ⚠️ DA FIXARE |
| labor-guide | 96.77 | 76.38 | ⚠️ DA FIXARE |
| lib | 93.97 | 78.57 | ⚠️ DA FIXARE |
| location | 96.03 | 73.91 | ⚠️ DA FIXARE |
| membership | 96.48 | 80.82 | ⚠️ DA FIXARE |
| middleware | 88.49 | 89.78 | ⚠️ DA FIXARE |
| notifications | 96.84 | 88.25 | ⚠️ DA FIXARE |
| obd | 98.05 | 89.54 | ⚠️ DA FIXARE |
| parts | 98.33 | 84.66 | ⚠️ DA FIXARE |
| payment-link | 93.22 | 81.94 | ⚠️ DA FIXARE |
| payroll | 96.69 | 74.46 | ⚠️ DA FIXARE |
| peppol | 92.76 | 76.92 | ⚠️ DA FIXARE |
| portal | 80.88 | 86.52 | ⚠️ DA FIXARE |
| predictive-maintenance | 95.70 | 90.83 | ✅ OK |
| production-board | 97.22 | 82.75 | ⚠️ DA FIXARE |
| public-token | 80.00 | 65.85 | ⚠️ DA FIXARE |
| rentri | 96.82 | 79.01 | ⚠️ DA FIXARE |
| reviews | 97.53 | 85.71 | ⚠️ DA FIXARE |
| security-incident | 97.21 | 75.75 | ⏳ CEILING_ACCEPTED |
| services | 88.70 | 77.62 | ⚠️ DA FIXARE |
| sms | 90.64 | 69.23 | ⚠️ DA FIXARE |
| subscription | 98.60 | 89.38 | ⚠️ DA FIXARE |
| tire | 95.83 | 79.03 | ⚠️ DA FIXARE |
| vehicle-history | 93.07 | 67.85 | ⚠️ DA FIXARE |
| voice | 96.26 | 83.25 | ⚠️ DA FIXARE |
| webhook-subscription | 96.90 | 75.32 | ⚠️ DA FIXARE |
| webhooks | 0.00 | 0.00 | ❌ NO TEST |
| work-order | 97.89 | 86.76 | ⚠️ DA FIXARE |

## Riepilogo

| Metrica | Valore |
|---------|--------|
| Totale moduli | 49 |
| ✅ OK (≥90% stmt AND ≥90% branch) | 2 |
| ⚠️ DA FIXARE | 46 |
| ❌ NO TEST | 1 (webhooks) |

## Priorità fix per Branches% (più lontani dal target)

| Modulo | Branches% | Gap |
|--------|-----------|-----|
| webhooks | 0.00 | -90pp |
| public-token | 65.85 | -24pp |
| vehicle-history | 67.85 | -22pp |
| sms | 69.23 | -21pp |
| security-incident | 75.75 | -14pp |
| ai-scheduling | 72.44 | -18pp |
| ai-compliance | 73.68 | -16pp |
| production-board | 82.75 | -7.25pp |
| payroll | 74.46 | -16pp |
| inventory-alerts | 75.00 | -15pp |

## Skill NASA (audit-modulo)

Tutte e 6 le regole obbligatorie verificate presenti in `.claude/skills/audit-modulo/SKILL.md`:

| # | Regola | Presente |
|---|--------|---------|
| 1 | tenantId in OGNI query Prisma | ✅ |
| 2 | PII solo via EncryptionService (AES-256-CBC) | ✅ |
| 3 | Webhook HMAC signature verification | ✅ |
| 4 | Booking advisory lock + SERIALIZABLE | ✅ |
| 5 | State machine validateTransition() su ogni status change | ✅ |
| 6 | JWT jti per revocabilità | ✅ |
