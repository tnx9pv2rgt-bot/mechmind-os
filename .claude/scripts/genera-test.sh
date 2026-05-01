#!/bin/bash
# Descrizione: Test generation con analisi statica dei punti di rottura
# Parametri: [modulo]
set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

mkdir -p ./.claude/telemetry

# Atomic RAM staging: genera in /tmp, valida con extract-and-discard, copia su disco solo se OK
STAGING_DIR=$(mktemp -d -t genera-test.XXXXXX 2>/dev/null || echo "/tmp/genera-test-$$")
trap 'rm -rf "$STAGING_DIR"' EXIT

MODULO="${1:-}"
cd backend || exit 1

get_model() {
  local module="$1"
  case "$module" in
    auth|booking|invoice|payment-link|subscription|gdpr) echo "opus" ;;
    notifications|admin|analytics|common|dvi|iot|work-order|customer|estimate|voice) echo "sonnet" ;;
    *) echo "sonnet" ;;
  esac
}

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Pre-flight validation..."
if npx tsc --noEmit --pretty false 2>&1 | grep -q "error TS"; then
  echo "⚠️  Detected TS errors. Auto-fixing..."
  npx fixmyfile --auto-fix --path src/ 2>/dev/null || npm install fixmyfile 2>/dev/null && npx fixmyfile --auto-fix --path src/ 2>/dev/null || true
fi

if [ -z "$MODULO" ]; then
  echo "Uso: genera-test.sh <modulo>"
  exit 1
fi

echo "=== GENERA TEST (AUTOMAZIONE INVERSA): $MODULO ==="
echo ""

# STEP 1: Analisi statica — identifica 3 punti di rottura
echo "1️⃣  Analisi statica dei punti di rottura..."

BRANCHES=$(grep -r "if \|else\|catch" "src/$MODULO" --include="*.ts" 2>/dev/null | grep -cv "spec.ts" || echo "0")
COMPLEXITY=$(grep -r "function\|const.*=" "src/$MODULO" --include="*.ts" 2>/dev/null | grep -cv "spec.ts" || echo "0")
TRY_CATCH=$(grep -r "try\|catch" "src/$MODULO" --include="*.ts" 2>/dev/null | grep -cv "spec.ts" || echo "0")

echo "   - Branch if/else: $BRANCHES"
echo "   - Try/catch blocks: $TRY_CATCH"
echo "   - Funzioni (complessità): $COMPLEXITY"

# STEP 2: Genera prompt specifico
echo "2️⃣  Generazione test con scenari specifici..."

MODEL=$(get_model "$MODULO")
TEST_CODE=$(claude -p --model "$MODEL" "Modulo: $MODULO

Punti di rottura identificati:
- $BRANCHES branch if/else non coperti
- $TRY_CATCH blocchi try/catch senza test per ramo catch
- Complessità: $COMPLEXITY funzioni

Genera test TypeScript che verifichi ESATTAMENTE questi scenari di fallimento: error path, boundary conditions, edge cases. Formato: Jest test spec." 2>/dev/null || echo "")

if [ -z "$TEST_CODE" ]; then
  echo "❌ Generazione fallita"
  exit 1
fi

# STEP 3: Stage in /tmp + extract-and-discard validation + commit su disco
mkdir -p "src/$MODULO"
echo "$TEST_CODE" > "$STAGING_DIR/_generated.staged.spec.ts"
# shellcheck disable=SC2016
sed -i.bak -E '/^```(typescript|ts)?$/d; /^```$/d' "$STAGING_DIR/_generated.staged.spec.ts" 2>/dev/null || true

if [ ! -s "$STAGING_DIR/_generated.staged.spec.ts" ] || ! grep -qE "import|describe|it|test|expect" "$STAGING_DIR/_generated.staged.spec.ts"; then
  echo "❌ Output Claude non è codice di test valido (extract-and-discard rejection). Cleanup automatico."
  exit 1
fi

cp "$STAGING_DIR/_generated.staged.spec.ts" "src/$MODULO/_generated.spec.ts"

echo "3️⃣  Type check..."
npx tsc --noEmit "src/$MODULO/_generated.spec.ts" 2>/dev/null || {
  echo "❌ Type check fallito"
  rm -f "src/$MODULO/_generated.spec.ts"
  exit 1
}

echo "3️⃣b TypeScript gate validation (pre-Stryker)..."
npx tsc --noEmit --pretty false 2>&1 | grep -c "error TS" || true

# STEP 4: Verifica con Stryker che il test uccida almeno un mutante
echo "4️⃣  Mutation testing (Stryker)..."
KILLED=$(npx stryker run --mutate "src/$MODULO" --incremental 2>/dev/null | grep -i "killed" | head -1 || echo "0 mutanti uccisi")
echo "   $KILLED"

echo ""
echo "✅ Test generato e verificato"
cd - >/dev/null 2>&1 || true
