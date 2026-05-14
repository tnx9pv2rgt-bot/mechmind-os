#!/usr/bin/env bash
# PostToolUse Write|Edit|MultiEdit: prettier + log. Never blocks.
set -uo pipefail

INPUT=$(cat)

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null || echo "")
[[ -z "$FILE" ]] && exit 0
[[ ! -f "$FILE" ]] && exit 0

EXT="${FILE##*.}"
case "$EXT" in
  ts|tsx|js|jsx|json|css|md)
    npx prettier --write "$FILE" >/dev/null 2>&1 || true
    ;;
esac

# Resilient repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
mkdir -p "$REPO_ROOT/.claude/logs" 2>/dev/null || true
echo "[$(date -Iseconds)] EDIT: $FILE" >> "$REPO_ROOT/.claude/logs/file-changes.log" 2>/dev/null || true

exit 0
