#!/usr/bin/env bash
# Standalone stale-lock cleaner for cost-ceiling.
# Usage:
#   bash .claude/hooks/clean-locks.sh           # clean stale only (>30min)
#   bash .claude/hooks/clean-locks.sh --all     # nuke ALL locks (use after crash)
#   bash .claude/hooks/clean-locks.sh --status  # report only

set -euo pipefail

LOCK_DIR="${TMPDIR:-/tmp}/claude-task-locks"
TTL_SEC="${COST_CEILING_TTL_SEC:-1800}"

mode="${1:-}"

if [[ ! -d "$LOCK_DIR" ]]; then
  echo "(nessun lock dir: $LOCK_DIR)"
  exit 0
fi

NOW=$(date +%s)
total=0
stale=0
fresh=0

for f in "$LOCK_DIR"/*.lock; do
  [[ -f "$f" ]] || continue
  total=$((total + 1))
  MTIME=$(stat -f %m "$f" 2>/dev/null || echo 0)
  AGE=$(( NOW - MTIME ))
  if (( AGE > TTL_SEC )); then
    stale=$((stale + 1))
  else
    fresh=$((fresh + 1))
  fi
done

case "$mode" in
  --status)
    echo "Lock dir: $LOCK_DIR"
    echo "Total locks: $total"
    echo "Fresh (<${TTL_SEC}s): $fresh"
    echo "Stale (>${TTL_SEC}s): $stale"
    ;;
  --all)
    find "$LOCK_DIR" -type f -name '*.lock' -delete
    echo "Rimossi tutti i $total lock."
    ;;
  *)
    # Default: stale-only cleanup
    cleaned=0
    for f in "$LOCK_DIR"/*.lock; do
      [[ -f "$f" ]] || continue
      MTIME=$(stat -f %m "$f" 2>/dev/null || echo 0)
      AGE=$(( NOW - MTIME ))
      if (( AGE > TTL_SEC )); then
        rm -f "$f" && cleaned=$((cleaned + 1))
      fi
    done
    echo "Lock cleanup: $cleaned stale rimossi (su $total totali, $fresh fresh tenuti)."
    ;;
esac
