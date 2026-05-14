## BACKEND (NestJS) — regole path-scoped

Caricato on-demand quando Claude lavora su `backend/**`.

## Modulo
- Pattern: controller + service + dto/ + *.spec.ts.
- Controller: solo DTO `class-validator`, delega a service.
- Service: business logic, lancia eccezioni di dominio (`NotFoundException`, `ConflictException`, `BadRequestException`). MAI `HttpException` generica.
- `@TenantId()` decorator obbligatorio sugli endpoint tenant-scoped.

## Database (Prisma)
- Schema: `backend/prisma/schema.prisma`. Ogni tabella ha `tenantId String`.
- ID: `@default(uuid())`. Sempre `createdAt`/`updatedAt`. Soft delete: `deletedAt DateTime?`.
- Query: `where: { tenantId, ... }` SEMPRE. `include` parsimonioso (N+1). `select` su read-heavy.
- Multi-step mutation → transazione. Booking → `acquireAdvisoryLock` + `withSerializableTransaction`.
- Migration: `npx prisma migrate dev --name <name>`. Mai `migrate reset` senza conferma esplicita.

## Test
- Unit test affianco al service (`*.service.spec.ts`). TDD: failing test prima, poi implementazione.
- Mock `PrismaService` e service esterni. Non usare `mockResolvedValue` senza `Once` (vedi `.claude/rules/test-quality-gates.md`).
- Run: `cd backend && npx jest src/<modulo> --coverage --forceExit`.
- Soglia: Statements ≥90% AND Branches ≥90%.

## Sicurezza
- PII: solo `EncryptionService` (AES-256-CBC) + `hash()` per ricerca.
- Auth: `JwtAuthGuard` + `RolesGuard`. JWT con `jti` per revocabilità.
- GDPR: soft delete, audit log su mutation via domain events.
- MAI loggare PII, JWT, refresh token.
- Webhook: verifica HMAC-SHA256 prima di toccare il payload.

## Comandi rapidi
```bash
cd backend && npm run start:dev              # :3002
cd backend && npx tsc --noEmit               # type check
cd backend && npm run lint
cd backend && npx jest src/<modulo> --coverage --forceExit
```
