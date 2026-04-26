#!/bin/bash
# Descrizione: Analizza log e stack trace per trovare la causa di un bug
# Parametri: [file-log]
# Equivalente a: /analisi-bug

set -euo pipefail

LOG="${1:-}"

if [ -z "$LOG" ] || [ ! -f "$LOG" ]; then
  echo "Uso: analizza-bug.sh <file-log>"
  exit 1
fi

echo "=== ANALISI BUG ==="
echo ""

# STEP 1: Raccoglie il log
echo "1️⃣  Raccogliendo log..."
LOG_CONTENT=$(cat "$LOG" | head -100)

# STEP 2: Chiama Claude per root cause analysis
echo "2️⃣  Analizzando con AI..."
ANALYSIS=$(claude -p "$(cat << 'PROMPT'
Analizza questo stack trace e identifica la root cause:

PROMPT
)$LOG_CONTENT$(cat << 'PROMPT'

Rispondi brevemente: causa, effetto, fix proposto.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")

# STEP 3: Verifica
echo "$ANALYSIS"
echo ""
echo "✅ Analisi completata."
