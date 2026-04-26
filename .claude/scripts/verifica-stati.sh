#!/bin/bash
# Descrizione: Analisi FMEA delle macchine a stati (prenotazioni, ordini, fatture)
# Parametri: [stato-machine-name] (booking|invoice|order)
# Equivalente a: /audit-state-machine

set -euo pipefail

MACHINE="${1:-booking}"

echo "=== VERIFICA STATI: $MACHINE ==="
echo ""

# STEP 1: Estrai le transizioni di stato
echo "1️⃣  Estrai state machine da codice..."
cd backend 2>/dev/null || { echo "⚠️  Cartella backend non trovata"; exit 1; }
STATES=$(grep -r "validateTransition\|state:" src --include="*.ts" 2>/dev/null | grep -i "$MACHINE" | head -20 || echo "")

# STEP 2: Chiama Claude per FMEA
echo "2️⃣  Generando FMEA matrix..."
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

# STEP 3: Output
echo "$FMEA"

cd - >/dev/null 2>&1 || true
echo ""
echo "✅ Verifica stati completata."
