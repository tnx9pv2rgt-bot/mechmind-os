#!/bin/bash
# Descrizione: Crea nuova pagina Next.js con stati (loading, error, empty)
# Parametri: <percorso-pagina>
# Equivalente a: /nuova-pagina

set -euo pipefail

PAGINA="${1:-}"

if [ -z "$PAGINA" ]; then
  echo "Uso: crea-pagina.sh <percorso> (es: dashboard/reports)"
  exit 1
fi

echo "=== CREA PAGINA: $PAGINA ==="
echo ""

cd frontend 2>/dev/null || { echo "⚠️  Cartella frontend non trovata"; exit 1; }

# STEP 1: Crea struttura cartelle
echo "1️⃣  Struttura cartelle..."
mkdir -p "app/$PAGINA"

# STEP 2: Genera componente con AI
echo "2️⃣  Generazione componente..."
PAGE_CODE=$(claude -p "$(cat << 'PROMPT'
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

# STEP 3: Salva file
echo "$PAGE_CODE" > "app/$PAGINA/page.tsx"

# STEP 4: Type check
echo "3️⃣  Type check..."
npx tsc --noEmit 2>/dev/null || echo "⚠️  TS errors"

cd - >/dev/null 2>&1 || true
echo ""
echo "✅ Pagina creata: app/$PAGINA/page.tsx"
