# File Ownership Matrix

> NASA principle: ONE writer per file. Concurrent writes = bug.
> Read access = unrestricted for all agents.
> Conflict on shared files → `nexo-architect` mediates.

## Single-writer ownership

| Path glob | Owner agent | Reason |
|-----------|-------------|--------|
| `CLAUDE.md` | nexo-architect | Architectural decisions |
| `backend/CLAUDE.md` | nexo-architect | Path-scoped rules root |
| `frontend/CLAUDE.md` | nexo-architect | Path-scoped rules root |
| `package.json`, `*/package.json` | nexo-architect | Dep management |
| `tsconfig*.json` | nexo-architect | TS config |
| `prisma/schema.prisma` | db-auditor + migration-specialist (sequential, never parallel) | Schema |
| `prisma/migrations/**` | migration-specialist | Migrations |
| `backend/src/**/*.ts` (non-spec) | backend-engineer | Backend code |
| `backend/src/**/*.spec.ts` | test-runner | Backend tests |
| `frontend/app/**/*.tsx` | frontend-engineer | Frontend pages |
| `frontend/components/**/*.tsx` | frontend-engineer | Components |
| `frontend/app/api/**/route.ts` | backend-engineer (proxy logic mirror) | API proxy |
| `frontend/lib/**/*.ts` | frontend-engineer | Utils |
| `frontend/hooks/**/*.ts` | frontend-engineer | Hooks |
| `tests/e2e/**` | test-runner | E2E |
| `.github/workflows/**` | devops-engineer | CI/CD |
| `Dockerfile*`, `docker-compose*.yml` | devops-engineer | Container |
| `.semgrep/rules/**` | security-auditor | SAST rules |
| `docs/architecture/**` | nexo-architect | Architecture docs |
| `docs/security/**` | security-auditor | Security reports |
| `docs/compliance/**` | compliance-officer | Compliance reports |
| `docs/eu/**` | compliance-officer | EU compliance |
| `docs/api/**`, `openapi.json` | tech-writer | API docs |
| `docs/runbooks/**` | incident-responder | Runbooks |
| `docs/audit-reports/**` | code-reviewer | Module audits |
| `i18n/**`, `frontend/locales/**` | i18n-agent | Translations |
| `MODULI_NEXO.md` | qa-lead (test-runner) | Coverage log |
| `.claude/teams/decisions.md` | nexo-architect | Decision log |
| `.claude/teams/tasks.jsonl` | (append-only, all agents claim) | Task list |
| `.claude/agent-memory/<name>/MEMORY.md` | agent `<name>` | Self-curated |

## Read-only for everyone except owner

| Path | Why |
|------|-----|
| `.env`, `.env.*` | secrets (deny read in settings) |
| `~/.ssh/**`, `~/.aws/**`, `~/.gnupg/**` | system secrets |

## Concurrency rules

1. **Worktree obbligatorio** per parallel feature: ogni teammate lavora in `git worktree add ../<feature>-<agent>`.
2. **Mai 2 agent sullo stesso file** in parallelo. Sequenziali: backend-engineer → test-runner → code-reviewer.
3. **Shared files** (package.json, tsconfig.json, schema.prisma): SOLO `nexo-architect`. Subagent richiedono modifica via mailbox.
4. **Hot files** (durante incident): `incident-responder` ha lock esclusivo via `.claude/teams/incident-lock` (touch + presence check).
