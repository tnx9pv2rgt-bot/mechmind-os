## PROGETTO
ERP multi-tenant automotive (officine, fleet, gommisti). Stack: NestJS + Next.js + Prisma + PostgreSQL + Redis + BullMQ. Moduli: booking, invoice, GDPR, FatturaPa/PEPPOL, RENTRI, fleet, OBD, kiosk, AI.

## COMANDI
```bash
cd backend && npm run start:dev     # porta 3002
cd backend && npx tsc --noEmit      # type check
cd backend && npm run lint          # lint
cd backend && npx jest --forceExit  # test
cd frontend && npm run dev          # porta 3000
docker compose up -d postgres redis
bash .claude/scripts/TUTTI.sh       # tutti gli script
```

## REGOLE NON NEGOZIABILI
- tenantId: OGNI query Prisma → `where: { tenantId }`. MAI senza.
- PII: SOLO EncryptionService (AES-256-CBC). MAI in chiaro.
- Booking: advisory lock + SERIALIZABLE. No race condition.
- Webhook: verifica firma HMAC. MAI fidarsi del payload.
- State machine: `validateTransition()` per ogni cambio status.
- JWT: `jti` per revocabilità. MAI secret hardcoded.
- Errori 500/404/warning = BUG → fixa subito.

## LIMITE RISORSE (Mac mini 8GB RAM)
- MAX 4 processi paralleli: subagenti (Agent), bash background, Task concorrenti.
- Mai lanciare > 4 tool call paralleli che spawnano processi pesanti (jest, tsc, agent).
- Lettura/grep/find paralleli OK (leggeri). Build/test/agent → batch da 4 max.
- Se serve di più, esegui in serie. NO swap/OOM.

## ANTI-MOCK
`app/api/*/route.ts` → SOLO `proxyToNestJS({ backendPath: 'v1/[resource]' })`. Mai mock/demo/fake data.

## TEST
- Target: Statements ≥90% AND Branches ≥90% su tutti i moduli.
- Misura SEMPRE con terminale reale: `npx jest src/<modulo> --coverage --forceExit`. Mai fidarti di numeri agent.
- Log completamento: `MODULI_NEXO.md` → `| YYYY-MM-DD HH:MM | backend | <modulo> | audit-modulo | X% / Y% | ✅ |`
- Skill unica per qualità: `/audit-modulo {NOME_MODULO} [--frontend] [--e2e]`. Assorbe fix-coverage (Fase 2.1). NON chiamare `tools/fix-coverage` né la skill deprecata `/fix-coverage`.

## OUTPUT
- Vietati: "Sure!", "I'll help", riepiloghi post-task. Usa: ✅ / ❌ / ⚠️.
- Haiku: grep/find/analisi coverage. Sonnet: scrittura test/codice. Opus: review sicurezza/architettura.
- Batch paralleli su moduli indipendenti: `isolation: "worktree"`. `/compact` ogni 20 min.

## SPOF CRITICI
- tenantId mancante → data leak GDPR (OWASP A01)
- RLS errato → cross-tenant data leak
- ENCRYPTION_KEY cambiato → PII illeggibili
- Redis down → BullMQ/auth/rate-limit broken
- Advisory lock mancante → booking race condition
- HMAC webhook non verificato → payment loss (PCI)
- Errori unhandled → stack trace esposto (OWASP A10)

## COMPACT: preserva tenantId, ANTI-MOCK, SPOF, state machine, GDPR/PCI. Scarta: output test, log ricerca file.
## REFS: @docs/README.md | @docs/09-ERROR-CATALOG.md | @docs/11-DEPENDENCY-MAP.md | @docs/05-DOMAIN-GLOSSARY.md

## REGOLE OPERATIVE (dettaglio in .claude/rules/)
- Ramdisk + c8: → @.claude/rules/ramdisk-c8.md
- SILENZIO: ZERO output intermedi. Fine task: ≤6 righe (modulo, score, coverage, bloccanti, report, tempo).
- ROUTINE NOTTURNA: `bash .claude/scripts/full-scan.sh` ogni notte → `.claude/scans/`. Se CRITICAL>0: `/full-fix`.
