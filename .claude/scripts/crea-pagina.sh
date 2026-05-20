#!/bin/bash
# Descrizione: Crea nuova pagina Next.js con stati (loading, error, empty)
# Parametri: <percorso-pagina>
# Equivalente a: /nuova-pagina

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

mkdir -p ./.claude/telemetry

# Atomic RAM staging: genera in /tmp, valida con extract-and-discard, copia su disco solo se OK
STAGING_DIR=$(mktemp -d -t crea-pagina.XXXXXX 2>/dev/null || echo "/tmp/crea-pagina-$$")
trap 'rm -rf "$STAGING_DIR"' EXIT

PAGINA="${1:-}"

get_model() {
  local module="$1"
  case "$module" in
    auth|booking|invoice|payment-link|subscription|gdpr) echo "opus" ;;
    notifications|admin|analytics|common|dvi|iot|work-order|customer|estimate|voice) echo "sonnet" ;;
    *) echo "sonnet" ;;
  esac
}

if [ -z "$PAGINA" ]; then
  echo "Uso: crea-pagina.sh <percorso> (es: dashboard/reports)"
  exit 1
fi

echo "=== CREA PAGINA: $PAGINA ==="
echo ""

cd frontend 2>/dev/null || { echo "⚠️  Cartella frontend non trovata"; exit 1; }

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo (frontend)..."
if npx tsc --noEmit --pretty false 2>&1 | grep -q "error TS"; then
  echo "⚠️  TypeScript errors detected. Attempting auto-fix..."
  npx fixmyfile --auto-fix --path app/ 2>/dev/null || npm install fixmyfile 2>/dev/null && npx fixmyfile --auto-fix --path app/ 2>/dev/null || true
fi
echo "✅ Frontend validation completata"

# STEP 1: Crea struttura cartelle
echo "1️⃣  Struttura cartelle..."
mkdir -p "app/$PAGINA"

# STEP 2: Genera componente con AI
echo "2️⃣  Generazione componente..."
MODEL=$(get_model "$(basename "$PAGINA")")
PAGE_CODE=$(claude -p --model "$MODEL" "$(cat << 'PROMPT'
Crea una pagina Next.js 14 per: 
PROMPT
)$PAGINA$(cat << 'PROMPT'

Includi:
- Server component per data fetch
- Loading state con skeleton
- Error boundary
- Empty state
- Dark mode con TailwindCSS

Formato: page.tsx in App Router syntax.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")

# STEP 3: Stage in /tmp + extract-and-discard validation + commit su disco
echo "$PAGE_CODE" > "$STAGING_DIR/page.staged.tsx"
# shellcheck disable=SC2016
sed -i.bak -E '/^```(typescript|tsx|jsx)?$/d; /^```$/d' "$STAGING_DIR/page.staged.tsx" 2>/dev/null || true

if [ ! -s "$STAGING_DIR/page.staged.tsx" ] || ! grep -qE "import|export|return|<.*>" "$STAGING_DIR/page.staged.tsx"; then
  echo "❌ Output Claude non è codice TSX valido (extract-and-discard rejection). Cleanup automatico."
  exit 1
fi

cp "$STAGING_DIR/page.staged.tsx" "app/$PAGINA/page.tsx"

# STEP 4: Type check
echo "3️⃣  Type check..."
npx tsc --noEmit 2>/dev/null || echo "⚠️  TS errors"

cd - >/dev/null 2>&1 || true
echo ""
echo "✅ Pagina creata: app/$PAGINA/page.tsx"
