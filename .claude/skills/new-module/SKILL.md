---
name: new-module
description: Crea un nuovo modulo NestJS completo con controller, service, DTO e test. Usa quando chiesto di creare modulo, feature, o "aggiungi funzionalità X al backend".
allowed-tools: [Read, Write, Grep, Glob, "Bash(npx prisma *)", "Bash(npx jest *)", "Bash(npx tsc *)", "Bash(npm run lint*)"]
---

# Nuovo Modulo NestJS — Checklist OBBLIGATORIA

Usa i template in `templates/` come base. Sostituisci i placeholder:
- `__MODULE_NAME__` → NomePascalCase (es. `CannedJob`)
- `__MODULE_KEBAB__` → nome-kebab-case (es. `canned-job`)
- `__MODEL__` → nome modello Prisma (es. `cannedJob`)
- `__MODULE_PLURAL__` → plurale per route (es. `canned-jobs`)
- `__MODULE_SINGULAR_IT__` → singolare italiano (es. `lavoro predefinito`)

## Checklist (10 punti)

1. [ ] **Schema Prisma**: modello con `id`, `tenantId`, `createdAt`, `updatedAt`, `@@index([tenantId])`, `@@map("__MODULE_KEBAB__s")`
2. [ ] **Migration**: `npx prisma migrate dev --name add-__MODULE_KEBAB__`
3. [ ] **DTO**: `create-__MODULE_KEBAB__.dto.ts` e `update-__MODULE_KEBAB__.dto.ts` con `@ApiProperty` su ogni campo
4. [ ] **Service**: da `templates/service.ts.template` — CRUD completo con `tenantId` in ogni query
5. [ ] **Controller**: da `templates/controller.ts.template` — `@ApiTags`, `@UseGuards`, `@TenantId()`
6. [ ] **Module**: da `templates/module.ts.template` — registra controller + service
7. [ ] **Test service**: mock PrismaService, test CRUD (create, findAll, findOne, update, remove, not-found, wrong-tenant)
8. [ ] **Test controller**: mock service, test endpoint (status codes, validazione)
9. [ ] **Registra in AppModule**: aggiungi import in `backend/src/app.module.ts`
10. [ ] **Verifica**: `npx tsc --noEmit && npm run lint && npx jest --forceExit`

## Route frontend (opzionale)
Se richiesto, crea anche `frontend/app/api/__MODULE_KEBAB__/route.ts` con proxy pattern.
