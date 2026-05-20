#!/usr/bin/env bash
# Cost-ceiling for Task tool: cap parallel subagents (Mac mini 8GB).
# Strategy: lockfiles in $TMPDIR/claude-task-locks/, TTL stale cleanup.
# Configurable: env MAX_PARALLEL_AGENTS (default 4, clamped 1..8 hard-cap).
# Output: structured JSON (PreToolUse 2026 spec) on deny; exit 0 on allow.

set -uo pipefail

INPUT=$(cat)

LOCK_DIR="${TMPDIR:-/tmp}/claude-task-locks"
TTL_SEC="${COST_CEILING_TTL_SEC:-1800}"

# Hard bounds: prevent both bypass (cap=999) and disabling (cap=0).
HARD_MIN=1
HARD_MAX=8
DEFAULT_CAP=4

CAP_RAW="${MAX_PARALLEL_AGENTS:-$DEFAULT_CAP}"
# Validate integer
if ! [[ "$CAP_RAW" =~ ^[0-9]+$ ]]; then
  CAP_RAW="$DEFAULT_CAP"
fi
# Clamp into [HARD_MIN, HARD_MAX]
if (( CAP_RAW < HARD_MIN )); then
  MAX_PARALLEL=$HARD_MIN
elif (( CAP_RAW > HARD_MAX )); then
  MAX_PARALLEL=$HARD_MAX
else
  MAX_PARALLEL=$CAP_RAW
fi

mkdir -p "$LOCK_DIR" 2>/dev/null || true

# Clean stale locks (mtime older than TTL)
NOW=$(date +%s)
for f in "$LOCK_DIR"/*.lock; do
  [[ -f "$f" ]] || continue
  MTIME=$(stat -f %m "$f" 2>/dev/null || echo 0)
  AGE=$(( NOW - MTIME ))
  if (( AGE > TTL_SEC )); then
    rm -f "$f" 2>/dev/null || true
  fi
done

# Count active locks
COUNT=0
for f in "$LOCK_DIR"/*.lock; do
  [[ -f "$f" ]] && COUNT=$((COUNT + 1))
done

if (( COUNT >= MAX_PARALLEL )); then
  REASON="Cap subagent paralleli raggiunto: ${COUNT}/${MAX_PARALLEL} (Mac mini 8GB). Attendi che uno finisca o esegui in serie. Stale locks (>$(( TTL_SEC / 60 ))min) auto-puliti; per cleanup manuale: bash .claude/hooks/clean-locks.sh"
  if command -v jq >/dev/null 2>&1; then
    jq -n --arg r "$REASON" \
      '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $r}}'
    exit 0
  else
    echo "BLOCCATO: $REASON" >&2
    exit 2
  fi
fi

# Acquire lock
TUID=""
if command -v jq >/dev/null 2>&1; then
  TUID=$(echo "$INPUT" | jq -r '.tool_use_id // empty' 2>/dev/null || echo "")
fi
[[ -z "$TUID" ]] && TUID="task-$$-${NOW}"
echo "$NOW" > "$LOCK_DIR/${TUID}.lock" 2>/dev/null || true

exit 0
