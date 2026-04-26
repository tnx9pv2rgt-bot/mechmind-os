---
name: controlla-database
description: "Verifica indici, tenantId, query N+1 e crittografia PII nel database."
user-invocable: false
disable-model-invocation: false
effort: medium
allowed-tools: ["Read", "Bash", "Grep", "Glob"]
paths: ["backend/prisma/**", "backend/src/**/*.service.ts"]
---

# DB Integrity Audit — Prisma + PostgreSQL

Quando lavori su file `schema.prisma` o `*.service.ts`, esegui automaticamente questi controlli.

## CHECK 1 — TenantId su ogni tabella

```bash
# Trova modelli senza tenantId
node -e "
const fs = require('fs');
const schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');
const models = schema.match(/model \w+ \{[\s\S]*?\}/g) || [];
const missing = models.filter(m => !m.includes('tenantId'));
missing.forEach(m => console.log('MISSING tenantId:', m.match(/model (\w+)/)[1]));
"
```

**CRITICO**: Ogni tabella con dati business DEVE avere `tenantId String`.
Eccezioni ammesse: tabelle di sistema (`_prisma_migrations`, join tables pure).

## CHECK 2 — Index su tenantId + FK

```bash
# Trova FK senza index (N+1 risk)
grep -n "@@index\|@index\|@unique" backend/prisma/schema.prisma

# Verifica pattern index su tenantId
grep -A 2 "tenantId" backend/prisma/schema.prisma | grep "@@index\|@index"
```

Ogni `tenantId` DEVE avere un index: `@@index([tenantId])`.
Ogni FK usata in `where` o `orderBy` DEVE avere index.

Pattern obbligatorio:
```prisma
model Booking {
  id        String   @id @default(uuid())
  tenantId  String
  
  @@index([tenantId])           // ✅ filtro base
  @@index([tenantId, status])   // ✅ filtro comune  
  @@index([tenantId, createdAt])// ✅ sort comune
}
```

## CHECK 3 — Soft Delete Consistency

```bash
grep -n "deletedAt" backend/prisma/schema.prisma | grep -v "DateTime?"
```

Ogni tabella con `deletedAt` DEVE:
1. Avere `deletedAt DateTime?` (nullable)
2. Avere index: `@@index([tenantId, deletedAt])`
3. Avere `default: null` (non `@default(now())`)

Nelle query service:
```bash
# Verifica esclusione soft-deleted
grep -rn "findMany\|findFirst\|findUnique" \
  backend/src --include="*.service.ts" | grep -v "deletedAt.*null\|spec.ts" | head -20
```

## CHECK 4 — Transazioni Multi-Step

```bash
# Operazioni multi-modello SENZA transaction
grep -rn "prisma\.\w*\.create\|prisma\.\w*\.update" \
  backend/src --include="*.service.ts" -l | while read f; do
  count=$(grep -c "prisma\.\w*\.\(create\|update\|delete\)" "$f" 2>/dev/null || echo 0)
  if [ "$count" -gt 1 ]; then
    has_tx=$(grep -c "\$transaction" "$f" 2>/dev/null || echo 0)
    if [ "$has_tx" -eq 0 ]; then
      echo "WARNING: $f ha $count operazioni Prisma senza \$transaction"
    fi
  fi
done
```

**ALTO**: File con ≥2 operazioni Prisma DEVE usare `prisma.$transaction([...])`.

Pattern corretto:
```typescript
await this.prisma.$transaction([
  this.prisma.booking.update({ where: { id, tenantId }, data: { status } }),
  this.prisma.auditLog.create({ data: { ... } }),
]);
```

## CHECK 5 — PII Non Crittografata

```bash
# Campi PII nello schema
PII_FIELDS=$(grep -n "email\|phone\|name\|address\|fiscal\|iban\|license" \
  backend/prisma/schema.prisma | grep "String" | awk '{print $1}')

echo "Campi PII trovati:"
echo "$PII_FIELDS"

# Verifica encrypt nelle mutation
grep -rn "\.create\|\.update\|\.upsert" \
  backend/src --include="*.service.ts" | grep -v "spec.ts\|encrypt"
```

Se un service fa `create` o `update` con campi PII NON usa `encryptionService.encrypt()` → CRITICO.

## CHECK 6 — N+1 Query Detection

```bash
# Include su tutto (N+1 risk)
grep -rn "include:.*{" backend/src --include="*.service.ts" | grep -v "spec.ts"

# Select esplicito (pattern corretto)
grep -rn "select:.*{" backend/src --include="*.service.ts" | grep -v "spec.ts" | wc -l
```

Pattern sicuro:
```typescript
// ✅ Bene: select esplicito
prisma.booking.findMany({
  where: { tenantId },
  select: { id: true, status: true, customer: { select: { name: true } } }
})

// ❌ Male: include tutto
prisma.booking.findMany({
  where: { tenantId },
  include: { customer: true, workOrder: true, invoice: true }
})
```

## CHECK 7 — Raw SQL

```bash
grep -rn "\$queryRaw\|\$executeRaw\|queryRawUnsafe\|executeRawUnsafe" \
  backend/src --include="*.ts" | grep -v "spec.ts"
```

**CRITICO**: Zero `$queryRaw` / `$executeRaw` — rischio SQL injection.
Eccezione: `backend/prisma/migrations/` (migration scripts).

## REPORT

```
DB INTEGRITY AUDIT
Data: $(date)

tenantId Coverage: X/N tabelle ✅/❌
Index Coverage: X/N FK indicizzate ✅/❌
Soft Delete: X/N tabelle PII con soft-delete ✅/❌
Transactions: X file multi-step senza $transaction ✅/❌
PII Encryption: X campi PII non crittografati ✅/❌
N+1 Risk: X include senza select ✅/❌
Raw SQL: X occorrenze ✅/❌

CRITICI: [lista]
ALTI: [lista]
MEDI: [lista]
```
