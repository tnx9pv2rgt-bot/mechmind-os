#!/bin/bash
# Descrizione: Crea endpoint REST (controller, service, DTO, test)
# Parametri: <modulo> <risorsa>
# Equivalente a: /nuovo-endpoint

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

mkdir -p ./.claude/telemetry

# Atomic RAM staging: genera in /tmp, valida con extract-and-discard, copia su disco solo se OK
STAGING_DIR=$(mktemp -d -t crea-endpoint.XXXXXX 2>/dev/null || echo "/tmp/crea-endpoint-$$")
trap 'rm -rf "$STAGING_DIR"' EXIT

MODULO="${1:-}"
RISORSA="${2:-}"

get_model() {
  local module="$1"
  case "$module" in
    auth|booking|invoice|payment-link|subscription|gdpr) echo "opus" ;;
    notifications|admin|analytics|common|dvi|iot|work-order|customer|estimate|voice) echo "sonnet" ;;
    *) echo "sonnet" ;;
  esac
}

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
MODEL=$(get_model "$MODULO")
CODE=$(claude -p --model "$MODEL" "$(cat << 'PROMPT'
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

# STEP 2: Stage in /tmp + extract-and-discard validation + commit su disco
echo "$CODE" > "$STAGING_DIR/${RISORSA}.staged.ts"

# Extract code: ripulisce eventuali backtick markdown e verifica che il risultato sia codice TS valido
# shellcheck disable=SC2016
sed -i.bak -E '/^```(typescript|ts)?$/d; /^```$/d' "$STAGING_DIR/${RISORSA}.staged.ts" 2>/dev/null || true

if [ ! -s "$STAGING_DIR/${RISORSA}.staged.ts" ] || ! grep -qE "import|describe|it|expect|@Controller|@Injectable|class|export" "$STAGING_DIR/${RISORSA}.staged.ts"; then
  echo "❌ Output Claude non è codice TS valido (extract-and-discard rejection). Cleanup automatico."
  exit 1
fi

mkdir -p "src/$MODULO"
cp "$STAGING_DIR/${RISORSA}.staged.ts" "src/$MODULO/${RISORSA}.dto.ts"
cp "$STAGING_DIR/${RISORSA}.staged.ts" "src/$MODULO/${RISORSA}.service.ts"
cp "$STAGING_DIR/${RISORSA}.staged.ts" "src/$MODULO/${RISORSA}.controller.ts"
cp "$STAGING_DIR/${RISORSA}.staged.ts" "src/$MODULO/${RISORSA}.spec.ts"

# STEP 3: Type check + test
echo "2️⃣  Type check..."
npx tsc --noEmit 2>/dev/null || echo "⚠️  TS errors"

echo "3️⃣  Jest..."
npx jest "src/$MODULO/${RISORSA}" 2>/dev/null || echo "⚠️  Test errors"

cd - >/dev/null 2>&1 || true
echo ""
echo "✅ Endpoint creato: src/$MODULO/"
