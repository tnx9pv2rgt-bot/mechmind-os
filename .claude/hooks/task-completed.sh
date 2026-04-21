#!/bin/bash
INPUT=$(cat)
TASK=$(echo "$INPUT" | jq -r '.task.description // empty' 2>/dev/null)

if echo "$TASK" | grep -qiE 'service|endpoint|controller|module|api|backend'; then
  echo "===== QUALITY GATE REMINDER =====" >&2
  echo "Task backend completato: verifica .spec.ts per ogni service/controller modificato." >&2
  echo "Esegui: cd backend && npx jest --forceExit" >&2
fi
exit 0
