---
name: security-review
description: Esegui security review. Usa quando si modifica auth, webhook, encryption, tenantId, o quando chiesto audit sicurezza.
disable-model-invocation: true
allowed-tools: [Read, Grep, Glob, "Bash(grep *)", "Bash(find *)", "Bash(cat *)", "Bash(bash .claude/skills/security-review/scripts/*)"]
---

# Security Review — Audit Automatizzato

## Step 1: Esegui audit automatico
```bash
bash .claude/skills/security-review/scripts/audit.sh
```

## Step 2: Review manuale

### Tenant isolation
Ogni risultato dello script senza `tenantId` = potenziale data leak.
Verifica se child model (docs/02-ARCHITECTURE.md).

### Webhook signatures
OGNI handler DEVE verificare firma. Stripe: `constructEvent()`. Twilio: `validateRequest()`.

### PII encryption
Campi phone, email, firstName, lastName DEVONO essere cifrati con EncryptionService (AES-256-CBC).

### Secrets hardcoded
MAI secret nel codice. Sempre da `process.env` con throw se mancante.

### JWT security
- `jti` per revocabilità
- Logout DEVE invalidare il token
- Token blacklist attiva

## Step 3: Report
Stampa report con:
- BLOCCANTI (data leak, secret esposti, webhook senza firma)
- WARNING (PII potenzialmente non cifrati, query sospette)
- OK (check superati)
