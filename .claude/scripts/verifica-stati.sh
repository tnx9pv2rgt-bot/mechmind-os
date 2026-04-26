#!/bin/bash
# Descrizione: Analisi FMEA delle macchine a stati (prenotazioni, ordini, fatture)
# Parametri: [stato-machine-name] (booking|invoice|order)
# Equivalente a: /audit-state-machine

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

source "$(dirname "$0")/_error-handler.sh"

MACHINE="${1:-booking}"
FMEA_REPORT="./.claude/telemetry/fmea-${MACHINE}-$(date +%Y%m%d-%H%M%S).md"
mkdir -p ./.claude/telemetry

echo "=== VERIFICA STATI: $MACHINE ==="
echo ""

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo (backend environment)..."
if [ ! -d "backend" ]; then
  echo "❌ Cartella backend non trovata"
  exit 1
fi
if [ ! -d "backend/src" ]; then
  echo "❌ Directory src non trovata in backend"
  exit 1
fi

case "$MACHINE" in
  booking|invoice|order)
    echo "✅ State machine valido: $MACHINE"
    ;;
  *)
    echo "❌ State machine non riconosciuto: $MACHINE (valori: booking|invoice|order)"
    exit 1
    ;;
esac
echo ""

{
  echo "# FMEA Analysis: $MACHINE"
  echo "**Data:** $(date)"
  echo "**State Machine:** $MACHINE"
  echo ""

  cd backend 2>/dev/null || { echo "❌ Impossibile entrare in backend"; exit 1; }

  # STEP 1: Estrai le transizioni di stato
  echo "## 1. State Transitions"
  echo ""

  STATES=$(grep -r "validateTransition\|state:" src --include="*.ts" 2>/dev/null | grep -i "$MACHINE" | head -20 || echo "")

  if [ -n "$STATES" ]; then
    echo "Found transitions:"
    echo "\`\`\`"
    echo "$STATES"
    echo "\`\`\`"
  else
    echo "⚠️  Nessuna transizione trovata per: $MACHINE"
  fi
  echo ""

  # STEP 2: Chiama Claude per FMEA
  echo "## 2. FMEA Matrix"
  echo ""

  if [ -n "$STATES" ]; then
    FMEA=$(claude -p "$(cat << 'PROMPT'
State machine:
PROMPT
)$MACHINE$(cat << 'PROMPT'

Transizioni:
PROMPT
)$STATES$(cat << 'PROMPT'

Genera una FMEA matrix con colonne: failure mode, severity, probability, RPN, azioni. Solo testo tabellare.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")
    echo "$FMEA"
  else
    echo "ℹ️  FMEA non disponibile (nessuna transizione trovata)"
  fi
  echo ""

  echo "✅ Verifica stati completata."

  cd - >/dev/null 2>&1 || true

} | tee "$FMEA_REPORT"

echo ""
echo "📋 Report salvato: $FMEA_REPORT"
