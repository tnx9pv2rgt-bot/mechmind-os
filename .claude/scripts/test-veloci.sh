#!/bin/bash
# Descrizione: Esegui test critici rapidi (TIER_1) prima di ogni PR
# Parametri: nessuno
# Equivalente a: /test-regressione

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

source "$(dirname "$0")/_error-handler.sh"

echo "=== TEST REGRESSIONE (TIER_1) ==="

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

cd backend

# Esegui solo test marked con TIER_1 CRITICAL
npx jest \
  --testNamePattern="TIER_1" \
  --forceExit \
  --maxWorkers=4

echo ""
echo "✅ Test regressione completati."
