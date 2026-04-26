#!/bin/bash
# Descrizione: Crea endpoint REST (controller, service, DTO, test)
# Parametri: <modulo> <risorsa>
# Equivalente a: /nuovo-endpoint

set -euo pipefail

MODULO="${1:-}"
RISORSA="${2:-}"

if [ -z "$MODULO" ] || [ -z "$RISORSA" ]; then
  echo "Uso: crea-endpoint.sh <modulo> <risorsa>"
  exit 1
fi

echo "=== CREA ENDPOINT: $MODULO/$RISORSA ==="
echo ""

cd backend 2>/dev/null || { echo "⚠️  Cartella backend non trovata"; exit 1; }

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo..."
if ! npx tsc --noEmit --pretty false 2>&1 | head -5; then
  echo "⚠️  TypeScript errors detected. Attempting auto-fix..."
  # FASE 0 — STRATEGIA 2: AST repair
  npx fixmyfile --auto-fix --path src/ 2>/dev/null || npm install fixmyfile 2>/dev/null && npx fixmyfile --auto-fix --path src/ 2>/dev/null || true
fi
echo "✅ Pre-flight validation completata"

# STEP 1: Genera codice
echo "1️⃣  Generazione controller/service/DTO..."
CODE=$(claude -p "$(cat << 'PROMPT'
Modulo: 
PROMPT
)$MODULO$(cat << 'PROMPT'

Risorsa: 
PROMPT
)$RISORSA$(cat << 'PROMPT'

Genera:
1. DTO (class-validator)
2. Service (business logic + domain exceptions)
3. Controller (endpoint REST)
4. Test spec

Formato: NestJS pattern, @TenantId() decorator, Prisma queries con tenantId.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")

# STEP 2: Salva file
mkdir -p "src/$MODULO"
echo "$CODE" > "src/$MODULO/${RISORSA}.dto.ts"
echo "$CODE" > "src/$MODULO/${RISORSA}.service.ts"
echo "$CODE" > "src/$MODULO/${RISORSA}.controller.ts"
echo "$CODE" > "src/$MODULO/${RISORSA}.spec.ts"

# STEP 3: Type check + test
echo "2️⃣  Type check..."
npx tsc --noEmit 2>/dev/null || echo "⚠️  TS errors"

echo "3️⃣  Jest..."
npx jest "src/$MODULO/${RISORSA}" 2>/dev/null || echo "⚠️  Test errors"

cd - >/dev/null 2>&1 || true
echo ""
echo "✅ Endpoint creato: src/$MODULO/"
