#!/bin/bash
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active // false')" = "true" ]; then exit 0; fi

FAILED=0

# TypeScript backend
if [ -d "backend" ]; then
  BE=$(cd backend && npx tsc --noEmit --pretty false 2>&1 | grep -c 'error TS' || true)
  if [ "$BE" -gt 0 ]; then
    echo "" >&2
    echo "===== STOP HOOK: BACKEND TS ERRORS ($BE) =====" >&2
    (cd backend && npx tsc --noEmit --pretty false 2>&1 | head -25) >&2
    FAILED=1
  fi
fi

# TypeScript frontend
if [ -d "frontend" ]; then
  FE=$(cd frontend && npx tsc --noEmit --pretty false 2>&1 | grep -c 'error TS' || true)
  if [ "$FE" -gt 0 ]; then
    echo "" >&2
    echo "===== STOP HOOK: FRONTEND TS ERRORS ($FE) =====" >&2
    (cd frontend && npx tsc --noEmit --pretty false 2>&1 | head -25) >&2
    FAILED=1
  fi
fi

# ESLint backend
if [ -d "backend" ]; then
  LINT_OUT=$(cd backend && npm run lint 2>&1)
  LINT_ERR=$(echo "$LINT_OUT" | grep -cE '[0-9]+ error' || true)
  if [ "$LINT_ERR" -gt 0 ]; then
    echo "" >&2
    echo "===== STOP HOOK: ESLINT ERRORS =====" >&2
    echo "$LINT_OUT" | tail -10 >&2
    FAILED=1
  fi
fi

# Check that modified service files have a corresponding spec file
NEW_SERVICES=$(git diff --name-only HEAD 2>/dev/null | grep -E 'backend/src/.+\.service\.ts$' | grep -v '\.spec\.' || true)
if [ -n "$NEW_SERVICES" ]; then
  while IFS= read -r SVC; do
    SPEC_PATH="${SVC%.service.ts}.service.spec.ts"
    if [ ! -f "$SPEC_PATH" ]; then
      echo "" >&2
      echo "===== STOP HOOK: SPEC MANCANTE =====" >&2
      echo "Manca: $SPEC_PATH" >&2
      FAILED=1
    fi
  done <<< "$NEW_SERVICES"
fi

if [ "$FAILED" -gt 0 ]; then
  echo "" >&2
  echo "BLOCCATO: Fixa tutti gli errori sopra prima di finire." >&2
  exit 2
fi
exit 0
