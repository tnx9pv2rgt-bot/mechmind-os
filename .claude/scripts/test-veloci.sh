#!/bin/bash
# Descrizione: Esegui test critici rapidi (TIER_1) prima di ogni PR
# Parametri: nessuno
# Equivalente a: /test-regressione

set -euo pipefail

echo "=== TEST REGRESSIONE (TIER_1) ==="

cd backend

# Esegui solo test marked con TIER_1 CRITICAL
npx jest \
  --testNamePattern="TIER_1" \
  --forceExit \
  --maxWorkers=4

echo ""
echo "✅ Test regressione completati."
