---
name: ripara-file
description: Aggiusta la copertura test di un singolo file sotto 90%. Lavora in RAM, scrive su disco solo se tutto ok.
allowed-tools: ["Bash", "Read", "Edit", "Write", "Glob", "Grep"]
disable-model-invocation: true
user-invocable: true
context: fork
effort: high
timeout: 600
argument-hint: "<file-path> [--force] [--skip-verify]"
---

# Fix Coverage File — Single File Remediation

Increase test coverage for a single file to 90/90 (statements AND branches).

## Comando

```bash
/fix-coverage-file backend/src/customer/controllers/vehicle-document.controller.ts
/fix-coverage-file src/admin/roles.controller.ts --force
/fix-coverage-file src/notifications/gateways/notifications.gateway.ts --skip-verify
```

## Workflow

```
1. [Normalize Path] Convert input to absolute path + identify .spec.ts
2. [Measure] npx jest <file.spec.ts> --coverage --forceExit
   - Extract current statements %, branches %
   - Store baseline metrics
3. [Analyze] Read source file + .spec.ts
   - Identify uncovered lines/branches
   - Determine gap (target 90% - current)
4. [Generate] Create targeted test cases in /tmp/coverage-fix/
   - Focus on missing branches
   - Add edge cases, error paths
   - Min 2.5 assertions per test
5. [Verify] First quality gate (locally in /tmp)
   - tsc --noEmit on /tmp/*.spec.ts
   - eslint /tmp/*.spec.ts --max-warnings 0
   - Jest measure coverage again
6. [Copy] If coverage ≥90% → move to disk
   - cp /tmp/new-tests.spec.ts → original location
   - rm /tmp working directory
7. [Log] Update MODULI_NEXO.md
   - Add entry: | timestamp | backend | <module> | <file> | X% / Y% | ✅ FIXED (iter:N) |
8. [Report] Output: final coverage + iterations taken
9. [Ceiling] If 3 iterations max'd out <90%:
   - Log: ⏳ CEILING_ARCHITETTURALE
   - Reason: NestJS decorators? Guard logic? Abstract methods?
   - Save gap analysis to /tmp/<file>-CEILING.txt
```

## Gatekeeping

**Quality Gates (all must pass before disk write):**

```
✅ TypeScript strict (0 errors)
✅ ESLint (0 warnings on test file)
✅ Coverage Statements ≥90%
✅ Coverage Branches ≥90%
✅ Atomic safety (disk unchanged until gates pass)
```

**Iteration Limits:**
- Max 3 iterations
- Each iteration: generate tests, measure, verify gates
- If still <90% after iter 3 → flag CEILING + explain

## Failure Handling

| Condition | Action |
|-----------|--------|
| TypeScript error in test | Fix types, re-run iter |
| ESLint error | Fix lint, re-run iter |
| Coverage still <90% after 3 iter | Report CEILING + gap analysis |
| Source file is 0% (no tests) | Create baseline tests (not just branch fixes) |
| .spec.ts missing | Create new file |

## Output Examples

### Success (1 iteration)
```
✅ FIXED — vehicle-document.controller.ts

Baseline:  50.0% / 0.0%
Final:     90.0% / 92.3% ✅

Iterations: 1
Tests added: 12
Assertion density: 2.8

Updated: MODULI_NEXO.md
  | 2026-04-26 08:15 | backend | customer | vehicle-document.controller | 90.0% / 92.3% | ✅ FIXED (iter:1) |
```

### Success (multiple iterations)
```
✅ FIXED — admin/roles.controller.ts

Baseline:  50.0% / 50.0%
Iter 1:    75.3% / 65.2%
Iter 2:    88.5% / 87.1%
Iter 3:    92.8% / 90.5% ✅

Iterations: 3
Tests added: 28
Assertion density: 2.6

Updated: MODULI_NEXO.md
  | 2026-04-26 08:30 | backend | admin | roles.controller | 92.8% / 90.5% | ✅ FIXED (iter:3) |
```

### Ceiling (architectural limit)
```
⏳ CEILING_ARCHITETTURALE — notifications/gateways/notifications.gateway.ts

Baseline:  100.0% / 74.1%
Iter 1:    100.0% / 78.5%
Iter 2:    100.0% / 81.3%
Iter 3:    100.0% / 84.2% (gap: -5.8pp)

Gap Analysis:
  Root cause: NestJS @WebSocketGateway() decorator + event listener stubs
  Untestable paths:
    - Gateway.handleConnection (12 lines) — WebSocket lifecycle, not unit-testable
    - Logger.debug calls (3 paths) — structural, not logic
    - Error propagation (guard stubs) — mocked in service layer

Recommendation:
  - Move core logic to .service.ts (currently inline in gateway)
  - Extract @Guard() to separate decorator tests
  - Accept architectural ceiling at 84% branches (common for WebSocket/event gateways)

Saved: /tmp/notifications-gateway-CEILING.txt
```

## Options

- `--force` — Skip baseline check, proceed even if file already >90%
- `--skip-verify` — Write to disk without gate verification (not recommended)

---

**Last Updated:** 2026-04-26
**Standard:** 90/90 world-class with architectural ceiling documentation
