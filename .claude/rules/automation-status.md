# CI/CD Automation Status — NASA-Level

## ✅ GIÀ AUTOMATIZZATO (GitHub Actions)

### Livello 1: Unit Testing
```yaml
✅ TypeScript strict check (backend + frontend)
   - Triggers on: push to [main, develop], PR to main
   - Timeout: 30 min
   - Fail on: any error

✅ ESLint (backend + frontend)
   - Triggers on: push to [main, develop], PR to main
   - Timeout: 30 min
   - Fail on: any error

✅ Backend unit tests + coverage
   - Command: npx jest --forceExit --ci --bail --coverage
   - Database: PostgreSQL 15 (real, not mock)
   - Cache: Redis 7 (real)
   - Coverage artifacts uploaded

✅ Backend E2E tests
   - Separate job (depends on backend unit tests passing)
   - Config: test/jest-e2e.json
   - Database: PostgreSQL 15
   - Cache: Redis 7

✅ Frontend unit tests
   - Command: npx jest --passWithNoTests --forceExit --ci --bail
```

### Livello 5: Security Testing
```yaml
✅ Dependency audit (npm audit)
   - CRITICAL vulnerabilities → BLOCCA merge
   - HIGH vulnerabilities → WARNING
   - Artifacts: audit-report.json uploaded

✅ Semgrep SAST scan (custom + OWASP)
   - Custom rules: .semgrep/rules/ (tenant isolation, PII, async, standards)
   - Official: OWASP Top 10, TypeScript
   - Fail on: ERROR severity
   - PR comment: detailed report posted to PR

✅ License check
   - Fails on: GPL-2.0, GPL-3.0, AGPL-*, LGPL-* licenses
```

### Livello: Build & Deployment
```yaml
✅ Backend build
   - Compiles NestJS app
   - Fails if compilation errors

✅ Frontend build
   - Compiles Next.js app
   - Fails if build errors
```

---

## ❌ MANCANTE — DA AUTOMATIZZARE

### Livello 2: Integration Testing (Medium Priority)
**Attualmente:** ✅ Test E2E backend con DB reali
**Mancante:** ❌ Frontend-to-backend API route testing

```yaml
# Da aggiungere a .github/workflows/ci.yml
frontend-api-tests:
  name: Frontend API Integration
  runs-on: ubuntu-latest
  needs: backend
  
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: npm
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: npm ci
      working-directory: frontend
    
    - name: API route tests
      run: npm run test:api
      working-directory: frontend
      env:
        BACKEND_URL: http://localhost:3002
```

---

### Livello 3: Frontend E2E Tests (High Priority)
**Attualmente:** ❌ Nulla
**Impatto:** Non sappiamo se UI funziona end-to-end

```yaml
# Nuovo file: .github/workflows/e2e-frontend.yml
name: Frontend E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    name: Playwright E2E
    runs-on: ubuntu-latest
    needs: [backend, frontend]
    timeout-minutes: 30
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: mechmind
          POSTGRES_PASSWORD: mechmind
          POSTGRES_DB: mechmind_test
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      
      - name: Install backend dependencies
        run: npm ci
        working-directory: backend
      
      - name: Install frontend dependencies
        run: npm ci
        working-directory: frontend
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
        working-directory: frontend
      
      - name: Start backend server
        run: npm run start:test &
        working-directory: backend
        env:
          DATABASE_URL: postgresql://mechmind:mechmind@localhost:5432/mechmind_test
      
      - name: Wait for backend to be ready
        run: npx wait-on http://localhost:3002/health --timeout 30000
      
      - name: Run Playwright tests
        run: npx playwright test
        working-directory: frontend
        env:
          FRONTEND_URL: http://localhost:3000
          BACKEND_URL: http://localhost:3002
      
      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

---

### Livello 4: Performance Testing (Medium Priority)
**Attualmente:** ❌ Nulla
**Impatto:** Non sappiamo se sistema regge 100 utenti

```yaml
# Nuovo file: .github/workflows/performance.yml
name: Performance Testing

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly, Sunday midnight
  workflow_dispatch:

jobs:
  load-test:
    name: k6 Load Testing
    runs-on: ubuntu-latest
    needs: backend
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Start backend
        run: docker compose up -d postgres redis backend
        env:
          DATABASE_URL: postgresql://mechmind:mechmind@localhost:5432/mechmind_test
      
      - name: Run k6 load test
        uses: grafana/k6-action@v0.3.0
        with:
          filename: tests/load.js
          cloud: true  # Push results to Grafana Cloud
        env:
          K6_CLOUD_TOKEN: ${{ secrets.K6_CLOUD_TOKEN }}
```

---

### Livello 4: Frontend Performance (Medium Priority)
**Attualmente:** ❌ Nulla
**Impatto:** Non sappiamo se frontend è performante

```yaml
# Aggiungi a .github/workflows/ci.yml - frontend job
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    uploadArtifacts: true
    temporaryPublicStorage: true
    configPath: './frontend/lighthouserc.json'
```

---

### Livello 6: Regression Testing (Low Priority)
**Attualmente:** ⏱️ Eseguito tramite unit tests
**Miglioria:** Selezionare 10% test critici per faster feedback

```yaml
# Aggiungi a .github/workflows/ci.yml - backend job
- name: Critical path regression tests
  run: npx jest --testNamePattern="CRITICAL" --forceExit
  working-directory: backend
  if: github.event_name == 'pull_request'
```

---

### Livello 7: Acceptance Testing (Low Priority)
**Attualmente:** ❌ Nulla (checklist manuale)
**Miglioria:** Automatizzare pre-deployment checks

```yaml
# Nuovo file: .github/workflows/acceptance.yml
name: Acceptance Testing

on:
  workflow_run:
    workflows: [CI, Frontend E2E Tests, Performance Testing]
    types: [completed]

jobs:
  acceptance:
    name: Pre-Production Checklist
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'success'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Functional checks
        run: |
          echo "✅ All unit tests passed (from CI workflow)"
          echo "✅ All E2E tests passed (from E2E workflow)"
          echo "✅ No security vulnerabilities (from CI security gates)"
          echo "✅ No breaking changes (from regression tests)"
      
      - name: Create GitHub issue if checks failed
        if: failure()
        uses: actions/create-issue@v2
        with:
          title: Acceptance test failed — do not deploy
          body: |
            Acceptance checks failed. Review workflow logs:
            ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

---

## 🎯 Priorità Automatizzazione (By Impact & Effort)

| Priorità | Livello | Effort | Impact | Timeline |
|----------|---------|--------|--------|----------|
| 🔴 **HIGH** | Frontend E2E | 4 ore | Critical workflows don't break | This week |
| 🔴 **HIGH** | Frontend API integration | 2 ore | API routes work | This week |
| 🟠 **MEDIUM** | Load testing (k6) | 3 ore | Performance baseline | Next week |
| 🟠 **MEDIUM** | Lighthouse CI | 1 ora | Frontend performance regression | Next week |
| 🟡 **LOW** | Regression tests (10%) | 2 ore | Faster feedback on PRs | 2 weeks |
| 🟡 **LOW** | Acceptance checklist | 1 ora | Pre-deployment gate | 2 weeks |

---

## 📊 Automation Coverage

```
ATTUALMENTE:
  Unit tests:      ✅ Automated (100%)
  TypeScript:      ✅ Automated (100%)
  Security:        ✅ Automated (75% — npm audit + Semgrep)
  Integration:     ⏱️ Partial (backend E2E only)
  E2E:             ❌ Not automated (0%)
  Performance:     ❌ Not automated (0%)
  Regression:      ⏱️ Implicit (via unit tests)
  Acceptance:      ❌ Not automated (0%)
  
  OVERALL:         ~45% automated

DOPO SETUP COMPLETO:
  All tests:       ✅ 100% automated
  OVERALL:         ~95% automated (acceptance still needs human sign-off)
```

---

## 🚀 Workflow Execution Times

```
Current (without E2E/load):
  Backend tests:        15 min
  Frontend tests:       10 min
  Security scans:       5 min
  Total:                30 min

After full automation:
  Parallel execution (GitHub Actions):
  - Backend tests:      15 min ┐
  - Frontend tests:     10 min ├─ 20 min (parallel)
  - Security scans:     5 min  ┘
  - Frontend E2E:       20 min ┐
  - Load tests:         25 min ├─ 25 min (parallel, scheduled)
  
  Total on every PR:    20 min (E2E on main only)
  Total weekly:         50 min (with load tests)
```

---

## 🔧 Implementation Checklist

```
☐ Create .github/workflows/e2e-frontend.yml
☐ Create tests/e2e/ directory structure
☐ Write critical path Playwright scenarios (3 tests)
☐ Add frontend API integration tests
☐ Create k6 load test script (tests/load.js)
☐ Setup Grafana Cloud token (secrets)
☐ Add Lighthouse CI config (lighthouserc.json)
☐ Create acceptance checklist script
☐ Test all workflows locally with act
☐ Merge to main and verify on GitHub
```

---

## 💾 Files to Create/Modify

```
✅ Existing:
  .github/workflows/ci.yml (update to add E2E stages)
  .github/workflows/semgrep.yml (already configured)

❌ Create:
  .github/workflows/e2e-frontend.yml
  .github/workflows/performance.yml
  .github/workflows/acceptance.yml
  frontend/playwright.config.ts
  tests/e2e/*.spec.ts (Playwright tests)
  tests/load.js (k6 load test)
  frontend/lighthouserc.json (Lighthouse config)
  tests/acceptance.yml (checklist)
```
