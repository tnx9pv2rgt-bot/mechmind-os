#!/usr/bin/env bash
# PreToolUse guard for Bash tool
# Blocks: push to main/master, .env reads via CLI, download-and-execute pipelines

set -euo pipefail

INPUT=$(cat)

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")
[[ -z "$COMMAND" ]] && exit 0

# Guard 1: block git push to main/master directly (also refspec push from/to main)
if echo "$COMMAND" | grep -qE 'git[[:space:]]+push([[:space:]]+[^|;&]+)*[[:space:]]+(main|master)([[:space:]:]|$)'; then
  echo "BLOCCATO: push diretto a main/master vietato. Usa un feature branch + PR." >&2
  exit 2
fi
if echo "$COMMAND" | grep -qE 'git[[:space:]]+push[[:space:]].*:(main|master)([[:space:]]|$)'; then
  echo "BLOCCATO: push verso main/master vietato (refspec). Usa un feature branch + PR." >&2
  exit 2
fi

# Guard 2: block reading .env files via shell viewers
if echo "$COMMAND" | grep -qE '(^|[[:space:]])(cat|less|more|head|tail|vi|vim|nano|bat|code)[[:space:]]+[^|;&]*\.env(\.|[[:space:]]|$)'; then
  echo "BLOCCATO: lettura .env vietata via CLI. Usa process.env nel codice." >&2
  exit 2
fi

# Guard 3: block curl|wget piped to shell (download-and-execute)
if echo "$COMMAND" | grep -qE '(curl|wget)[[:space:]]+[^|]*\|[[:space:]]*(bash|sh|zsh)([[:space:]]|$)'; then
  echo "BLOCCATO: download-and-execute vietato (supply chain risk)." >&2
  exit 2
fi

exit 0
