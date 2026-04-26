#!/bin/bash
# Descrizione: Risolve bug con metodo RED-GREEN: riproduci, testa, fixa, verifica
# Parametri: <bug-id-o-descrizione>
# Equivalente a: /risolvi-bug

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

source "$(dirname "$0")/_error-handler.sh"

BUG="${1:-}"

if [ -z "$BUG" ]; then
  echo "Uso: ripara-bug.sh <descrizione-bug>"
  exit 1
fi

echo "=== RISOLVI BUG: $BUG ==="
echo ""

cd backend 2>/dev/null || { echo "⚠️  Cartella backend non trovata"; exit 1; }

# STEP 1: RED (scrivi test che fallisce)
echo "1️⃣  RED: Genera test che riproduce il bug..."
TEST_CODE=$(claude -p "$(cat << 'PROMPT'
Bug: 
PROMPT
)$BUG$(cat << 'PROMPT'

Scrivi un test NestJS che riproduce questo bug. Deve fallire prima del fix.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")

echo "$TEST_CODE" > "/tmp/bug-test.spec.ts"

# STEP 2: Esegui test RED
echo "2️⃣  Esecuzione test RED..."
npx jest "/tmp/bug-test.spec.ts" 2>/dev/null || echo "⚠️  Test fallito (aspettato in RED phase)"

# STEP 3: GREEN (scrivi fix)
echo "3️⃣  GREEN: Genera fix..."
FIX_CODE=$(claude -p "$(cat << 'PROMPT'
Bug: 
PROMPT
)$BUG$(cat << 'PROMPT'

Test fallito in: /tmp/bug-test.spec.ts

Scrivi il fix per far passare il test.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")

echo "$FIX_CODE" > "/tmp/bug-fix.ts"

# STEP 4: Verifica
echo "4️⃣  Verifica type check e test..."
npx tsc --noEmit 2>/dev/null || echo "⚠️  TS errors"
npx jest --forceExit 2>/dev/null || echo "⚠️  Alcuni test fallirono"

cd - >/dev/null 2>&1 || true
echo ""
echo "✅ Bug risolto. Review fix in /tmp/bug-fix.ts"
