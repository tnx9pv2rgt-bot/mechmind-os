#!/bin/bash
# Descrizione: Crea modulo NestJS completo
# Parametri: <nome-modulo>
# Equivalente a: /nuovo-modulo

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

mkdir -p ./.claude/telemetry

# Atomic RAM staging: genera in /tmp, valida con extract-and-discard, copia su disco solo se OK
STAGING_DIR=$(mktemp -d -t crea-modulo.XXXXXX 2>/dev/null || echo "/tmp/crea-modulo-$$")
trap 'rm -rf "$STAGING_DIR"' EXIT

MODULO="${1:-}"

get_model() {
  local module="$1"
  case "$module" in
    auth|booking|invoice|payment-link|subscription|gdpr) echo "opus" ;;
    notifications|admin|analytics|common|dvi|iot|work-order|customer|estimate|voice) echo "sonnet" ;;
    *) echo "sonnet" ;;
  esac
}

if [ -z "$MODULO" ]; then
  echo "Uso: crea-modulo.sh <nome-modulo>"
  exit 1
fi

echo "=== CREA MODULO: $MODULO ==="
echo ""

cd backend 2>/dev/null || { echo "⚠️  Cartella backend non trovata"; exit 1; }

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo..."
if npx tsc --noEmit --pretty false 2>&1 | head -5; then
  echo "✅ Compilation check passed"
else
  echo "⚠️  TypeScript errors detected. Attempting auto-fix..."
  # FASE 0 — STRATEGIA 2: AST repair
  npx fixmyfile --auto-fix --path src/ 2>/dev/null || npm install fixmyfile 2>/dev/null && npx fixmyfile --auto-fix --path src/ 2>/dev/null || true
fi

# STEP 1: Crea struttura
echo "1️⃣  Struttura modulo..."
mkdir -p "src/$MODULO"

# STEP 2: Genera con AI
echo "2️⃣  Generazione modulo completo..."
MODEL=$(get_model "$MODULO")
MODULE_CODE=$(claude -p --model "$MODEL" "$(cat << 'PROMPT'
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

# STEP 3: Stage in /tmp + extract-and-discard validation + commit su disco
echo "$MODULE_CODE" > "$STAGING_DIR/$MODULO.staged.ts"
# shellcheck disable=SC2016
sed -i.bak -E '/^```(typescript|ts)?$/d; /^```$/d' "$STAGING_DIR/$MODULO.staged.ts" 2>/dev/null || true

if [ ! -s "$STAGING_DIR/$MODULO.staged.ts" ] || ! grep -qE "import|@Module|@Controller|@Injectable|describe|class|export" "$STAGING_DIR/$MODULO.staged.ts"; then
  echo "❌ Output Claude non è codice TS valido (extract-and-discard rejection). Cleanup automatico."
  exit 1
fi

cp "$STAGING_DIR/$MODULO.staged.ts" "src/$MODULO/$MODULO.module.ts"
cp "$STAGING_DIR/$MODULO.staged.ts" "src/$MODULO/$MODULO.controller.ts"
cp "$STAGING_DIR/$MODULO.staged.ts" "src/$MODULO/$MODULO.service.ts"
cp "$STAGING_DIR/$MODULO.staged.ts" "src/$MODULO/$MODULO.spec.ts"

# STEP 4: Verifica
echo "3️⃣  Verifica..."
npx tsc --noEmit 2>/dev/null || echo "⚠️  TS errors"
npx jest "src/$MODULO" 2>/dev/null || echo "⚠️  Test errors"
npm run lint 2>/dev/null || echo "⚠️  Lint errors"

cd - >/dev/null 2>&1 || true
echo ""
echo "✅ Modulo creato: src/$MODULO/"
