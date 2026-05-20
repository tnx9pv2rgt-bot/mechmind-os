# @nexo/fix-coverage — DEPRECATA dal 2026-04-29

> **⚠️ NON USARE.** Sostituita da `/audit-modulo` (skill Claude Code) — Fase 2.1 "Generazione & Riparazione Autonoma Test".
>
> La skill `audit-modulo` esegue tutto internamente (Read/Write/Edit/Bash) senza spawn di subprocess esterni. Niente più `npx ts-node bin/fix-coverage.ts`.
>
> Tutti i 10 quality gate (TS, ESLint, c8, Stryker, flakiness, assertion density, mock-once, call-verify, property tests, **determinism**) sono ora orchestrati da `audit-modulo` insieme a Reconnaissance, Risk Classification e Decision Memory append-only (`.audit-decisions.jsonl`).
>
> Codice mantenuto come riferimento storico. Non più eseguito da nessun workflow attivo.

---

# (Storico) @nexo/fix-coverage

Production-grade test generation orchestrator for NestJS projects. Replaces the legacy `fix-coverage.sh` (1500-line bash monolith) with a typed, modular, testable pipeline.

## Why a rewrite?

The bash version had eight structural problems:

1. **Untestable monolith** — no unit boundaries, no integration tests of its own.
2. **Fragile parsing** — grep-based assertion counting produced false positives in strings/comments.
3. **Race conditions** — concurrent runs collided in shared cache directories.
4. **Mid-line truncation** — source files truncated mid-token, breaking signatures the model needed to read.
5. **Coverage scope bug** — measured coverage on the whole module, not on the target file.
6. **Silent tool degradation** — missing Stryker counted as `pass` instead of `not-applicable`.
7. **Pipeline duplication** — generate-path and cache-hit-path shared no code, drifted independently.
8. **No CI integration** — no JUnit, no JSON report, no exit codes that matched run state.

This package fixes all eight while keeping the public contract (a CLI that targets NestJS service/controller files and produces validated Jest specs).

## Installation

```bash
npm install -g @nexo/fix-coverage
# or, in a target project:
npm install -D @nexo/fix-coverage
```

## CLI usage

```bash
# Single file pattern
fix-coverage --project ./backend --globs 'src/booking/*.service.ts'

# All services + controllers, four parallel workers
fix-coverage --project ./backend \
  --globs 'src/**/*.service.ts' 'src/**/*.controller.ts' \
  --parallelism 4

# Dry run — simulate every gate without calling Claude or writing files
fix-coverage --project . --globs 'src/x/y.service.ts' --dry-run

# Resume an interrupted batch
fix-coverage --project . --globs 'src/**/*.service.ts'
# (`--no-resume` to ignore the checkpoint)

# Config-file driven
fix-coverage --project . --config fix-coverage.config.json
```

CLI exit codes:

| Code | Meaning |
| ---- | ------- |
| 0    | All targets passed (or were `ceiling`) |
| 1    | At least one target failed gates |
| 2    | Configuration / setup error before pipeline started |
| 130  | SIGINT (Ctrl-C) |
| 143  | SIGTERM |

## Programmatic API

```ts
import { runOrchestrator, parseRunConfig, FakeClaudeClient } from '@nexo/fix-coverage';

const cfg = parseRunConfig({
  projectRoot: process.cwd(),
  sourceGlobs: ['src/**/*.service.ts'],
  parallelism: 2,
  claude: { apiKey: process.env.ANTHROPIC_API_KEY },
});

// Production
const report = await runOrchestrator({ cfg });

// Test / offline mode — inject a fake client
const fake = new FakeClaudeClient(() => '```typescript\n/* test spec */\n```');
const dryReport = await runOrchestrator({ cfg, claude: fake });
```

## Quality gates

The pipeline runs **eight** gates per file in this order. Cheap static checks run first so we fail fast.

| Order | Gate         | What it checks                                                      | Status `not-applicable` when     |
| ----- | ------------ | ------------------------------------------------------------------- | -------------------------------- |
| 1     | typescript   | `tsc --noEmit` filtered to the spec file only                       | tsc unavailable in optional mode |
| 2     | eslint       | `eslint --max-warnings 0` on the spec                               | eslint not installed (optional)  |
| 3     | assertions   | `expect(...)` count ≥ N, AST-based — no comment/string false positives | gate disabled                |
| 4     | mocks        | No `mockResolvedValue` / `mockRejectedValue` outside `beforeEach`   | gate disabled                    |
| 5     | calls        | `toHaveBeenCalled*` ≥ 1 *only for tests that use mocks*             | no mock-using tests              |
| 6     | coverage     | Jest with `--collectCoverageFrom=<exact source>`; reads `coverage-summary.json` and validates the **target file's** stmts/branches | gate disabled |
| 7     | flakiness    | Spec passes N consecutive sequential runs                           | gate disabled                    |
| 8     | mutation     | Stryker mutation score ≥ N%                                         | Stryker not installed (optional) |

Each gate returns:

```ts
{
  gate: 'coverage',
  status: 'pass' | 'fail' | 'skipped' | 'not-applicable',
  message: 'statements 92%, branches 91%',
  metrics: { statements: 92, branches: 91, functions: 100, lines: 92 },
  durationMs: 4231,
  feedback?: 'optional excerpt the next attempt will see in its prompt'
}
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ bin/fix-coverage.ts          CLI entry, parses argv → RunConfig   │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│ core/orchestrator   wires deps, fan-out to bounded worker pool   │
│  ├─ utils/deps      verifies node, npx, tsc, jest (fail fast)    │
│  ├─ utils/signal    SIGINT/SIGTERM cleanup                       │
│  ├─ runner/module-discovery                                       │
│  ├─ runner/pool      p-limit + AbortController + global timeout  │
│  └─ runner/pipeline  (per file) generate → gates → retry         │
│       ├─ ast/source-truncate   AST-aware token budget shrink     │
│       ├─ claude/prompt         deterministic prompt construction │
│       ├─ claude/client         SDK wrapper + retry/backoff       │
│       ├─ claude/extract        parse-validated code extraction   │
│       └─ gates/*               eight independent gate strategies │
├──────────────────────────────────────────────────────────────────┤
│ core/checkpoint  per-file step, atomic writes, lockfile          │
│ core/cache       SHA-256 keyed; ceiling decisions outlive runs   │
│ reporters/{markdown,json,junit}                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Smart source truncation

When a source exceeds `claude.sourceTokenBudget`, we walk the AST with `ts-morph` and stub bodies in priority order — `private` → `protected` → strip comments → `public`. Signatures, decorators, imports, and exports are preserved verbatim. Only as a last resort do we trim by characters, and even then we cut at a newline boundary.

### Robust code extraction

`claude/extract.ts` rejects anything outside a fenced block. Multiple blocks are ranked (typescript > ts > untagged > everything else). Each candidate is parsed by ts-morph and rejected if it has *syntactic* errors (codes 1xxx). Type-resolution errors (codes 2xxx) are tolerated — the project's `tsc` will catch them in the typescript gate.

### Cache and resume

- **Checkpoint** (`.cache/fix-coverage/checkpoint.json`) — per-file last step + attempt count + error history. Atomically updated with proper-lockfile to support concurrent runs.
- **Cache** (`.cache/fix-coverage/fix-coverage.json`) — keyed by SHA-256 of the source. A `ceiling` entry is honoured forever, until the source changes. Any edit invalidates the entry automatically.

### Concurrency model

Bounded pool via `p-limit`. Per-file timeouts (each gate has its own); a global timeout aborts the pool via `AbortController`. SIGINT / SIGTERM handlers flush the cache and checkpoint before exiting with the conventional 130 / 143 codes.

### Reporters

Three reporters run in parallel after the pool completes:

- **Markdown** appends to `MODULI_NEXO.md` (or any path); rotates to a dated archive when over `markdownRotateLines`.
- **JSON** structured output with schema version for downstream consumers.
- **JUnit** XML for native ingestion by GitHub Actions, Jenkins, GitLab, CircleCI.

## Configuration reference

All fields validated by Zod at startup. Unknown fields are rejected; invalid types report exact paths.

```jsonc
{
  "projectRoot": ".",
  "sourceGlobs": ["src/**/*.service.ts", "src/**/*.controller.ts"],
  "testFilePattern": "{source}.spec.ts",
  "parallelism": 2,
  "dryRun": false,
  "resume": true,
  "maxAttempts": 3,
  "cacheDir": ".cache/fix-coverage",
  "reportDir": "reports/fix-coverage",
  "globalTimeoutMs": 1800000,
  "claude": {
    "model": "claude-opus-4-7",
    "maxTokens": 16000,
    "temperature": 0.2,
    "requestTimeoutMs": 180000,
    "maxRetries": 5,
    "backoffBaseMs": 1000,
    "backoffMaxMs": 60000,
    "sourceTokenBudget": 60000
  },
  "gates": {
    "typescript": { "enabled": true, "timeoutMs": 120000 },
    "eslint":     { "enabled": true, "timeoutMs": 120000, "maxWarnings": 0 },
    "coverage":   { "enabled": true, "timeoutMs": 300000,
                    "statementsThreshold": 90, "branchesThreshold": 90,
                    "functionsThreshold": 90, "linesThreshold": 90 },
    "flakiness":  { "enabled": true, "timeoutMs": 300000, "runs": 3 },
    "mutation":   { "enabled": true, "timeoutMs": 600000, "threshold": 80, "optional": true },
    "assertions": { "enabled": true, "minPerTest": 2 },
    "mocks":      { "enabled": true },
    "calls":      { "enabled": true, "requireOnlyWhenMocksPresent": true }
  },
  "reporters": {
    "markdown": true,
    "json": true,
    "junit": true,
    "markdownPath": "MODULI_NEXO.md",
    "markdownRotateLines": 2000
  }
}
```

## Testing

```bash
npm run test              # all tests
npm run test:unit         # fast unit tests only
npm run test:integration  # uses FakeClaudeClient end-to-end
npm run test:coverage     # 90/90 gate enforced via jest.config.ts
```

## Development

```bash
git clone <repo> && cd tools/fix-coverage
npm install
npm run dev -- --project ../../backend --globs 'src/booking/*.service.ts' --dry-run
```

## Edge cases handled

- Paths with spaces / unicode (everything routes through `utils/path.ts`, `path.join`/`relative` only).
- Symlinks (resolved to real paths; cache keys are content-hashed regardless).
- Concurrent invocations (`proper-lockfile` on cache and checkpoint).
- Network interruption (typed retry with backoff and `retry-after` honoring).
- API key exhausted (errors propagate; checkpoint records last-completed step for clean resume).
- Missing filesystem permissions (fail-fast at config validation).
- Concurrent edits to source while pipeline runs (checkpoint records the old hash; next run sees the new hash and re-processes).
- Binary files matched by globs (rejected before ts-morph sees them).
- Empty modules / no test targets discovered (returns `total: 0` with exit 0).
- Stryker / ESLint missing (gate returns `not-applicable`, not `pass`).

## License

MIT.
