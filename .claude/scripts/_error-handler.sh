#!/bin/bash
# Shared error handler for all .claude/scripts/*.sh

handle_error() {
  local EXIT_CODE=$1
  local LINE_NUMBER=$2
  local SCRIPT_NAME
  SCRIPT_NAME=$(basename "$0")

  DIAGNOSIS_FILE="./.claude/telemetry/error-$(date +%Y%m%d-%H%M%S).md"
  mkdir -p "./.claude/telemetry"

  {
    echo "# Error Report: $SCRIPT_NAME"
    echo "**Exit Code:** $EXIT_CODE"
    echo "**Line:** $LINE_NUMBER"
    echo "**Time:** $(date)"
    echo ""

    echo "## Error Context"
    echo "\`\`\`"
    sed -n "$((LINE_NUMBER-2)),$((LINE_NUMBER+2))p" "$0"
    echo "\`\`\`"
    echo ""

    echo "## Claude Diagnosis"
    DIAGNOSIS=$(claude -p "$(cat << 'DIAGNOSIS'
Script: [SCRIPT_NAME]
Exit code: [EXIT_CODE]
Line number: [LINE_NUMBER]

Error context (lines around failure):
[CONTEXT]

Diagnostica:
1. Qual è la root cause di questo errore?
2. Quale comando ha fallito esattamente?
3. Come lo risolvo in 30 secondi?

Rispondi in formato:
**Root Cause:** [causa]
**Comando fallito:** [comando]
**Fix:** [soluzione concreta in 1-2 step]
DIAGNOSIS
)" 2>/dev/null || echo "⚠️  Claude unavailable for diagnosis")

    echo "$DIAGNOSIS"
    echo ""
    echo "---"
    echo "**Full command that failed:**"
    echo "\`\`bash"
    echo "${BASH_COMMAND}"
    echo "\`\`"

  } | tee "$DIAGNOSIS_FILE"

  echo ""
  echo "❌ $SCRIPT_NAME failed at line $LINE_NUMBER (exit code $EXIT_CODE)"
  echo "📋 Diagnosis saved: $DIAGNOSIS_FILE"
  echo ""

  exit "$EXIT_CODE"
}

export -f handle_error
