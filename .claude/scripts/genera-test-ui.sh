#!/bin/bash
# Descrizione: Genera test end-to-end con Playwright per percorsi critici
# Parametri: <modulo>
# Equivalente a: /genera-test-e2e

set -euo pipefail

MODULO="${1:-}"

if [ -z "$MODULO" ]; then
  echo "Uso: genera-test-ui.sh <modulo>"
  exit 1
fi

echo "=== GENERA TEST E2E (PLAYWRIGHT): $MODULO ==="
echo ""

cd frontend 2>/dev/null || { echo "⚠️  Cartella frontend non trovata"; exit 1; }

# STEP 1: Analizza il modulo
echo "1️⃣  Analizza modulo..."
PAGE_FILES=$(find "app/$MODULO" -name "page.tsx" -o -name "layout.tsx" 2>/dev/null || echo "")

# STEP 2: Genera test
echo "2️⃣  Generazione test Playwright..."
TEST_CODE=$(claude -p "$(cat << 'PROMPT'
Pagina: app/
PROMPT
)$MODULO$(cat << 'PROMPT'

Files:
PROMPT
)${PAGE_FILES:-'(nessun file trovato)'}$(cat << 'PROMPT'

Genera un test Playwright che copra il golden path di questa pagina. Includi: load, render, user interaction. Formato: playwright TS code.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")

# STEP 3: Salva test
mkdir -p e2e
echo "$TEST_CODE" > "e2e/${MODULO}.spec.ts"

# STEP 4: Esegui test
echo "3️⃣  Esecuzione test..."
npx playwright test "e2e/${MODULO}.spec.ts" 2>/dev/null || echo "⚠️  Alcuni test fallirono"

cd - >/dev/null 2>&1 || true
echo ""
echo "✅ Generazione test E2E completata: e2e/${MODULO}.spec.ts"
