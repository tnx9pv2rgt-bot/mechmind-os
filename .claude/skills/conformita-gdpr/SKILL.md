---
name: conformita-gdpr
description: "Verifica automatica conformità GDPR Art.5/17/20/25 su tutti i moduli con PII. Controlla: EncryptionService, soft-delete, data export, consent, audit log, erasure, retention. Rischio multa max €20M."
user-invocable: true
disable-model-invocation: false
effort: high
context: fork
allowed-tools: ["Read", "Bash", "Grep", "Glob"]
paths: ["backend/src/gdpr/**", "backend/src/auth/**", "backend/src/customer/**", "backend/src/booking/**", "backend/prisma/schema.prisma"]
argument-hint: "[modulo|all]"
arguments: modulo
---

# GDPR Compliance Audit — Art.5/17/20/25 EU Regulation 2016/679

## Contesto Legale

Nexo Gestionale tratta dati personali di clienti di officine italiane.
Violazione GDPR → multa fino a €20.000.000 o 4% fatturato globale.

**Articoli applicabili:**
- Art.5: Principi trattamento (minimizzazione, accuratezza, integrità)
- Art.17: Diritto all'oblio (erasure)
- Art.20: Portabilità dei dati (export)
- Art.25: Privacy by Design (encryption, pseudonymization)
- Art.30: Registro delle attività (audit log)
- Art.32: Misure di sicurezza tecniche (AES-256, TLS)

## STEP 1 — Inventario PII

```bash
# Trova tutti i campi PII nello schema Prisma
grep -n "email\|phone\|name\|address\|fiscal\|vat\|iban\|license\|birth\|gender\|health" \
  backend/prisma/schema.prisma
```

Per ogni campo PII trovato, verifica:
- È crittografato con EncryptionService? (`encrypt` / `decrypt`)
- È protetto da RLS policy?
- Ha `deletedAt DateTime?` per soft-delete?

## STEP 2 — Verifica EncryptionService (Art.32)

```bash
# Campi PII devono passare per EncryptionService
grep -rn "encrypt\|decrypt\|EncryptionService" \
  backend/src/$ARGUMENTS --include="*.ts" | grep -v "spec.ts"

# ALLARME: PII in chiaro
grep -rn "\.email\s*=\|\.phone\s*=\|\.name\s*=" \
  backend/src/$ARGUMENTS --include="*.ts" | grep -v "encrypt\|spec.ts"
```

**CRITICO**: Ogni campo PII che va a DB DEVE passare per `encryptionService.encrypt()`.

## STEP 3 — Soft Delete (Art.17)

```bash
# Ogni modello con PII deve avere soft-delete
grep -n "deletedAt\|softDelete\|isDeleted" backend/prisma/schema.prisma

# Verifica che findMany/findFirst escludano i soft-deleted
grep -rn "deletedAt.*null\|where.*deletedAt" \
  backend/src/$ARGUMENTS --include="*.service.ts"
```

**CRITICO**: `findMany` senza `where: { deletedAt: null }` su tabelle con PII = GDPR violation.

## STEP 4 — Data Export / Portabilità (Art.20)

```bash
# Esiste endpoint export?
grep -rn "export\|dataExport\|portability" \
  backend/src/gdpr --include="*.ts"

# Formato: JSON machine-readable (non PDF)
grep -rn "application/json\|json()" \
  backend/src/gdpr --include="*.ts"
```

Deve esistere API: `GET /v1/gdpr/export/:customerId` che restituisce tutti i dati del cliente in JSON.

## STEP 5 — Right to Erasure (Art.17)

```bash
grep -rn "erase\|erasure\|rightToForget\|anonymize\|anonymis" \
  backend/src/gdpr --include="*.ts"
```

Deve esistere API: `DELETE /v1/gdpr/erase/:customerId` che:
1. Anonimizza i dati PII (non elimina fisicamente, per integrità referenziale)
2. Marca `deletedAt = now()`
3. Scrive audit log dell'operazione
4. Risponde entro 30 giorni (log timestamp)

## STEP 6 — Audit Log (Art.30)

```bash
# Ogni mutazione su PII deve generare audit event
grep -rn "AuditLog\|auditLog\|audit_log\|@AuditMutation" \
  backend/src/$ARGUMENTS --include="*.ts"

# Verifica campi audit log
grep -n "AuditLog\|AuditLogEntry" backend/prisma/schema.prisma
```

Campi obbligatori in AuditLog:
- `tenantId` — isolamento tenant
- `userId` — chi ha fatto l'operazione
- `action` — CREATE/UPDATE/DELETE
- `resourceType` — nome modello (Customer, Booking, etc.)
- `resourceId` — ID della risorsa
- `timestamp` — quando
- `ipAddress` — da dove (OWASP A09)
- `previousValue` / `newValue` — cosa è cambiato (criptati se PII)

## STEP 7 — Consent Management

```bash
grep -rn "consent\|Consent\|marketing\|newsletter\|gdpr_consent" \
  backend/src --include="*.ts" | grep -v "spec.ts"

grep -n "consent\|Consent" backend/prisma/schema.prisma
```

Se l'app invia marketing email/SMS, deve avere:
- Flag `marketingConsent` con timestamp
- Opt-in esplicito (non pre-checked)
- Revoca facile (1 click)

## STEP 8 — Retention Policy (Art.5)

```bash
grep -rn "retention\|retentionDays\|purge\|cleanup\|cron.*delete" \
  backend/src --include="*.ts"
```

Dati fiscali (fatture): 10 anni (obbligo normativo italiano)
Dati prenotazioni: max 3 anni (legittimo interesse)
Log di accesso: max 12 mesi

Deve esistere job schedulato (BullMQ/cron) per pulizia automatica.

## STEP 9 — Report Compliance

```
GDPR AUDIT REPORT — $ARGUMENTS
Data: $(date)

Art.32 ENCRYPTION:
  Campi PII trovati: N
  Crittografati: X/N ✅/❌

Art.17 SOFT-DELETE:
  Modelli con PII: N
  Con soft-delete: X/N ✅/❌

Art.20 DATA EXPORT:
  Endpoint export: ✅/❌
  Formato JSON: ✅/❌

Art.17 ERASURE:
  Endpoint erasure: ✅/❌
  Anonimizzazione: ✅/❌

Art.30 AUDIT LOG:
  Mutazioni tracciate: ✅/❌
  Campi obbligatori: X/8 ✅/❌

CONSENT:
  Modello consent: ✅/❌
  Revoca disponibile: ✅/❌

RETENTION:
  Policy configurata: ✅/❌
  Job schedulato: ✅/❌

VERDICT: ✅ COMPLIANT / ❌ VIOLATIONS FOUND (N critici)

VIOLAZIONI CRITICHE (blocca deploy):
  1. [descrizione]
  
VIOLAZIONI ALTE (fix entro 7 giorni):
  1. [descrizione]
```

## Severity Classification

| Violazione | Severity | Multa Potenziale |
|-----------|---------|-----------------|
| PII in chiaro nel DB | CRITICO | €20M |
| Missing soft-delete | CRITICO | €20M |
| Missing data export | ALTO | €10M |
| Missing erasure | ALTO | €10M |
| Audit log incompleto | ALTO | €5M |
| Missing consent | MEDIO | €2M |
| Missing retention | MEDIO | €1M |
