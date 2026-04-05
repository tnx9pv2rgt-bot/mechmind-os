#!/bin/bash
# SessionStart hook — inietta contesto utile all'inizio di ogni sessione

# Read stdin (hook input JSON)
INPUT=$(cat)

# Get current git info
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
LAST_COMMIT=$(git log --oneline -1 2>/dev/null || echo "no commits")

# Check backend port
BE_PORT=""
if lsof -iTCP:3002 -sTCP:LISTEN >/dev/null 2>&1; then
  BE_PORT="3002 (RUNNING)"
elif lsof -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  BE_PORT="3000 (RUNNING)"
else
  BE_PORT="NOT RUNNING"
fi

# Check frontend port
FE_PORT=""
if lsof -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  FE_PORT="3000 (RUNNING)"
else
  FE_PORT="NOT RUNNING"
fi

# Check Docker services
PG_STATUS="DOWN"
REDIS_STATUS="DOWN"
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q postgres; then
  PG_STATUS="UP"
fi
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q redis; then
  REDIS_STATUS="UP"
fi

# Count pending changes
CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

# Output context as stderr (shown to Claude)
cat >&2 <<EOF
📋 MechMind OS — Session Context
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Branch: ${BRANCH} | Last commit: ${LAST_COMMIT}
Backend: ${BE_PORT} | Frontend: ${FE_PORT}
PostgreSQL: ${PG_STATUS} | Redis: ${REDIS_STATUS}
Pending changes: ${CHANGES} files
Demo tenant: 6ab1366a-3e66-44ab-8ba3-3ad203485068
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

exit 0
