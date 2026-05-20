#!/bin/bash
# Descrizione: Valuta se un modulo è pronto per i test (punteggio qualità)
# Parametri: <modulo>
# Equivalente a: /verifica-modulo

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

MODULO="${1:-}"
VALUATION_REPORT="./.claude/telemetry/module-valuation-$(date +%Y%m%d-%H%M%S).md"
mkdir -p ./.claude/telemetry

echo "=== VALUTAZIONE QUALITÀ: $MODULO ==="
echo ""

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo (module environment)..."
if [ -z "$MODULO" ]; then
  echo "❌ Parametro obbligatorio: <modulo>"
  echo "Uso: valuta-modulo.sh <modulo>"
  exit 1
fi
if [ ! -d "backend" ]; then
  echo "❌ Cartella backend non trovata"
  exit 1
fi
if [ ! -d "backend/src/$MODULO" ]; then
  echo "❌ Modulo non trovato: backend/src/$MODULO"
  exit 1
fi
echo "✅ Module environment OK"
echo ""

{
  echo "# Module Valuation Report"
  echo "**Data:** $(date)"
  echo "**Module:** $MODULO"
  echo ""

  cd backend

  echo "## 1. Module Structure"
  echo ""

  MODULE_PATH="src/$MODULO"
  SERVICE_FILES=$(find "$MODULE_PATH" -name "*.service.ts" -type f | wc -l || echo "0")
  CONTROLLER_FILES=$(find "$MODULE_PATH" -name "*.controller.ts" -type f | wc -l || echo "0")
  TEST_FILES=$(find "$MODULE_PATH" -name "*.spec.ts" -type f | wc -l || echo "0")

  echo "| Component | Count | Status |"
  echo "|-----------|-------|--------|"
  echo "| Services | $SERVICE_FILES | $([ "$SERVICE_FILES" -gt 0 ] && echo "✅" || echo "❌") |"
  echo "| Controllers | $CONTROLLER_FILES | $([ "$CONTROLLER_FILES" -gt 0 ] && echo "✅" || echo "❌") |"
  echo "| Tests | $TEST_FILES | $([ "$TEST_FILES" -gt 0 ] && echo "✅" || echo "❌") |"
  echo ""

  echo "## 2. TypeScript Validation"
  echo ""

  if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    echo "❌ TypeScript errors found"
    npx tsc --noEmit | grep "error TS" | head -5
  else
    echo "✅ TypeScript validation passed"
  fi
  echo ""

  echo "## 3. Test Coverage"
  echo ""

  if npx jest "src/$MODULO" --coverage --forceExit 2>&1 | tail -10 | grep -q "passed\|Coverage"; then
    COVERAGE=$(npx jest "src/$MODULO" --coverage 2>&1 | grep -E "Statements|Branches" | head -2 || echo "N/A")
    echo "Coverage metrics:"
    echo "\`\`\`"
    echo "$COVERAGE"
    echo "\`\`\`"
    echo "✅ Coverage data available"
  else
    echo "⚠️  Coverage data not available"
  fi
  echo ""

  echo "## 4. Module Readiness Score"
  echo ""

  SCORE=0
  [ "$SERVICE_FILES" -gt 0 ] && SCORE=$((SCORE + 25)) && echo "✅ Has services (+25)"
  [ "$CONTROLLER_FILES" -gt 0 ] && SCORE=$((SCORE + 25)) && echo "✅ Has controllers (+25)"
  [ "$TEST_FILES" -gt 0 ] && SCORE=$((SCORE + 25)) && echo "✅ Has tests (+25)"
  npx tsc --noEmit 2>&1 | grep -q "error TS" || { SCORE=$((SCORE + 25)); echo "✅ TypeScript valid (+25)"; }

  echo ""
  echo "**Total Readiness Score: $SCORE/100**"
  echo ""

  case $SCORE in
    100)
      echo "🟢 **STATUS: PRODUCTION READY** — All checks passed"
      ;;
    75)
      echo "🟡 **STATUS: READY WITH NOTES** — Minor issues to address"
      ;;
    50)
      echo "🟠 **STATUS: IN PROGRESS** — Significant work remaining"
      ;;
    *)
      echo "🔴 **STATUS: NOT READY** — Major gaps detected"
      ;;
  esac
  echo ""

  echo "## 5. Recommendations"
  echo ""
  if [ "$TEST_FILES" -eq 0 ]; then
    echo "- [ ] Add unit tests using: \`bash genera-test.sh $MODULO\`"
  fi
  if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    echo "- [ ] Fix TypeScript errors: \`npx tsc --noEmit\`"
  fi
  if [ "$SERVICE_FILES" -eq 0 ]; then
    echo "- [ ] Create service layer: \`bash crea-modulo.sh $MODULO\`"
  fi
  echo ""

  echo "✅ Valutazione completata."

  cd - >/dev/null 2>&1 || true

} | tee "$VALUATION_REPORT"

echo ""
echo "📋 Report salvato: $VALUATION_REPORT"
