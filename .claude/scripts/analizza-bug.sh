#!/bin/bash
# Descrizione: Analizza log e stack trace per trovare la causa di un bug
# Parametri: [file-log]
# Equivalente a: /analisi-bug

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

source "$(dirname "$0")/_error-handler.sh"

LOG="${1:-}"
ANALYSIS_REPORT="./.claude/telemetry/bug-analysis-$(date +%Y%m%d-%H%M%S).md"
mkdir -p ./.claude/telemetry

echo "=== ANALISI BUG ==="
echo ""

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo (file log)..."
if [ -z "$LOG" ]; then
  echo "❌ Parametro obbligatorio: <file-log>"
  echo "Uso: analizza-bug.sh <file-log>"
  exit 1
fi
if [ ! -f "$LOG" ]; then
  echo "❌ File log non trovato: $LOG"
  exit 1
fi
if ! command -v claude &>/dev/null; then
  echo "❌ claude CLI non disponibile"
  exit 1
fi
echo "✅ File log OK"
echo ""

{
  echo "# Bug Analysis Report"
  echo "**Data:** $(date)"
  echo "**Log File:** $LOG"
  echo "**File Size:** $(wc -c < "$LOG") bytes"
  echo ""

  # STEP 1: Raccoglie il log
  echo "## 1. Log Content"
  echo ""
  LOG_CONTENT=$(head -150 "$LOG")

  echo "First 150 lines of log:"
  echo "\`\`\`"
  echo "$LOG_CONTENT"
  echo "\`\`\`"
  echo ""

  # STEP 2: Chiama Claude per root cause analysis
  echo "## 2. Root Cause Analysis"
  echo ""

  ANALYSIS=$(claude -p "$(cat << 'PROMPT'
Analizza questo stack trace e identifica la root cause:

PROMPT
)${LOG_CONTENT}$(cat << 'PROMPT'

Rispondi in questo formato:
1. **Root Cause:** [causa principale]
2. **Symptom:** [sintomo osservato]
3. **Proposed Fix:** [fix concreto]
4. **Severity:** [CRITICAL|HIGH|MEDIUM|LOW]
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")

  echo "$ANALYSIS"
  echo ""

  echo "## 3. Next Steps"
  echo ""
  echo "1. Review the proposed fix"
  echo "2. Create a test case to reproduce the issue"
  echo "3. Implement the fix"
  echo "4. Verify with: \`bash ripara-bug.sh '[issue description]'\`"
  echo ""

  echo "✅ Analisi completata."

} | tee "$ANALYSIS_REPORT"

echo ""
echo "📋 Report salvato: $ANALYSIS_REPORT"
