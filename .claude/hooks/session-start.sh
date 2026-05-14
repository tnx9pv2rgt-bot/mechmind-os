#!/usr/bin/env bash
# SessionStart hook — context injection + diagnostic checks.
# Resilient: derives REPO_ROOT from script location (no git CLI dependency).

set -uo pipefail

INPUT=$(cat 2>/dev/null || true)

# Derive repo root from script location: <REPO>/.claude/hooks/this-file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TELEMETRY_DIR="$REPO_ROOT/.claude/telemetry"
mkdir -p "$TELEMETRY_DIR" 2>/dev/null || true

# ───── Git context (read .git/HEAD directly, no git CLI) ─────
BRANCH="unknown"
if [[ -f "$REPO_ROOT/.git/HEAD" ]]; then
  HEAD_CONTENT=$(cat "$REPO_ROOT/.git/HEAD" 2>/dev/null)
  if [[ "$HEAD_CONTENT" =~ ref:\ refs/heads/(.+)$ ]]; then
    BRANCH="${BASH_REMATCH[1]}"
  fi
fi
LAST_COMMIT="(git CLI non disponibile)"
CHANGES="?"
if command -v git >/dev/null 2>&1; then
  GIT_OUT=$(cd "$REPO_ROOT" && git rev-parse --show-toplevel 2>/dev/null)
  if [[ -n "$GIT_OUT" ]]; then
    LAST_COMMIT=$(cd "$REPO_ROOT" && git log --oneline -1 2>/dev/null || echo "no commits")
    CHANGES=$(cd "$REPO_ROOT" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  fi
fi

# ───── Backend / Frontend ports ─────
BE_STATUS="DOWN"
lsof -iTCP:3002 -sTCP:LISTEN -n -P >/dev/null 2>&1 && BE_STATUS="3002 (RUNNING)"
FE_STATUS="DOWN"
lsof -iTCP:3000 -sTCP:LISTEN -n -P >/dev/null 2>&1 && FE_STATUS="3000 (RUNNING)"

# ───── Docker services ─────
PG_STATUS="DOWN"
REDIS_STATUS="DOWN"
if command -v docker >/dev/null 2>&1; then
  DOCKER_PS=$(docker ps --format '{{.Names}}' 2>/dev/null || echo "")
  echo "$DOCKER_PS" | grep -q postgres && PG_STATUS="UP"
  echo "$DOCKER_PS" | grep -q redis && REDIS_STATUS="UP"
fi

# ───── #3 Version sentinel ─────
VERSION_WARN=""
if command -v claude >/dev/null 2>&1; then
  CC_VER=$(claude --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  if [[ -n "$CC_VER" ]]; then
    IFS='.' read -r CC_MAJ CC_MIN CC_PATCH <<< "$CC_VER"
    if (( CC_MAJ < 2 )) || { (( CC_MAJ == 2 )) && (( CC_MIN < 1 )); } || { (( CC_MAJ == 2 )) && (( CC_MIN == 1 )) && (( CC_PATCH < 33 )); }; then
      VERSION_WARN="⚠️ Claude Code v${CC_VER} — memory: project richiede ≥ v2.1.33"
    fi
  fi
fi

# ───── #2 Stale lock cleanup (proactive) ─────
LOCK_DIR="${TMPDIR:-/tmp}/claude-task-locks"
LOCK_REPORT=""
if [[ -d "$LOCK_DIR" ]]; then
  TTL_SEC="${COST_CEILING_TTL_SEC:-1800}"
  NOW=$(date +%s)
  cleaned=0; remaining=0
  for f in "$LOCK_DIR"/*.lock; do
    [[ -f "$f" ]] || continue
    MTIME=$(stat -f %m "$f" 2>/dev/null || echo 0)
    AGE=$(( NOW - MTIME ))
    if (( AGE > TTL_SEC )); then
      rm -f "$f" 2>/dev/null && cleaned=$((cleaned + 1))
    else
      remaining=$((remaining + 1))
    fi
  done
  if (( cleaned > 0 || remaining > 0 )); then
    LOCK_REPORT="Locks: $remaining attivi, $cleaned stantii ripuliti"
  fi
fi

# ───── #1 Compact frequency anomaly ─────
COMPACT_LOG="$TELEMETRY_DIR/compact-events.jsonl"
SESSION_LOG="$TELEMETRY_DIR/sessions.jsonl"
NOW_ISO=$(date -Iseconds)
echo "{\"event\":\"session_start\",\"ts\":\"$NOW_ISO\",\"branch\":\"$BRANCH\"}" >> "$SESSION_LOG" 2>/dev/null || true

ANOMALY_WARN=""
if [[ -f "$COMPACT_LOG" ]]; then
  ONE_HOUR_AGO=$(date -v-1H +%s 2>/dev/null || date -d '1 hour ago' +%s 2>/dev/null || echo 0)
  RECENT_COMPACTS=0
  while IFS= read -r line; do
    TS=$(echo "$line" | grep -oE '"ts":"[^"]+"' | head -1 | sed 's/"ts":"//; s/"$//')
    [[ -z "$TS" ]] && continue
    EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S%z" "${TS}" +%s 2>/dev/null || echo 0)
    if (( EPOCH > ONE_HOUR_AGO )); then
      RECENT_COMPACTS=$((RECENT_COMPACTS + 1))
    fi
  done < "$COMPACT_LOG"

  if (( RECENT_COMPACTS >= 5 )); then
    ANOMALY_WARN="⚠️ ANOMALIA: $RECENT_COMPACTS compact in 1h — possibile bug caching (vedi GH#40524 marzo 2026). Prova /clear."
  fi
fi

# ───── Output context ─────
{
  echo "📋 MechMind OS — Session Context"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Branch: ${BRANCH} | Last: ${LAST_COMMIT}"
  echo "Backend: ${BE_STATUS} | Frontend: ${FE_STATUS}"
  echo "PostgreSQL: ${PG_STATUS} | Redis: ${REDIS_STATUS}"
  echo "Pending changes: ${CHANGES} files"
  echo "Demo tenant: 6ab1366a-3e66-44ab-8ba3-3ad203485068"
  [[ -n "$LOCK_REPORT" ]] && echo "$LOCK_REPORT"
  [[ -n "$VERSION_WARN" ]] && echo "$VERSION_WARN"
  [[ -n "$ANOMALY_WARN" ]] && echo "$ANOMALY_WARN"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
} >&2

exit 0
