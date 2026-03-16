# MechMind OS v10

SaaS multi-tenant per officine meccaniche. NestJS 10 + Prisma 5.22 + PostgreSQL 15 (RLS) + Redis 7 (BullMQ) + Next.js 14 App Router + TailwindCSS + Radix UI.

## Docs Reference
- `docs/01-PROJECT-OVERVIEW.md` — Numeri chiave, stack, stato progetto
- `docs/02-ARCHITECTURE.md` — Module map, data flow, child models senza tenantId, security layers
- `docs/03-ADR-DECISIONS.md` — 11 ADR con rationale e conseguenze
- `docs/04-API-REFERENCE.md` — ~66 endpoint, paginazione, WebSocket
- `docs/05-DOMAIN-GLOSSARY.md` — 23 termini business + 12 tecnici + 8 enum
- `docs/06-CODING-CONVENTIONS.md` — Pattern controller/service/model/test, Zod schema, naming, commit
- `docs/07-DEPLOYMENT.md` — Platform map, env vars, CI/CD, health checks, monitoring Sentry
- `docs/08-TEST-STRATEGY.md` — Jest config, mock rules, coverage 80%, TDD workflow
- `docs/09-ERROR-CATALOG.md` — Domain exceptions per 14 moduli, 3 formati response
- `docs/10-RUNBOOK.md` — Procedure step-by-step per Redis down, encryption failure, RLS leak, DB down
- `docs/11-DEPENDENCY-MAP.md` — Grafo caller di ogni service critico (PrismaService, EncryptionService, RedisService)
- `docs/12-PR-WORKFLOW-EXAMPLE.md` — Esempio PR completa end-to-end: failing test → implementation → green test

## ⚠️ CHECKLIST — Prima di OGNI modifica

Rispondi a TUTTE e 6 prima di scrivere codice:

1. **Cosa fai?** (una frase)
2. **Quali file tocchi?**
3. **Cosa rischi di rompere?**
4. **C'è un modo più sicuro?**
5. **Rollback plan?**
6. **Hai letto i file coinvolti?** (`cat` i file prima di editarli)

## REGOLE INVIOLABILI

### Multi-Tenancy — CRITICAL
- JWT payload: `userId:tenantId`
- `TenantContextMiddleware` → `SET app.current_tenant` su PostgreSQL → RLS filtra automaticamente
- 63 modelli con `tenantId` diretto + 17 child models isolati via FK parent (80 totali)
- **NEVER** query senza contesto tenant
- **NEVER** creare un modello con query diretta senza `tenantId` (se è un child model, il parent DEVE averlo)
- Dopo modifiche allo schema: verificare SEMPRE che le RLS policies coprano la nuova tabella

### PII & Encryption — CRITICAL
- PII crittografati SOLO tramite `EncryptionService` (AES-256-CBC, random IV per record)
- Campi: `encryptedPhone`, `encryptedEmail`, `encryptedFirstName`, `encryptedLastName` + hash HMAC per ricerca
- **NEVER** crittografare manualmente (`crypto.createCipher*` nel tuo codice = errore)
- **NEVER** loggare dati PII decifrati
- **NEVER** leggere/scrivere/esporre file `.env`
- `ENCRYPTION_KEY` **non deve MAI cambiare** in prod (zero key rotation implementata)

### Database
- Tutte le tabelle: `tenantId`, `createdAt`, `updatedAt` (tranne i 17 child models documentati in `02-ARCHITECTURE.md`)
- Soft delete con `deletedAt DateTime?` per dati personali (GDPR)
- Transazioni obbligatorie per mutazioni multi-modello
- **NEVER** raw SQL. Solo Prisma Client. Eccezione: `$queryRaw` solo in PrismaService per advisory lock e RLS setup

### Booking Concurrency — FRAGILE
- Advisory lock PostgreSQL (`acquireAdvisoryLock`) + transazione SERIALIZABLE (`withSerializableTransaction`)
- Retry 3x su errore P2034 con delay incrementale
- **NEVER** modificare la logica di lock senza approvazione esplicita
- **NEVER** aggiungere query dentro `withSerializableTransaction` senza capire l'impatto su deadlock

### Validazione
- Controller: `class-validator` decoratori nei DTO + global `ValidationPipe` (whitelist, forbidNonWhitelisted)
- Service: `Zod` schema per business rules (es. "data nel futuro", "durata min 15 max 480")
- I due sistemi DEVONO essere sincronizzati: se aggiungi un campo al DTO, aggiungilo anche allo Zod schema

## Architettura Backend — 21 Moduli

```
AppModule
├── CommonModule (@Global)
│   ├── PrismaService        → DB + RLS + advisory lock + SERIALIZABLE
│   ├── EncryptionService    → AES-256-CBC PII
│   ├── RedisService         → ioredis, graceful degradation (isAvailable)
│   ├── QueueService         → BullMQ wrapper
│   ├── LoggerService        → Winston
│   ├── S3Service            → File upload
│   └── AdvisoryLockService  → Booking concurrency
├── AuthModule               → JWT, MFA TOTP, Passkey WebAuthn, OAuth, Magic Link
├── BookingModule            → Advisory lock + SERIALIZABLE
├── CustomerModule           → PII encrypted
├── SubscriptionModule       → Stripe, FeatureGuard, LimitGuard
├── GdprModule               → BullMQ: gdpr-deletion, gdpr-retention, gdpr-export
├── NotificationsModule      → email-queue, notification-queue
├── IotModule                → OBD WebSocket, LPR, Shop Floor, Vehicle Twin
├── VoiceModule, DviModule, ObdModule, PartsModule
├── AnalyticsModule, AdminModule
├── FleetModule, TireModule, EstimateModule
├── LaborGuideModule, AccountingModule
├── InvoiceModule, WorkOrderModule
```

## ⚠️ Punti Fragili — Leggi prima di toccare

1. **CommonModule** — Se PrismaService o EncryptionService crashano, tutto il backend crolla
2. **RLS Policies** — Un errore = data leak tra tenant (violazione GDPR). Vedere `docs/10-RUNBOOK.md`
3. **ENCRYPTION_KEY** — Se cambia, TUTTI i PII diventano illeggibili. Non esiste key rotation
4. **Redis** — SPOF: BullMQ, cache, pub/sub, rate limiting. RedisService degrada gracefully (isAvailable=false)
5. **Booking concurrency** — Advisory lock + SERIALIZABLE. Modifiche incaute = deadlock
6. **`mechmind-os/`** — Mirror del progetto. **NEVER** modificare

## Workflow: Come aggiungere una feature

Segui SEMPRE questo ordine. Esempio completo in `docs/12-PR-WORKFLOW-EXAMPLE.md`.

```
1. Scrivi il test che fallisce (RED)
   → *.spec.ts con Arrange/Act/Assert, mock con mockDeep<PrismaClient>()

2. Aggiungi migration Prisma (se serve nuovo modello/campo)
   → npx prisma migrate dev --name <nome>
   → Verifica: tenantId? createdAt/updatedAt? @@index([tenantId])? @@map("snake_case")?

3. Crea DTO (class-validator)
   → Create*Dto, Update*Dto, *ResponseDto
   → Decoratori: @IsUUID(), @IsString(), @IsOptional(), @ApiProperty()

4. Crea Zod schema (service-level)
   → Business rules: date nel futuro, range valori, dipendenze tra campi

5. Implementa Service
   → Zod parse → business logic → Prisma query con tenantId
   → Domain exceptions: NotFoundException, ConflictException, BadRequestException

6. Implementa Controller
   → @UseGuards(JwtAuthGuard), @TenantId(), @CurrentUser()
   → Return type esplicito, @HttpCode appropriato

7. Test verde (GREEN)
   → npm run test -- --testPathPattern=<modulo>

8. Refactor se necessario (BLUE)

9. Verifica completa:
   → npx tsc --noEmit (zero errori TS)
   → npm run lint (zero warning)
   → npm run test (tutti i test passano)
   → npm run build (build ok)
```

## Post-Session Cleanup

Esegui SEMPRE dopo sessioni che rimuovono file, pacchetti o provider:

```bash
rm -rf .next              # pulisce cache webpack
npm run lint              # rileva import rotti
npx tsc --noEmit          # errori TypeScript
npm run build             # build pulita
npm run dev               # zero errori runtime in console
```

Se uno step fallisce: risolvi prima di dichiarare completato.

## Naming Conventions

| Cosa | Convenzione | Esempio |
|------|-------------|---------|
| File | kebab-case | `booking.controller.ts` |
| Classe | PascalCase | `BookingService` |
| Metodo | camelCase | `findAvailableSlots()` |
| DTO | PascalCase + Dto | `CreateBookingDto` |
| Costanti | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Tabella DB (Prisma) | PascalCase + @@map | `Booking` → `@@map("bookings")` |
| Colonna DB | camelCase + @map | `tenantId` → `@map("tenant_id")` |
| Commit | type(scope): desc | `feat(booking): add slot check` |

## TypeScript Strict

- **NEVER** `any` — usa `unknown` + type guard
- **NEVER** `@ts-ignore` o `@ts-expect-error`
- Return types espliciti su tutti i metodi public
- Import order: Node → NestJS → Third-party → Internal (absolute @/) → Relative

## Errori Comuni da Evitare

- Query Prisma senza `where: { tenantId }` su modelli con tenantId diretto
- `throw new Error()` nei service — usa `NotFoundException`, `ConflictException`, `BadRequestException`
- Catch-and-swallow silenziosi — sempre re-throw o log + throw
- PII in log, response, o error messages
- Modifiche a `.env`, `ENCRYPTION_KEY`, `JWT_SECRET`
- `npm install` senza `--save-exact`

## Compact Instructions

Preserve across context: test output, code changes, file paths, architectural decisions, current task context, error messages, checklist answers.
