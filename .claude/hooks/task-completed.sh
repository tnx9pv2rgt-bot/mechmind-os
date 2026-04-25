#!/bin/bash
INPUT=$(cat)
TASK=$(echo "$INPUT" | jq -r '.task.description // empty' 2>/dev/null)

if echo "$TASK" | grep -qiE 'service|endpoint|controller|module|api|backend'; then
  REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  FAILED=0

  NEW_SERVICES=$(git diff --name-only HEAD 2>/dev/null | grep -E 'backend/src/.+\.service\.ts$' | grep -v '\.spec\.' || true)
  if [ -n "$NEW_SERVICES" ]; then
    while IFS= read -r SVC; do
      SPEC_PATH="${REPO_ROOT}/${SVC%.service.ts}.service.spec.ts"
      if [ ! -f "$SPEC_PATH" ]; then
        echo "===== QUALITY GATE: SPEC MANCANTE =====" >&2
        echo "Manca: $SPEC_PATH" >&2
        FAILED=1
      fi
    done <<< "$NEW_SERVICES"
  fi

  if [ "$FAILED" -eq 0 ]; then
    echo "✅ Spec check OK — tutti i service modificati hanno il loro .spec.ts" >&2
  fi

  echo "Esegui: cd backend && npx jest --forceExit" >&2
fi
exit 0
