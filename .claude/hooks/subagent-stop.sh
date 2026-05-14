#!/usr/bin/env bash
# SubagentStop: release the cost-ceiling lock for this subagent
set -uo pipefail

INPUT=$(cat)
LOCK_DIR="${TMPDIR:-/tmp}/claude-task-locks"

if command -v jq >/dev/null 2>&1; then
  TUID=$(echo "$INPUT" | jq -r '.tool_use_id // empty' 2>/dev/null || echo "")
  [[ -n "$TUID" ]] && rm -f "$LOCK_DIR/${TUID}.lock" 2>/dev/null || true
fi

exit 0
