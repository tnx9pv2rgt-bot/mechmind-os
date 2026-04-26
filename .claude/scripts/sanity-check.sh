#!/bin/bash
# Sanity check: verifica che Claude funzioni correttamente prima di eseguire task critici

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

source "$(dirname "$0")/_error-handler.sh"

SANITY_REPORT="./.claude/telemetry/sanity-$(date +%Y%m%d-%H%M%S).md"
mkdir -p ./.claude/telemetry

echo "=== SANITY CHECK ==="
echo ""

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo (claude CLI)..."
if ! command -v claude &>/dev/null; then
  echo "❌ claude CLI non disponibile"
  exit 1
fi
echo "✅ Claude CLI available"
echo ""

{
  echo "# Sanity Check Report"
  echo "**Data:** $(date)"
  echo ""

  echo "## 1. Claude CLI Response Test"
  echo ""

  RESULT=$(echo "Rispondi SOLO con la parola OK" | claude -p 2>&1 | head -1 || echo "ERROR")

  if [[ "$RESULT" == *"OK"* ]]; then
    echo "✅ Claude responded correctly"
    echo "Response: \`$RESULT\`"
  else
    echo "❌ Claude did not respond as expected"
    echo "Expected: OK"
    echo "Received: \`$RESULT\`"
    exit 1
  fi
  echo ""

  echo "## 2. Environment Verification"
  echo ""
  echo "| Component | Status |"
  echo "|-----------|--------|"
  echo "| Claude CLI | ✅ Available |"
  echo "| Telemetry dir | ✅ OK |"
  echo "| Error handler | ✅ OK |"
  echo ""

  echo "✅ Sanity check superato."

} | tee "$SANITY_REPORT"

echo ""
echo "📋 Report salvato: $SANITY_REPORT"
