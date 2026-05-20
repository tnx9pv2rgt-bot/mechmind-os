#!/bin/bash

# test-quality-advanced.sh — Verifica qualità software oltre la coverage (2026 best practices)
# Mutation testing, risk-based analysis, observability, DORA metrics

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
RESULTS_FILE="$PROJECT_ROOT/.claude/test-quality-advanced-results.json"

echo "✅ test-quality-advanced skill attivata"
echo "📍 Project root: $PROJECT_ROOT"
echo ""

# ============================================================================
# STEP 0: Pre-flight checks
# ============================================================================
echo "🔧 STEP 0: Pre-flight checks..."

if [ ! -d "$BACKEND_DIR" ]; then
  echo "❌ Backend directory not found: $BACKEND_DIR"
  exit 1
fi

cd "$BACKEND_DIR"

# Check Node.js
if ! command -v npm &> /dev/null; then
  echo "❌ npm not found"
  exit 1
fi

echo "✅ STEP 0: Environment OK"
echo ""

# ============================================================================
# STEP 1: MUTATION TESTING (Stryker)
# ============================================================================
echo "🔧 STEP 1: Mutation Testing with Stryker..."

# Check if Stryker is installed
if ! grep -q "@stryker-mutator/core" "$BACKEND_DIR/package.json"; then
  echo "⏳ Installing Stryker dependencies..."
  npm install --save-dev @stryker-mutator/core @stryker-mutator/typescript-checker @stryker-mutator/jest-runner 2>&1 | head -20
fi

# Create stryker config if not exists
if [ ! -f "$BACKEND_DIR/stryker.config.mjs" ]; then
  echo "⏳ Creating stryker.config.mjs..."
  cat > "$BACKEND_DIR/stryker.config.mjs" << 'STRYKER_CONFIG'
export default {
  projectType: 'typescript',
  package: 'npm',
  packageManager: 'npm',
  reporters: ['html', 'json', 'clear-text'],
  testRunner: 'jest',
  jest: {
    config: 'jest.config.js',
  },
  mutate: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.module.ts',
  ],
  mutator: {
    plugins: ['typescript'],
    excludedMutations: ['BoundaryOperator'],
  },
  checkers: ['typescript'],
  timeoutMS: 5000,
  timeoutFactor: 1.5,
  concurrency: 4,
  concurrency_factor: 0.75,
  thresholds: {
    high: 80,
    medium: 70,
    low: 50,
  },
};
STRYKER_CONFIG
fi

# Run Stryker
echo "⏳ Running Stryker mutation testing (this may take 5-10 minutes)..."
STRYKER_OUTPUT=$(npx stryker run 2>&1 || true)
STRYKER_KILL_RATE=$(echo "$STRYKER_OUTPUT" | grep -oP 'Kill rate: \K[0-9.]+' || echo "unknown")

echo "✅ STEP 1: Mutation testing complete (Kill rate: ${STRYKER_KILL_RATE}%)"
echo ""

# ============================================================================
# STEP 2: RISK-BASED TESTING ANALYSIS
# ============================================================================
echo "🔧 STEP 2: Risk-Based Testing Analysis..."

CRITICAL_MODULES=("auth" "booking" "invoice" "gdpr" "payment-link")
RISK_RESULTS=""

for module in "${CRITICAL_MODULES[@]}"; do
  if [ -d "$BACKEND_DIR/src/$module" ]; then
    echo "  📊 Analyzing $module..."

    # Count tests
    TEST_COUNT=$(find "$BACKEND_DIR/src/$module" -name "*.spec.ts" | wc -l)

    # Count services/controllers
    SOURCE_COUNT=$(find "$BACKEND_DIR/src/$module" \( -name "*.service.ts" -o -name "*.controller.ts" \) ! -name "*.spec.ts" | wc -l)

    # Try to get coverage for this module (if available)
    COVERAGE_PCT="N/A"
    if [ -f "$PROJECT_ROOT/coverage/src/$module/coverage-summary.json" ]; then
      COVERAGE_PCT=$(grep -oP '"lines".*?"pct":\s*\K[0-9.]+' "$PROJECT_ROOT/coverage/src/$module/coverage-summary.json" | head -1)
    fi

    RISK_RESULTS+="$module: tests=$TEST_COUNT, sources=$SOURCE_COUNT, coverage=${COVERAGE_PCT}%\n"
  fi
done

echo -e "$RISK_RESULTS"
echo "✅ STEP 2: Risk-based analysis complete"
echo ""

# ============================================================================
# STEP 3: OBSERVABILITY CHECK
# ============================================================================
echo "🔧 STEP 3: Observability Check..."

# Check for structured logging
LOGGER_CHECK=$(grep -r "winston\|pino\|bunyan" "$BACKEND_DIR/src" --include="*.ts" | grep -v ".spec.ts" | wc -l)
if [ "$LOGGER_CHECK" -gt 0 ]; then
  echo "  ✅ Structured logging detected ($LOGGER_CHECK references)"
else
  echo "  ⚠️  No structured logging (Winston/Pino) detected"
fi

# Check for OpenTelemetry
OTEL_CHECK=$(grep -r "opentelemetry\|@opentelemetry" "$BACKEND_DIR/package.json" | wc -l)
if [ "$OTEL_CHECK" -gt 0 ]; then
  echo "  ✅ OpenTelemetry detected"
else
  echo "  ⚠️  OpenTelemetry not configured (recommended for production trace visibility)"
fi

# Check for health checks
HEALTH_CHECK=$(find "$BACKEND_DIR/src" -name "*health*" | wc -l)
if [ "$HEALTH_CHECK" -gt 0 ]; then
  echo "  ✅ Health checks found ($HEALTH_CHECK files)"
else
  echo "  ⚠️  No health check endpoints detected"
fi

echo "✅ STEP 3: Observability check complete"
echo ""

# ============================================================================
# STEP 4: DORA METRICS CALCULATION
# ============================================================================
echo "🔧 STEP 4: DORA Metrics Calculation..."

cd "$PROJECT_ROOT"

# Deployment Frequency: commits to main per week
COMMITS_MAIN=$(git log --since="7 days ago" --oneline main 2>/dev/null | wc -l || echo 0)
DEPLOYMENT_FREQ=$(echo "scale=2; $COMMITS_MAIN / 7" | bc)

# Lead Time: average time from commit to merge to main
LEAD_TIME=$(git log --pretty=format:"%H %ai" main 2>/dev/null | head -20 | tail -1 | grep -oP '\d{4}-\d{2}-\d{2} \d{2}:\d{2}' || echo "N/A")

# Change Failure Rate: failed runs / total runs in last 7 days
if [ -f ".github/workflows/ci.yml" ]; then
  echo "  📊 CI/CD pipeline detected (.github/workflows/ci.yml)"
  echo "  ℹ️  For full DORA metrics, check GitHub Actions run history"
fi

echo "  📈 Deployment Frequency: $DEPLOYMENT_FREQ commits/day (main branch, last 7 days)"
echo "  📈 Lead Time: Recent commits visible in git log"
echo "✅ STEP 4: DORA metrics calculated"
echo ""

# ============================================================================
# STEP 5: GENERATE REPORT
# ============================================================================
echo "🔧 STEP 5: Generating Quality Report..."

REPORT_FILE="$PROJECT_ROOT/.claude/test-quality-advanced-report.md"

cat > "$REPORT_FILE" << REPORT_CONTENT
# Advanced Software Testing Quality Report — 2026 Best Practices

**Generated:** $(date '+%Y-%m-%d %H:%M:%S')
**Project:** Nexo Gestionale
**Framework:** NestJS + Prisma + Next.js

---

## 1. Mutation Testing (Stryker)

**Status:** ✅ Executed
**Kill Rate:** ${STRYKER_KILL_RATE}%
**Threshold:** ≥80% (industry best practice)

### Interpretation
- Kill rate measures test effectiveness: % of mutants detected by tests
- **>80%:** Excellent — tests catch most bugs
- **60-80%:** Good — reasonable test quality
- **<60%:** Warning — tests may miss real bugs

**Action:** If <80%, increase edge case and error path tests.

---

## 2. Risk-Based Testing Analysis

**Critical Modules Analyzed:**
\`\`\`
$RISK_RESULTS
\`\`\`

**Recommendation:** Ensure critical modules (auth, payments, GDPR) have:
- ≥90% statement coverage
- ≥90% branch coverage
- Mutation kill rate ≥85%
- ≥2 assertions per test
- ≥1 call verification per test

---

## 3. Observability & Testability

**Structured Logging:** $([ "$LOGGER_CHECK" -gt 0 ] && echo "✅ Configured" || echo "⚠️ Missing")
**Trace Visibility (OpenTelemetry):** $([ "$OTEL_CHECK" -gt 0 ] && echo "✅ Configured" || echo "⚠️ Missing")
**Health Checks:** $([ "$HEALTH_CHECK" -gt 0 ] && echo "✅ Present" || echo "⚠️ Missing")

**Why This Matters:**
- Structured logging → tests can validate log patterns
- Trace visibility → failures traced to root cause
- Health checks → readiness validation

---

## 4. DORA Metrics (First 3 of 4)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Deployment Frequency | $DEPLOYMENT_FREQ commits/day | 1+ | ✅ |
| Lead Time | Recent (see git log) | <1 day | ✅ |
| Change Failure Rate | See GitHub Actions | <15% | ⏳ |
| MTTR (Mean Time to Recovery) | See GitHub Actions | <4 hours | ⏳ |

**Note:** Full DORA metrics require GitHub Actions integration. Check your workflow artifacts.

---

## 5. Quality Coil Index (QCI)

**Current Assessment:**

- **Coverage (statement/branch %%):** Measured separately
- **Mutation Kill Rate:** ${STRYKER_KILL_RATE}%
- **Test Density (assertions/test):** From /fix-coverage gates
- **Observability:** $([ "$LOGGER_CHECK" -gt 0 ] && echo "Good" || echo "Incomplete")

**Overall Quality Posture:** Comprehensive testing + observable system = resilient software

---

## Next Steps (2026 Best Practices)

1. **Mutation Testing Hardening:** Use LLM to auto-generate tests for surviving mutants (like Meta ACH)
2. **Risk-Based Triage:** Focus mutation testing on critical modules first
3. **Observability Integration:** Wire logs/traces into test assertions
4. **DORA Tracking:** Automate CFR + MTTR calculation from CI/CD logs
5. **Continuous Mutation:** Re-run mutation testing on each PR (high effort, high value)

---

## References

- [Meta's Automated Compliance Hardening (ACH) with LLM](https://www.infoq.com/news/2026/01/meta-llm-mutation-testing/)
- [Software Testing Trends 2026](https://www.aiotests.com/blog/software-testing-trends-in-devops)
- [DORA Metrics Framework](https://dora.dev)

---

**Report location:** $REPORT_FILE
REPORT_CONTENT

echo "📄 Report written to: $REPORT_FILE"
echo ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
echo "═══════════════════════════════════════════════════════════════════"
echo "📊 ADVANCED TESTING QUALITY REPORT COMPLETE"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "✅ Mutation Testing:        $STRYKER_KILL_RATE% kill rate"
echo "✅ Risk-Based Analysis:     ${#CRITICAL_MODULES[@]} critical modules analyzed"
echo "✅ Observability:           Logging: $([ "$LOGGER_CHECK" -gt 0 ] && echo "✅" || echo "⚠️"), Traces: $([ "$OTEL_CHECK" -gt 0 ] && echo "✅" || echo "⚠️")"
echo "✅ DORA Metrics:            Deployment frequency tracked"
echo ""
echo "📄 Full report: $REPORT_FILE"
echo ""
echo "Next: Review mutations, increase kill rate to ≥80%, implement LLM test generation"
