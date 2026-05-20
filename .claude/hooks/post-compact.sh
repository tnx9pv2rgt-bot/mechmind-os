#!/usr/bin/env bash
# PostCompact: log event for anomaly detector + re-inject core rules.
set -uo pipefail

INPUT=$(cat 2>/dev/null || true)

# Derive repo root from script location (resilient to git CLI absence)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TELEMETRY_DIR="$REPO_ROOT/.claude/telemetry"
mkdir -p "$TELEMETRY_DIR" 2>/dev/null || true

# Read branch from .git/HEAD directly
BRANCH="unknown"
if [[ -f "$REPO_ROOT/.git/HEAD" ]]; then
  HEAD_CONTENT=$(cat "$REPO_ROOT/.git/HEAD" 2>/dev/null)
  [[ "$HEAD_CONTENT" =~ ref:\ refs/heads/(.+)$ ]] && BRANCH="${BASH_REMATCH[1]}"
fi

# Log compact event
NOW_ISO=$(date -Iseconds)
echo "{\"event\":\"compact\",\"ts\":\"$NOW_ISO\",\"branch\":\"$BRANCH\"}" >> "$TELEMETRY_DIR/compact-events.jsonl" 2>/dev/null || true

# Re-inject core rules
{
  printf "\033[33m===== POST COMPACTION: REGOLE CORE =====\033[0m\n"
  printf " * OGNI query Prisma -> where: { tenantId }\n"
  printf " * PII -> SOLO EncryptionService (AES-256-CBC)\n"
  printf " * Route API frontend -> SOLO proxyToNestJS — MAI mock/demo data\n"
  printf " * TDD: test PRIMA — minimo 1 .spec.ts per service/controller\n"
  printf " * Fine task: npx tsc --noEmit && npm run lint && npx jest --forceExit\n"
  printf " * Branch: %s | Backend: 3002 | Frontend: 3000\n" "$BRANCH"
} >&2

exit 0
