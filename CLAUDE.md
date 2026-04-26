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

## SKILL AUTOMATICHE
Quando ricevi un comando che corrisponde a una skill (es. /ripara-tutto, /genera-test, /ripara-file, /controlla-sicurezza, /verifica-gdpr), DEVI eseguire immediatamente la skill. NON analizzare, NON fare report preliminari. Esegui e basta.

## TEST GENERATION WORKFLOW (⚡ CRITICO)
- **Correggi PRIMA di misurare**: Quando generi test con `/genera-test`, DEVI correggere TypeScript + ESLint PRIMA di coverage
- **NO errori TS/ESLint nei test**: `tsc --noEmit` e `eslint src --max-warnings 0` DEVONO passare 100%
- **Non skipparli**: Se vedi errori, risolvili. Non usare `@ts-ignore`, `// @ts-expect-error`, `any` nascosti
- **Verifica finale obbligatoria**: Prima di dire "done": `npx tsc --noEmit && npx eslint src --max-warnings 0 && npx jest --forceExit`
- **🚨 COVERAGE VERIFICATION CRITICA**: MAI fidarsi dei numeri riportati dagli agent. SEMPRE misurare coverage da terminale CON COMANDI REALI: `npx jest src/<modulo> --coverage` e verificare i % effettivi PRIMA di loggare MODULI_NEXO.md. Se numeri non match: reject e regenerate.
- **Dettagli**: `.claude/rules/test-generation.md`
- **NASA-Level Standards**: `.claude/rules/nasa-level-quality.md` (ciclomatic complexity ≤10, assertions ≥2/func, MC/DC coverage)
- **Complete Testing Strategy**: `.claude/rules/complete-testing-strategy.md` (V&V suite: unit→integration→E2E→load→security→regression→acceptance)
- **CI/CD Automation Status**: `.claude/rules/automation-status.md` (45% automated now, 95% target; roadmap for E2E + load + acceptance)
- **Cyber Security 2026**: `.claude/rules/cyber-security-2026.md` (OWASP Top 10:2025, GDPR 2026, PCI DSS 4.0.1)

## REGOLE NON NEGOZIABILI
- TenantId: OGNI query Prisma DEVE avere `where: { tenantId }`. MAI senza.
- PII: SOLO via EncryptionService (AES-256-CBC). MAI in chiaro.
- Booking: advisory lock + SERIALIZABLE. No race condition.
- Webhook: SEMPRE verifica firma. MAI fidarsi.
- State machine: `validateTransition()` per status.
- JWT: con `jti` per revocabilità. MAI secret hardcoded.
- TDD: test PRIMA, minimo 1 test per endpoint.
- Errori 500/404/warning = BUG. Fixa subito, MAI minimizzare.
- **CYBER SECURITY**: OWASP A01-A10 test coverage, GDPR data export API, PCI DSS webhook verification, header security.

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

## MCP SERVER (2026 CONTEXT INTEGRATION)
- **Configuration**: `.mcp.json` in project root
- **Active servers**: postgres, github, fetch, filesystem
- **Pattern**: Claude can access live context (GitHub API, file system, external URLs)
- **Usage**: MCP servers enable real-time data fetching, PR analysis, external API integration
- **Security**: All MCP tools subject to same tenant isolation and PII encryption rules

## MODELLO DI LAVORO CLAUDE CODE (ottimizzazione costi)
- **Routing modelli**: Sub-agent Haiku per grep, find, analisi coverage, parsing JSON (output ≤3 righe). Sonnet per scrittura test complessi.
- **Output minimo**: Vietati "Sure!", "I'll help", riepiloghi. ✅ / ❌ / ⚠️.
- **Gestione contesto**: Usa `/compact focus on [modulo]` prima di task pesanti. Dopo modulo completato, esegui `/clear`.
- **🎯 TARGET COVERAGE (WORLD-CLASS STANDARD — APRIL 2026)**: ALL modules must achieve **Statements ≥90% ∧ Branches ≥90%** (no exceptions). This aligns with Google's "exemplary" standard, NASA/JPL critical systems, and best-in-class fintech/healthcare practices. Measured via real terminal commands: `npx jest src/<modulo> --coverage --forceExit`. Real numbers only — never trust agent-reported metrics.
- **Output accettabile**: `{"modulo":"Work Orders","statements":"95%","branches":"80%","esito":"SUCCESSO"}`
- **Log automatico OBBLIGATORIO**: Quando esegui `/genera-test <modulo>`, DEVI SEMPRE aggiornare `MODULI_NEXO.md` con log metriche (statements%, branches%, test count) nella sezione "Log completamenti automatici". Non è facoltativo — è parte del workflow. Formato: `| YYYY-MM-DD HH:MM | backend | <modulo> | <service/SUMMARY> | X% / Y% | ✅/⏳/❌ <descrizione> |`. Questo PRIMA di dire "completato".
- **WORKFLOW VERIFICATION STRICT**: (1) Genera test; (2) Verifica results CON COMANDI REALI DA TERMINALE (`npx jest src/<modulo> --coverage`); (3) Usa SOLO i numeri reali misurati, non le promesse dell'agent. MAI fidati dei coverage % riportati dall'agent — devono essere validati indipendentemente da terminale SEMPRE.

## PUNTI FRAGILI (SPOF)
1. CommonModule (PrismaService/EncryptionService) — SPOF, tutto dipende da qui.
2. RLS Policies — errore = data leak cross-tenant (GDPR).
3. ENCRYPTION_KEY — cambio = PII illeggibili.
4. Redis — SPOF per BullMQ/cache/pub-sub.
5. Booking concurrency — advisory lock.
6. Webhook Stripe — firma non verificata = payment loss (OWASP A08 + PCI).
7. Access control — missing tenantId = data leak (OWASP A01 + GDPR).
8. Exception handling — unhandled errors expose stack trace (OWASP A10).

## COMPACT INSTRUCTIONS
When using /compact, preserve: regole ANTI-MOCK, PUNTI FRAGILI, tenantId, TDD, state machine, CYBER SECURITY. Scarta: output di test passati, log di ricerca file, spiegazioni già risolte.

## RIFERIMENTI
- Indice documentazione: docs/README.md
- Catalogo errori: docs/09-ERROR-CATALOG.md
- Mappa dipendenze service: docs/11-DEPENDENCY-MAP.md
- Workflow PR: docs/12-PR-WORKFLOW-EXAMPLE.md
- Glossario: docs/05-DOMAIN-GLOSSARY.md

## COMANDI DISPONIBILI
I comandi / ora usano i nuovi script bash in .claude/scripts/.
Le vecchie skill sono state archiviate in .claude/skills-legacy/ e non sono più attive.
Per l'inventario completo: bash .claude/scripts/TUTTI.sh
