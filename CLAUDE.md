## PROGETTO

ERP multi-tenant automotive (officine, fleet, gommisti). Stack: NestJS + Next.js
14 + Prisma + PostgreSQL 15 + Redis 7 + BullMQ. Backend :3002, Frontend :3000.

## REGOLE NON NEGOZIABILI

- tenantId in OGNI query Prisma (`where: { tenantId }`). Mancante → data leak
  GDPR/OWASP A01.
- PII solo via EncryptionService (AES-256-CBC). Mai in chiaro nei
  log/DB/risposte.
- Booking: `acquireAdvisoryLock` + `withSerializableTransaction`. Mai senza.
- State change: `validateTransition(currentStatus, newStatus, transitions)`. Mai
  stati arbitrari.
- Webhook esterni: verifica HMAC-SHA256 prima di toccare il payload.
- JWT: `jti` obbligatorio, secret da env. Mai hardcoded.
- Frontend `app/api/*/route.ts`: solo `proxyToNestJS({ backendPath })`. Mai
  mock/demo/fake.
- TS strict: zero `any`, zero `@ts-ignore`, return type espliciti.
- 500/404/warning visibili = bug → fixare prima di chiudere il task.

## TEST

- Soglia: Statements ≥90% AND Branches ≥90% (misurata con
  `npx jest src/<modulo> --coverage --forceExit`, mai numeri stimati).
- Skill unica: `/audit-modulo <NOME>` (assorbe fix-coverage, deprecato).
- Log su `MODULI_NEXO.md`:
  `| YYYY-MM-DD HH:MM | backend | <mod> | audit-modulo | X% / Y% | ✅ |`.

## RISORSE

Mac mini 8GB → max 4 processi pesanti paralleli (Agent/jest/tsc/build).
Read/Grep paralleli illimitati.

## OUTPUT

Italiano, diretto. Vietato "Sure!"/"I'll help"/riepiloghi. Usa ✅/❌/⚠️. Fine
task ≤6 righe.

## SUBAGENT

Specifica sempre `model:`. Default: `haiku` (ricerca/grep), `sonnet`
(codice/test), `opus` (security/arch). Worktree isolation per batch
indipendenti.

## MEMORIA PROGETTO

- **Stato completo + roadmap + bug aperti**: `.claude/teams/PROJECT-MEMORY.md`
  (leggere a inizio sessione)
- **Coverage frontend E2E reale**: `frontend/e2e/COVERAGE-REAL.md`
- **Coverage backend (fonte di verità)**: `MODULI_NEXO.md`

## ON-DEMAND (leggi solo se rilevante al task)

- State machines & errori per modulo: `docs/09-ERROR-CATALOG.md`
- Domain enums: `prisma/schema.prisma` o `docs/05-DOMAIN-GLOSSARY.md`
- Caller graph dei service core (PrismaService, EncryptionService, RedisService,
  QueueService): `docs/11-DEPENDENCY-MAP.md`
- Ramdisk + c8 per `/audit-modulo`: `.claude/rules/ramdisk-c8.md`
- Path-scoped: `backend/CLAUDE.md`, `frontend/CLAUDE.md` (se esistenti)
- Audit storici: `docs/audit-reports/<modulo>-YYYY-MM-DD.md`
- Indice docs completo: `docs/README.md` (NON auto-importare, è 300 righe)
