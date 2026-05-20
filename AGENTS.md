# AGENTS.md — Nexo Gestionale Agent Routing

## Model Selection by Task Type

| Task | Model | Rationale |
|------|-------|-----------|
| grep, find, file search, coverage analysis | haiku | Fast, cheap, no reasoning needed |
| Test writing, spec generation, fix-coverage | sonnet | Current session model — optimal for code gen |
| Architecture review, security audit, SPOF analysis | opus | Complex reasoning required |
| TypeScript/ESLint fix (simple) | haiku | Mechanical correction |
| TypeScript/ESLint fix (complex generics) | sonnet | Type inference reasoning |

## Batch Autonomous Runs

For fix-coverage batches on independent modules:
- Use `isolation: "worktree"` to avoid file conflicts between parallel agents
- Max 3 parallel agents (Haiku × 2 for exploration + Sonnet × 1 for writing)
- Each agent handles 1 module — no shared state

## Sub-agent Scope Rules

- **Explore agent**: read-only, grep/find only, no edits
- **fix-coverage agent**: one module at a time, writes only to `src/<module>/*.spec.ts`
- **ts-fixer agent**: reads TS errors, edits only affected files
- **db-auditor agent**: read-only, no edits

## Context Management

- `/compact` every 20 min in long runs
- Pass only the module name + file path to sub-agents — no full conversation history
- Sub-agent results: extract coverage % + gate results only, discard raw Jest output

## Token Optimization — Regole Obbligatorie

### Mai re-leggere file già in contesto
- Se l'utente ha mostrato il contenuto via `! cat` o `<bash-stdout>` → usa quello. Zero `Read` aggiuntivi.
- Se il file è già in `<system-reminder>` o nel chat → stesso file, zero `Read`.
- Prima di usare `Read`: verificare se il contenuto è già disponibile nel contesto.

### Bash sempre con pipe filter
```bash
# ❌ Spreco: output massiccio entra in contesto
cd backend && npx jest --coverage

# ✅ Corretto: solo ciò che serve
cd backend && npx jest src/booking --coverage --forceExit 2>&1 | grep -E "Statements|Branches"
cd backend && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
find backend/src -name "*.spec.ts" | grep booking | head -5
```

### Read con offset/limit per file grandi
```bash
# ❌ Spreco: carica 500 righe in contesto
Read(file_path, limit=500)

# ✅ Corretto: solo la sezione necessaria
Read(file_path, offset=100, limit=50)
```

### Batch > sequenziale
- 3 moduli in parallelo (worktree) > 3 moduli in sequenza = ~3× meno token setup/overhead.

## Nexo Domain Constraints (pass to every agent)

- `tenantId` in every Prisma `where` — non-negotiable
- PII only via EncryptionService — never plaintext
- State machine: `validateTransition()` on every status change
- Coverage target: Statements ≥90% AND Branches ≥90%
