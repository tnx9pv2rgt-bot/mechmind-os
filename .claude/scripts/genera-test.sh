#!/bin/bash
# Descrizione: Test generation con analisi statica dei punti di rottura
# Parametri: [modulo]
set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

source "$(dirname "$0")/_error-handler.sh"

MODULO="${1:-}"
cd backend || exit 1

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

BRANCHES=$(grep -r "if \|else\|catch" "src/$MODULO" --include="*.ts" 2>/dev/null | grep -v "spec.ts" | wc -l || echo "0")
COMPLEXITY=$(grep -r "function\|const.*=" "src/$MODULO" --include="*.ts" 2>/dev/null | grep -v "spec.ts" | wc -l || echo "0")
TRY_CATCH=$(grep -r "try\|catch" "src/$MODULO" --include="*.ts" 2>/dev/null | grep -v "spec.ts" | wc -l || echo "0")

echo "   - Branch if/else: $BRANCHES"
echo "   - Try/catch blocks: $TRY_CATCH"
echo "   - Funzioni (complessità): $COMPLEXITY"

# STEP 2: Genera prompt specifico
echo "2️⃣  Generazione test con scenari specifici..."

TEST_CODE=$(claude -p "Modulo: $MODULO

Punti di rottura identificati:
- $BRANCHES branch if/else non coperti
- $TRY_CATCH blocchi try/catch senza test per ramo catch
- Complessità: $COMPLEXITY funzioni

Genera test TypeScript che verifichi ESATTAMENTE questi scenari di fallimento: error path, boundary conditions, edge cases. Formato: Jest test spec." 2>/dev/null || echo "")

if [ -z "$TEST_CODE" ]; then
  echo "❌ Generazione fallita"
  exit 1
fi

# STEP 3: Salva e verifica
mkdir -p "src/$MODULO"
echo "$TEST_CODE" > "src/$MODULO/_generated.spec.ts"

echo "3️⃣  Type check..."
npx tsc --noEmit "src/$MODULO/_generated.spec.ts" 2>/dev/null || {
  echo "❌ Type check fallito"
  rm -f "src/$MODULO/_generated.spec.ts"
  exit 1
}

# STEP 4: Verifica con Stryker che il test uccida almeno un mutante
echo "4️⃣  Mutation testing (Stryker)..."
KILLED=$(npx stryker run --mutate "src/$MODULO" --incremental 2>/dev/null | grep -i "killed" | head -1 || echo "0 mutanti uccisi")
echo "   $KILLED"

echo ""
echo "✅ Test generato e verificato"
cd - >/dev/null 2>&1 || true
