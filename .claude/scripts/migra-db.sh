#!/bin/bash
# Descrizione: Genera e applica migrazioni Prisma con verifica sicurezza
# Parametri: [nome-migration]
# Equivalente a: /migrazione-prisma

set -euo pipefail

NAME="${1:-$(date +%s)}"

echo "=== MIGRAZIONE PRISMA ==="
cd backend

echo "1️⃣  Genera migrazione..."
npx prisma migrate dev --name "$NAME" || exit 1

echo "2️⃣  Type check..."
npx tsc --noEmit || exit 1

echo "3️⃣  Test..."
npx jest --forceExit || exit 1

echo ""
echo "✅ Migrazione completata: $NAME"
