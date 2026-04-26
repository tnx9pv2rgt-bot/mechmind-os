#!/bin/bash
# Descrizione: Valuta se un modulo è pronto per i test (punteggio qualità)
# Parametri: <modulo>
# Equivalente a: /verifica-modulo

set -euo pipefail

MODULO="${1:-}"

if [ -z "$MODULO" ]; then
  echo "Uso: valuta-modulo.sh <modulo>"
  exit 1
fi

echo "=== VALUTAZIONE QUALITÀ: $MODULO ==="
echo ""

cd backend

# Esegui script di valutazione
if [ -f "scripts/verify-module.mjs" ]; then
  node scripts/verify-module.mjs "$MODULO"
else
  echo "⚠️  script verify-module.mjs non trovato"
  echo "Fallback: type check..."
  npx tsc --noEmit
fi

echo ""
echo "✅ Valutazione completata."
