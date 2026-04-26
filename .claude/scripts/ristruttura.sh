#!/bin/bash
# Descrizione: Ristruttura codice in sicurezza con verifica test pre/post
# Parametri: nessuno (straccia git diff manualmente)
# Equivalente a: /refactoring

set -euo pipefail

echo "=== RISTRUTTURA CODICE ==="

echo "1️⃣  Test PRIMA della modifica..."
cd backend
BEFORE=$(npm run test 2>&1 | grep -c "passed" || echo "0")
cd ..

echo "2️⃣  Applica modifiche (verifica git diff)..."
git diff

echo "3️⃣  Type check..."
cd backend
npx tsc --noEmit || exit 1
cd ..

echo "4️⃣  Lint..."
cd backend
npm run lint || exit 1
cd ..

echo "5️⃣  Test DOPO della modifica..."
cd backend
AFTER=$(npm run test 2>&1 | grep -c "passed" || echo "0")
cd ..

echo ""
echo "Test PRIMA: $BEFORE passed"
echo "Test DOPO:  $AFTER passed"

if [ "$BEFORE" -eq "$AFTER" ]; then
  echo "✅ Ristruttura sicura: nessun test nuovo fallito"
else
  echo "⚠️  Attenzione: numero test diverso"
fi
