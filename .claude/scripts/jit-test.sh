#!/bin/bash
# Descrizione: JiT Test Generation (Meta Pattern 2026) — genera test on-demand per diff
# Parametri: nessuno
# Equivalente a: /genera-test-jit

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

# Helper: extract TypeScript code from Claude output
extract_code() {
  sed 's/^```typescript$//' | sed 's/^```ts$//' | sed 's/^```$//' | sed '/^```/d'
}

JIT_REPORT="./.claude/telemetry/jit-$(date +%Y%m%d-%H%M%S).md"
mkdir -p ./.claude/telemetry

echo "=== JiT TEST GENERATION (Meta Pattern 2026) ==="
echo ""

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo (git environment)..."
if ! command -v git &>/dev/null; then
  echo "❌ git non disponibile"
  exit 1
fi
if ! command -v npm &>/dev/null; then
  echo "❌ npm non disponibile"
  exit 1
fi
if ! command -v claude &>/dev/null; then
  echo "❌ claude CLI non disponibile"
  exit 1
fi
echo "✅ Environment OK"
echo ""

{
  echo "# JiT Test Generation Report"
  echo "**Data:** $(date)"
  echo "**Pattern:** Meta Just-In-Time Testing 2026"
  echo ""

  # Identifica file modificati
  DIFF_FILES=$(git diff HEAD~1 --name-only 2>/dev/null | grep '\.ts$' | grep -v '\.spec\.ts$' || true)

  if [ -z "$DIFF_FILES" ]; then
    echo "## Result"
    echo "✅ Nessun file TypeScript modificato. JiT skipped."
    exit 0
  fi

  echo "## Files Modified"
  echo ""
  echo "\`\`\`"
  echo "$DIFF_FILES"
  echo "\`\`\`"
  echo ""

  echo "## Test Generation"
  echo ""

  TEST_COUNT=0
  PASS_COUNT=0
  FAIL_COUNT=0

  while IFS= read -r file; do
    [ -z "$file" ] && continue

    echo "### \`$file\`"
    echo ""

    TEMP_TEST="/tmp/jit-test-$(basename "${file%.ts}" | tr -d '[:space:]').spec.ts"

    # Genera test via Claude
    echo "Generating JiT test..."
    claude -p "Analizza questo file TypeScript e genera SOLO un test spec completo che copre le modifiche recenti. Rispondi SOLO con codice TypeScript valido, senza markdown backtick, senza spiegazioni. File: $file" 2>/dev/null > "$TEMP_TEST" || true

    # Verifica se il test ha contenuto valido
    if [ -s "$TEMP_TEST" ] && grep -q "import\|describe\|it\|test\|expect" "$TEMP_TEST" 2>/dev/null; then
      TEST_COUNT=$((TEST_COUNT + 1))

      # Type check il test generato
      if npx tsc --noEmit "$TEMP_TEST" 2>/dev/null; then
        echo "✅ Type check: OK"

        # Esegui il test
        if npx jest "$TEMP_TEST" --forceExit --silent 2>&1 | grep -q "passed"; then
          echo "✅ Test execution: PASSED"
          PASS_COUNT=$((PASS_COUNT + 1))
        else
          echo "⚠️  Test execution: FAILED (review test logic)"
          FAIL_COUNT=$((FAIL_COUNT + 1))
        fi
      else
        echo "⚠️  Type check: FAILED"
        FAIL_COUNT=$((FAIL_COUNT + 1))
      fi

      # Elimina il test (pattern Meta: usa-e-getta)
      rm -f "$TEMP_TEST"
      echo "  Cleanup: test rimosso (usa-e-getta pattern)"
    else
      echo "⚠️  Test generation failed or empty"
    fi
    echo ""

  done <<< "$DIFF_FILES"

  echo "## Summary"
  echo ""
  echo "| Metric | Count |"
  echo "|--------|-------|"
  echo "| Generated | $TEST_COUNT |"
  echo "| Passed | $PASS_COUNT |"
  echo "| Failed | $FAIL_COUNT |"
  echo ""

  if [ "$TEST_COUNT" -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=1; $PASS_COUNT * 100 / $TEST_COUNT" | bc)
    echo "**Success Rate:** ${SUCCESS_RATE}%"
    echo ""
  fi

  echo "✅ JiT test generation completata."

} | tee "$JIT_REPORT"

echo ""
echo "📋 Report salvato: $JIT_REPORT"
