#!/bin/bash
# Descrizione: Build e deploy dell'applicazione
# Parametri: nessuno
# Equivalente a: /distribuzione

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

source "$(dirname "$0")/_error-handler.sh"

echo "=== DEPLOY ==="
echo ""

# STEP 1: TypeScript backend
echo "1️⃣  Type check backend..."
cd backend
npx tsc --noEmit || exit 1
cd ..

# STEP 2: Lint backend
echo "2️⃣  Lint backend..."
cd backend
npm run lint || exit 1
cd ..

# STEP 3: Test backend
echo "3️⃣  Test backend..."
cd backend
npx jest --forceExit || exit 1
cd ..

# STEP 4: Build backend
echo "4️⃣  Build backend..."
cd backend
npm run build || exit 1
cd ..

# STEP 5: TypeScript frontend
echo "5️⃣  Type check frontend..."
cd frontend
npx tsc --noEmit || exit 1
cd ..

# STEP 6: Lint frontend
echo "6️⃣  Lint frontend..."
cd frontend
npm run lint || exit 1
cd ..

# STEP 7: Test frontend
echo "7️⃣  Test frontend..."
cd frontend
npm run test || exit 1
cd ..

# STEP 8: Build frontend
echo "8️⃣  Build frontend..."
cd frontend
npm run build || exit 1
cd ..

# STEP 9: Health check
echo "9️⃣  Health check endpoint..."
if curl -f http://localhost:3002/health >/dev/null 2>&1; then
  echo "✅ Backend health: OK"
else
  echo "⚠️  Backend not running (expected if not started)"
fi

echo ""
echo "✅ Deploy completato."
