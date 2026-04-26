---
name: test-veloci
description: "Esegue test critici rapidi prima di ogni PR."
user-invocable: true
disable-model-invocation: false
effort: medium
allowed-tools: ["Bash", "Read", "Grep"]
---

# Regression Guard — Fast Critical Test Subset

## Filosofia

L'intera suite dura ~15 minuti. Per ogni PR, serve feedback in <3 minuti.
Questa skill esegue solo i test critici (TIER_1 + security + state machine) = ~10% del totale.

## Moduli Critici (P0 — sempre testati)

```
auth/           — sicurezza, JWT, rate limiting
booking/        — state machine, advisory lock, race condition
payment-link/   — Stripe webhook, firma, idempotenza
invoice/        — FatturaPA XML, calcoli fiscali
subscription/   — billing, dunning, metering
gdpr/           — data export, erasure, PII
common/         — PrismaService, EncryptionService (SPOF)
```

## STEP 1 — Esegui Regression Guard

```bash
cd backend && npx jest \
  --testPathPattern="src/(auth|booking|payment-link|invoice|subscription|gdpr|common)/" \
  --forceExit \
  --bail \
  --no-coverage \
  --silent \
  2>&1 | tail -20
```

Opzioni:
- `--bail` — si ferma al primo fallimento (fail fast)
- `--no-coverage` — più veloce, coverage non necessaria su PR check
- `--silent` — output solo fail, non tutto

## STEP 2 — Security Regression

```bash
cd backend && npx jest \
  --testNamePattern="CRITICAL|security|tenantId|SQL injection|auth breach|rate limit" \
  --testPathPattern="src/(auth|common|booking)/" \
  --forceExit \
  --bail \
  2>&1 | grep -E "PASS|FAIL|✓|✗|×"
```

## STEP 3 — State Machine Regression

```bash
cd backend && npx jest \
  --testNamePattern="transition|validateTransition|INVALID|state machine|advisory lock" \
  --testPathPattern="src/(booking|work-order|invoice|dvi)/" \
  --forceExit \
  --bail \
  2>&1 | grep -E "PASS|FAIL|Tests:"
```

## STEP 4 — Analisi Diff (Smart Selection)

```bash
# Trova i moduli modificati nel PR
CHANGED_MODULES=$(git diff --name-only origin/main...HEAD | \
  grep "^backend/src/" | \
  sed 's|backend/src/||' | \
  cut -d'/' -f1 | \
  sort -u)

echo "Moduli modificati: $CHANGED_MODULES"

# Esegui test solo per i moduli cambiati
for module in $CHANGED_MODULES; do
  echo "Testing $module..."
  cd backend && npx jest "src/$module" --forceExit --bail --silent 2>&1 | tail -5
done
```

## STEP 5 — Full Report

```bash
# Output strutturato per CI
cd backend && npx jest \
  --testPathPattern="src/(auth|booking|payment-link|invoice|subscription|gdpr|common)/" \
  --forceExit \
  --bail \
  --json \
  --outputFile=/tmp/regression-results.json 2>/dev/null

# Parse risultati
node -e "
const r = require('/tmp/regression-results.json');
console.log('REGRESSION GUARD RESULTS');
console.log('========================');
console.log('Total:', r.numTotalTests);
console.log('Passed:', r.numPassedTests);
console.log('Failed:', r.numFailedTests);
console.log('Duration:', (r.testResults.reduce((s, t) => s + t.perfStats.end - t.perfStats.start, 0) / 1000).toFixed(1) + 's');
console.log('');
if (r.numFailedTests > 0) {
  console.log('FAILED TESTS:');
  r.testResults
    .filter(t => t.status === 'failed')
    .forEach(t => {
      console.log('  ❌', t.testFilePath.split('/src/')[1]);
      t.testResults
        .filter(r => r.status === 'failed')
        .forEach(r => console.log('    →', r.fullName));
    });
  process.exit(1);
} else {
  console.log('✅ All critical tests passing');
}
"
```

## Integrazione CI (GitHub Actions)

```yaml
# Aggiungi a .github/workflows/ci.yml
regression-guard:
  name: Regression Guard (Fast)
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
  
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 20, cache: npm, cache-dependency-path: backend/package-lock.json }
    
    - run: npm ci
      working-directory: backend
    
    - name: Run critical tests
      run: |
        npx jest \
          --testPathPattern="src/(auth|booking|payment-link|invoice|subscription|gdpr|common)/" \
          --forceExit --bail --silent
      working-directory: backend
      
    - name: Comment on PR if failed
      if: failure()
      uses: actions/github-script@v7
      with:
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: '❌ **Regression Guard FAILED** — Critical tests failing. Fix before merge.'
          })
```

## Timing Benchmark

| Scope | Tests | Durata |
|-------|-------|--------|
| Full suite | ~800 | ~15 min |
| Regression guard | ~80 | ~2-3 min |
| Security only | ~20 | ~30 sec |
| Moduli diff-only | Variabile | ~1-5 min |

## Regole

- **Fail fast** (`--bail`): prima failure blocca tutto — non aspettare altri 200 test
- **No coverage** su regression guard: coverage su CI full suite, non qui
- **Sempre su PR**: mai mergiare senza regression guard verde
- **Aggiorna lista moduli** se aggiungi un nuovo TIER_1
