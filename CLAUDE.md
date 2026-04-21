# CLAUDE.md — MechMind OS v10

## Identita'
Lead AI engineer di MechMind OS, SaaS multi-tenant per officine meccaniche italiane.
Stack: NestJS 10 + Prisma 5.22 + PostgreSQL 15 + Redis 7 | Next.js 14 + TailwindCSS + Radix UI.

## Regole Non-Negoziabili
- OGNI query Prisma → `where: { tenantId }`. MAI senza filtro tenant.
- PII → SOLO via EncryptionService (AES-256-CBC). MAI in chiaro nel DB.
- Booking → advisory lock + SERIALIZABLE. No race condition.
- Webhook → SEMPRE verifica firma. MAI fidarsi del payload.
- State machine → `validateTransition()` per entita' con status.
- JWT con `jti` per revocabilita'. MAI secret hardcoded.
- TDD: test PRIMA, minimo 1 test per endpoint.
- Errori (500/404/warning) = BUG. Fixa subito, non minimizzare MAI.

## Anti-Mock — Hook-Enforced
- Route API frontend (`app/api/*/route.ts`) → SOLO proxy al backend NestJS reale
- Backend non risponde → errore 502, MAI dati finti
- Endpoint mancante → CREALO nel backend. Pattern: `proxyToNestJS({ backendPath: 'v1/[resource]' })`

## Come Lavorare
- Fine task: `npx tsc --noEmit && npm run lint && npx jest --forceExit`
- Backend modificato: curl endpoint, verifica 200.
- UI tutta in italiano. Dark mode + responsive. Touch target 44px.
- react-hook-form + Zod, SWR, toast (sonner), AlertDialog (Radix).
- Controller: DTO + @ApiProperty + @ApiTags. Service: domain exceptions.
- BullMQ per async (email, SMS, campagne, GDPR).

## Comandi
```bash
cd backend && npm run start:dev    # Backend (porta 3002)
cd backend && npx tsc --noEmit     # Type check
cd backend && npm run lint         # Lint
cd backend && npx jest --forceExit # Test
cd frontend && npm run dev         # Frontend (porta 3000)
docker compose up -d postgres redis
```

## Punti Fragili
1. CommonModule (PrismaService/EncryptionService) — SPOF, tutto dipende da qui
2. RLS Policies — errore = data leak cross-tenant (GDPR)
3. ENCRYPTION_KEY — cambio = PII illeggibili, nessun recovery
4. Redis — SPOF per BullMQ/cache/pub-sub, down = sistema degradato
5. Booking concurrency — advisory lock, modifiche incaute = deadlock

## Riferimenti
- Indice completo documentazione: docs/README.md
- Catalogo errori per modulo: docs/09-ERROR-CATALOG.md
- Mappa dipendenze service: docs/11-DEPENDENCY-MAP.md
- Architettura completa + numeri: docs/architecture/overview.md
- Workflow PR: docs/12-PR-WORKFLOW-EXAMPLE.md
- Glossario dominio officina: docs/05-DOMAIN-GLOSSARY.md

## Compact Instructions
Preserve: modified files, test output, current task, architectural decisions, error messages, file paths.
