# MechMind OS — Coding Conventions

**Ultimo aggiornamento:** 2026-04-04

## Naming

| Contesto | Convenzione | Esempio |
|----------|-------------|---------|
| File | `kebab-case` | `booking-slot.dto.ts` |
| Classi / DTO | `PascalCase` | `CreateBookingDto` |
| Metodi / variabili | `camelCase` | `findByTenantId()` |
| Costanti | `UPPER_SNAKE` | `MAX_RETRY_COUNT` |
| Tabelle Prisma | `PascalCase` | `WorkOrder` |
| Colonne Prisma | `camelCase` | `tenantId` |

## TypeScript

- Strict mode, zero `any`, zero `@ts-ignore`
- Return type esplicito su metodi pubblici
- Interfacce per shape, classi per DTO con class-validator
- Enum solo se usato in Prisma schema, altrimenti `as const`

## Backend (NestJS)

- Controller: DTO con `@ApiProperty` + `@ApiTags`, delega al service
- Service: business logic, lancia domain exception (mai `HttpException`)
- Guard: `JwtAuthGuard` + `RolesGuard` su ogni endpoint protetto
- `@TenantId()` decorator su ogni endpoint tenant-scoped
- Prisma only, no raw SQL. Ogni `where` include `tenantId`
- Transazioni per mutazioni multi-modello
- Advisory lock per booking (no race condition)
- PII via `EncryptionService` (AES-256-CBC), mai in chiaro
- Audit log su ogni mutazione via domain events
- BullMQ per operazioni async (email, SMS, campagne, GDPR)

## Frontend (Next.js 14)

- App Router, Server Components di default
- `"use client"` solo quando necessario (hooks, interattivita')
- Data fetching: SWR (client), fetch (server)
- Forms: react-hook-form + Zod
- UI: TailwindCSS + Radix UI (shadcn), toast via Sonner
- Route API: solo `proxyToNestJS()`, mai mock/demo data
- UI tutta in italiano, dark mode + responsive
- Touch target minimo 44px
- Loading/error/empty states obbligatori

## Testing

- TDD: test PRIMA, poi implementazione
- File test accanto al sorgente: `foo.service.spec.ts`
- Mock PrismaService e servizi esterni
- Minimo 1 test per endpoint
- Run: `npx jest --forceExit`

## Git

- Branch: `feature/`, `fix/`, `refactor/` + descrizione breve
- Commit message: tipo + descrizione concisa
- Pre-commit: `tsc --noEmit && lint && jest`
- Mai push diretto a main/master

## Sicurezza

- JWT RS256 con `jti` per revocabilita'
- Webhook: sempre verifica firma
- State machine: `validateTransition()` per entita' con status
- Mai secret hardcoded, mai log PII/token
- GDPR: soft delete, export, consent management
