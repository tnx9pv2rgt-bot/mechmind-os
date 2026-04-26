#!/bin/bash
# Descrizione: Crea modulo NestJS completo
# Parametri: <nome-modulo>
# Equivalente a: /nuovo-modulo

set -euo pipefail

MODULO="${1:-}"

if [ -z "$MODULO" ]; then
  echo "Uso: crea-modulo.sh <nome-modulo>"
  exit 1
fi

echo "=== CREA MODULO: $MODULO ==="
echo ""

cd backend 2>/dev/null || { echo "⚠️  Cartella backend non trovata"; exit 1; }

# STEP 1: Crea struttura
echo "1️⃣  Struttura modulo..."
mkdir -p "src/$MODULO"

# STEP 2: Genera con AI
echo "2️⃣  Generazione modulo completo..."
MODULE_CODE=$(claude -p "$(cat << 'PROMPT'
Modulo: 
PROMPT
)$MODULO$(cat << 'PROMPT'

Genera struttura NestJS completa:
- module.ts
- controller.ts
- service.ts
- dto/
- spec.ts
- Prisma model in schema.prisma

Includi: RLS, tenantId, encryption su PII, test fixture.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")

# STEP 3: Salva file principale
echo "$MODULE_CODE" > "src/$MODULO/$MODULO.module.ts"
echo "$MODULE_CODE" > "src/$MODULO/$MODULO.controller.ts"
echo "$MODULE_CODE" > "src/$MODULO/$MODULO.service.ts"
echo "$MODULE_CODE" > "src/$MODULO/$MODULO.spec.ts"

# STEP 4: Verifica
echo "3️⃣  Verifica..."
npx tsc --noEmit 2>/dev/null || echo "⚠️  TS errors"
npx jest "src/$MODULO" 2>/dev/null || echo "⚠️  Test errors"
npm run lint 2>/dev/null || echo "⚠️  Lint errors"

cd - >/dev/null 2>&1 || true
echo ""
echo "✅ Modulo creato: src/$MODULO/"
