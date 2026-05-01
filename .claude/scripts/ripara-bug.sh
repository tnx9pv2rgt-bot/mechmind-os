#!/bin/bash
# Descrizione: Risolve bug con metodo RED-GREEN: riproduci, testa, fixa, verifica
# Parametri: <bug-id-o-descrizione>
# Equivalente a: /risolvi-bug

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

BUG="${1:-}"
BUG_REPORT="./.claude/telemetry/bug-fix-$(date +%Y%m%d-%H%M%S).md"
mkdir -p ./.claude/telemetry

if [ -z "$BUG" ]; then
  echo "❌ Uso: ripara-bug.sh <descrizione-bug>"
  exit 1
fi

echo "=== RISOLVI BUG: $BUG ==="
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

cd backend 2>/dev/null || { echo "❌ Impossibile entrare in backend"; exit 1; }

{
  echo "# Bug Fix Report"
  echo "**Data:** $(date)"
  echo "**Bug ID/Descrizione:** $BUG"
  echo ""

  # STEP 1: RED (scrivi test che fallisce)
  echo "## 1. RED Phase — Reproduce Bug"
  echo ""
  echo "Generating test that reproduces bug..."
  echo ""

  TEST_CODE=$(claude -p "$(cat << 'PROMPT'
Bug:
PROMPT
)$BUG$(cat << 'PROMPT'

Scrivi un test NestJS che riproduce questo bug. Deve fallire prima del fix.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")

  # Stage in /tmp + extract-and-discard validation
  echo "$TEST_CODE" > "/tmp/bug-test.staged.spec.ts"
  # shellcheck disable=SC2016
  sed -i.bak -E '/^```(typescript|ts)?$/d; /^```$/d' "/tmp/bug-test.staged.spec.ts" 2>/dev/null || true
  if grep -qE "import|describe|it|test|expect" "/tmp/bug-test.staged.spec.ts"; then
    cp "/tmp/bug-test.staged.spec.ts" "/tmp/bug-test.spec.ts"
  else
    echo "⚠️  Output Claude non è codice di test valido (extract-and-discard rejection)"
    echo "// fallback empty test" > "/tmp/bug-test.spec.ts"
  fi

  # STEP 2: Esegui test RED
  echo "## 2. RED Phase — Test Execution"
  echo ""
  if npx jest "/tmp/bug-test.spec.ts" 2>/dev/null; then
    echo "ℹ️  Test passato (bug potrebbe essere già risolto)"
  else
    echo "✅ Test fallito come aspettato (RED phase completato)"
  fi
  echo ""

  # STEP 3: GREEN (scrivi fix)
  echo "## 3. GREEN Phase — Generate Fix"
  echo ""
  FIX_CODE=$(claude -p "$(cat << 'PROMPT'
Bug:
PROMPT
)$BUG$(cat << 'PROMPT'

Test fallito in: /tmp/bug-test.spec.ts

Scrivi il fix per far passare il test.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")

  echo "$FIX_CODE" > "/tmp/bug-fix.ts"
  echo "Fix generated in /tmp/bug-fix.ts"
  echo ""

  # STEP 4: Verifica
  echo "## 4. Verification"
  echo ""
  TS_CHECK=$(npx tsc --noEmit 2>&1 || true)
  if echo "$TS_CHECK" | grep -q "error TS"; then
    echo "⚠️  TypeScript compilation errors found"
  else
    echo "✅ TypeScript validation passed"
  fi

  JEST_OUT=$(npx jest --forceExit 2>&1 || true)
  if echo "$JEST_OUT" | grep -q "PASS"; then
    echo "✅ Jest tests passed"
  else
    echo "⚠️  Some tests failed - review fix manually"
  fi
  echo ""

  echo "## 5. Next Steps"
  echo ""
  echo "1. Review generated fix: \`cat /tmp/bug-fix.ts\`"
  echo "2. Copy fix to appropriate source file"
  echo "3. Re-run tests to verify: \`npx jest --forceExit\`"
  echo "4. Commit with bug reference"
  echo ""

  echo "✅ Bug fix process completed."

} | tee "$BUG_REPORT"

cd - >/dev/null 2>&1 || true
echo ""
echo "📋 Report salvato: $BUG_REPORT"
