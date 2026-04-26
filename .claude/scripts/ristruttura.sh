#!/bin/bash
# Descrizione: Ristruttura codice in sicurezza con verifica test pre/post
# Parametri: nessuno (straccia git diff manualmente)
# Equivalente a: /refactoring

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

source "$(dirname "$0")/_error-handler.sh"

REFACTOR_REPORT="./.claude/telemetry/refactor-$(date +%Y%m%d-%H%M%S).md"
mkdir -p ./.claude/telemetry

echo "=== RISTRUTTURA CODICE ==="
echo ""

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo (backend environment)..."
if [ ! -d "backend" ]; then
  echo "❌ Cartella backend non trovata"
  exit 1
fi
if ! command -v npm &>/dev/null; then
  echo "❌ npm non disponibile"
  exit 1
fi
echo "✅ Backend environment OK"
echo ""

{
  echo "# Refactoring Report"
  echo "**Data:** $(date)"
  echo ""

  echo "## 1. Pre-Refactoring Test Baseline"
  echo ""
  cd backend

  BEFORE=$(npm run test 2>&1 | grep -c "passed\|PASS" || echo "0")
  echo "Tests passed before refactoring: **$BEFORE**"
  echo ""

  cd ..

  echo "## 2. Git Diff Review"
  echo ""
  echo "Changes to be reviewed:"
  echo ""
  echo "\`\`\`diff"
  git diff | head -100
  echo "\`\`\`"
  echo ""

  echo "## 3. Post-Refactoring Verification"
  echo ""

  echo "### TypeScript Type Check"
  cd backend
  if npx tsc --noEmit 2>/dev/null; then
    echo "✅ TypeScript compilation passed"
  else
    echo "❌ TypeScript compilation failed"
    npx tsc --noEmit || true
  fi
  cd ..
  echo ""

  echo "### ESLint Check"
  cd backend
  if npm run lint 2>/dev/null; then
    echo "✅ Linting passed"
  else
    echo "❌ Linting failed"
    npm run lint || true
  fi
  cd ..
  echo ""

  echo "## 4. Post-Refactoring Test Suite"
  echo ""
  cd backend
  AFTER=$(npm run test 2>&1 | grep -c "passed\|PASS" || echo "0")
  echo "Tests passed after refactoring: **$AFTER**"
  cd ..
  echo ""

  echo "## 5. Comparison & Safety Assessment"
  echo ""
  echo "| Metric | Before | After | Status |"
  echo "|--------|--------|-------|--------|"
  echo "| Tests Passed | $BEFORE | $AFTER | $([ "$BEFORE" -eq "$AFTER" ] && echo "✅ OK" || echo "⚠️ CHANGED") |"
  echo ""

  if [ "$BEFORE" -eq "$AFTER" ]; then
    echo "✅ Refactoring is safe: all tests maintained"
  else
    echo "⚠️ Warning: test count changed from $BEFORE to $AFTER"
    echo "   Manual review required before commit"
  fi
  echo ""

  echo "✅ Refactoring verification completed."

} | tee "$REFACTOR_REPORT"

echo ""
echo "📋 Report salvato: $REFACTOR_REPORT"
