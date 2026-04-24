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

## TEST GENERATION WORKFLOW (⚡ CRITICO)
- **Correggi PRIMA di misurare**: Quando generi test con `/genera-test`, DEVI correggere TypeScript + ESLint PRIMA di coverage
- **NO errori TS/ESLint nei test**: `tsc --noEmit` e `eslint src --max-warnings 0` DEVONO passare 100%
- **Non skipparli**: Se vedi errori, risolvili. Non usare `@ts-ignore`, `// @ts-expect-error`, `any` nascosti
- **Verifica finale obbligatoria**: Prima di dire "done": `npx tsc --noEmit && npx eslint src --max-warnings 0 && npx jest --forceExit`
- **Dettagli**: `.claude/rules/test-generation.md`
- **NASA-Level Standards**: `.claude/rules/nasa-level-quality.md` (ciclomatic complexity ≤10, assertions ≥2/func, MC/DC coverage)
- **Complete Testing Strategy**: `.claude/rules/complete-testing-strategy.md` (V&V suite: unit→integration→E2E→load→security→regression→acceptance)
- **CI/CD Automation Status**: `.claude/rules/automation-status.md` (45% automated now, 95% target; roadmap for E2E + load + acceptance)

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
- **Log automatico OBBLIGATORIO**: Quando esegui `/genera-test <modulo>`, DEVI SEMPRE aggiornare `MODULI_NEXO.md` con log metriche (statements%, branches%, test count) nella sezione "Log completamenti automatici". Non è facoltativo — è parte del workflow. Formato: `| YYYY-MM-DD HH:MM | backend | <modulo> | <service/SUMMARY> | X% / Y% | ✅/⏳/❌ <descrizione> |`. Questo PRIMA di dire "completato".
- **WORKFLOW VERIFICATION STRICT**: (1) Genera test; (2) Verifica results CON COMANDI REALI DA TERMINALE (`npx jest src/<modulo> --coverage`); (3) Usa SOLO i numeri reali misurati, non le promesse dell'agent. MAI fidati dei coverage % riportati dall'agent — devono essere validati indipendentemente da terminale SEMPRE.
- **PARALLELIZZAZIONE INFINITA**: Esegui SEMPRE lavori in parallelo (multi-agent simultanei) per velocità massima. PERÒ: durante parallelizzazione APPLICA RIGOROSAMENTE tutte le regole 2026 (tenantId su OGNI query, PII via EncryptionService, no secrets hardcoded, OWASP gates, GDPR audit log, PCI webhook sig, coverage verification indipendente). Non è "veloci ma meno accurati" — è "veloci E rigorosissimi in parallelo".

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
