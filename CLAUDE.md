## COMANDI
- Backend (porta 3002): `cd backend && npm run start:dev`
- Type check: `cd backend && npx tsc --noEmit`
- Lint: `cd backend && npm run lint`
- Backend test: `cd backend && npx jest --forceExit`
- Frontend (porta 3000): `cd frontend && npm run dev`
- Frontend test: `cd frontend && npx jest --coverage`
- Frontend test modulo: `npx jest --coverage --collectCoverageFrom='app/dashboard/MODULO/**/*.tsx'`
- Frontend test single: `npx jest --testPathPattern=nome`
- Docker: `docker compose up -d postgres redis`

## REGOLE NON NEGOZIABILI
- TenantId: OGNI query Prisma DEVE avere `where: { tenantId }`. MAI senza.
- PII: SOLO via EncryptionService (AES-256-CBC). MAI in chiaro.
- Booking: advisory lock + SERIALIZABLE. No race condition.
- Webhook: SEMPRE verifica firma. MAI fidarsi.
- State machine: `validateTransition()` per status.
- JWT: con `jti` per revocabilità. MAI secret hardcoded.
- TDD: test PRIMA, minimo 1 test per endpoint.
- Errori 500/404/warning = BUG. Fixa subito, MAI minimizzare.

## ANTI-MOCK
- Route API frontend (`app/api/*/route.ts`) → SOLO proxy al backend reale.
- Backend non risponde → errore 502, MAI dati finti.
- Endpoint mancante → CREALO nel backend. Pattern: `proxyToNestJS({ backendPath: 'v1/[resource]' })`

## PERFORMANCE
- **Turbopack** abilitato (`next dev --turbo`).
- **Prisma**: usa `select` esplicito. Evita `include` su tutto.
- **Redis**: BullMQ, cache, rate limiting.
- **Lazy loading** per route dashboard non critiche.
- **Bundle analysis** con `@next/bundle-analyzer`.

## MODELLO DI LAVORO CLAUDE CODE (ottimizzazione costi)
- **Routing modelli**: Sub-agent Haiku per grep, find, analisi coverage, parsing JSON (output ≤3 righe). Sonnet per scrittura test complessi.
- **Output minimo**: Vietati "Sure!", "I'll help", riepiloghi. ✅ / ❌ / ⚠️.
- **Gestione contesto**: Usa `/compact focus on [modulo]` prima di task pesanti. Dopo modulo completato, esegui `/clear`.
- **Target coverage moduli P0**: statements ≥80%, branches ≥75%.
- **Output accettabile**: `{"modulo":"Work Orders","statements":"95%","branches":"80%","esito":"SUCCESSO"}`

## PUNTI FRAGILI (SPOF)
1. CommonModule (PrismaService/EncryptionService) — SPOF, tutto dipende da qui.
2. RLS Policies — errore = data leak cross-tenant (GDPR).
3. ENCRYPTION_KEY — cambio = PII illeggibili.
4. Redis — SPOF per BullMQ/cache/pub-sub.
5. Booking concurrency — advisory lock.

## COMPACT INSTRUCTIONS
When using /compact, preserve: regole ANTI-MOCK, PUNTI FRAGILI, tenantId, TDD, state machine. Scarta: output di test passati, log di ricerca file, spiegazioni già risolte.

## RIFERIMENTI
- Indice documentazione: docs/README.md
- Catalogo errori: docs/09-ERROR-CATALOG.md
- Mappa dipendenze service: docs/11-DEPENDENCY-MAP.md
- Workflow PR: docs/12-PR-WORKFLOW-EXAMPLE.md
- Glossario: docs/05-DOMAIN-GLOSSARY.md
