#!/bin/bash
# Descrizione: Genera test end-to-end con Playwright per percorsi critici
# Parametri: <modulo>
# Equivalente a: /genera-test-e2e

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

mkdir -p ./.claude/telemetry

# Atomic RAM staging: genera in /tmp, valida con extract-and-discard, copia su disco solo se OK
STAGING_DIR=$(mktemp -d -t genera-test-ui.XXXXXX 2>/dev/null || echo "/tmp/genera-test-ui-$$")
trap 'rm -rf "$STAGING_DIR"' EXIT

MODULO="${1:-}"

get_model() {
  local module="$1"
  case "$module" in
    auth|booking|invoice|payment-link|subscription|gdpr) echo "opus" ;;
    notifications|admin|analytics|common|dvi|iot|work-order|customer|estimate|voice) echo "sonnet" ;;
    *) echo "sonnet" ;;
  esac
}

if [ -z "$MODULO" ]; then
  echo "Uso: genera-test-ui.sh <modulo>"
  exit 1
fi

echo "=== GENERA TEST E2E (PLAYWRIGHT): $MODULO ==="
echo ""

cd frontend 2>/dev/null || { echo "⚠️  Cartella frontend non trovata"; exit 1; }

# FASE 0 — STRATEGIA 1+2: Pre-flight + AST repair
echo "🔧 [S1] Frontend pre-flight validation..."
if npx tsc --noEmit --pretty false 2>&1 | grep -q "error TS"; then
  echo "⚠️  Fixing TypeScript errors..."
  npx fixmyfile --auto-fix --path app/ 2>/dev/null || npm install fixmyfile 2>/dev/null && npx fixmyfile --auto-fix --path app/ 2>/dev/null || true
fi

# STEP 1: Analizza il modulo
echo "1️⃣  Analizza modulo..."
PAGE_FILES=$(find "app/$MODULO" -name "page.tsx" -o -name "layout.tsx" 2>/dev/null || echo "")

# STEP 2: Genera test
echo "2️⃣  Generazione test Playwright..."
MODEL=$(get_model "$MODULO")
TEST_CODE=$(claude -p --model "$MODEL" "$(cat << 'PROMPT'
Pagina: app/
PROMPT
)$MODULO$(cat << 'PROMPT'

Files:
PROMPT
)${PAGE_FILES:-'(nessun file trovato)'}$(cat << 'PROMPT'

Genera un test Playwright che copra il golden path di questa pagina. Includi: load, render, user interaction. Formato: playwright TS code.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")

# STEP 3: Stage in /tmp + extract-and-discard validation + commit su disco
mkdir -p e2e
echo "$TEST_CODE" > "$STAGING_DIR/${MODULO}.staged.spec.ts"
# shellcheck disable=SC2016
sed -i.bak -E '/^```(typescript|ts)?$/d; /^```$/d' "$STAGING_DIR/${MODULO}.staged.spec.ts" 2>/dev/null || true

if [ ! -s "$STAGING_DIR/${MODULO}.staged.spec.ts" ] || ! grep -qE "import|test|expect|playwright|page\." "$STAGING_DIR/${MODULO}.staged.spec.ts"; then
  echo "❌ Output Claude non è test Playwright valido (extract-and-discard rejection). Cleanup automatico."
  exit 1
fi

cp "$STAGING_DIR/${MODULO}.staged.spec.ts" "e2e/${MODULO}.spec.ts"

# STEP 4: Esegui test
echo "3️⃣  Esecuzione test..."
npx playwright test "e2e/${MODULO}.spec.ts" 2>/dev/null || echo "⚠️  Alcuni test fallirono"

cd - >/dev/null 2>&1 || true
echo ""
echo "✅ Generazione test E2E completata: e2e/${MODULO}.spec.ts"
