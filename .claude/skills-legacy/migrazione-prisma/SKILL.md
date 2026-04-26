---
name: migra-database
description: Genera e applica migrazioni Prisma con verifica sicurezza.
disable-model-invocation: true
allowed-tools: [Read, Write, "Bash(npx prisma *)", "Bash(npx jest *)", "Bash(npx tsc *)", "Bash(cat *)"]
---

# Prisma Migration — Workflow Sicuro

## 1. Backup stato attuale
```bash
npx prisma migrate status
```
Verifica che non ci siano migration pendenti.

## 2. Verifica test PRIMA della modifica
```bash
cd backend && npx jest --forceExit
```
Se falliscono → fixa PRIMA di toccare lo schema.

## 3. Modifica schema
File: `backend/prisma/schema.prisma`

### Obblighi su OGNI modello:
- `id String @id @default(uuid())`
- `tenantId String`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`
- `@@index([tenantId])`
- `@@map("nome_tabella_snake_case")`

### Relazioni:
- Sempre `onDelete` esplicito (Cascade, SetNull, Restrict)
- Child models: relazione con parent che ha tenantId

## 4. Genera migration
```bash
cd backend && npx prisma migrate dev --name <nome-descrittivo>
```

## 5. Verifica SQL generato
```bash
cat backend/prisma/migrations/<timestamp>_<nome>/migration.sql
```
Controlla:
- CREATE INDEX su tenantId
- NOT NULL su campi obbligatori
- DEFAULT values corretti
- No DROP TABLE/COLUMN accidentali

## 6. Verifica test DOPO la modifica
```bash
cd backend && npx tsc --noEmit && npx jest --forceExit
```

## 7. Aggiorna documentazione
Se aggiunto nuovo modello → aggiorna `docs/02-ARCHITECTURE.md`

## Regole
- MAI `npx prisma db push` in produzione
- MAI modificare migration già applicata
- MAI rimuovere colonne senza verificare dipendenze
- Sempre `npx prisma generate` dopo modifica schema
- Se rename colonna → usa migration a due step (add + copy + drop)
