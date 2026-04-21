#!/bin/bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null)
[ -z "$FILE" ] && exit 0
[ ! -f "$FILE" ] && exit 0

# Only check backend service files, skip spec files
if ! echo "$FILE" | grep -qE 'backend/src/.+\.service\.ts$'; then exit 0; fi
if echo "$FILE" | grep -qE '\.spec\.ts$'; then exit 0; fi

# Count Prisma query calls that don't have tenantId on the same or adjacent lines
MISSING=$(grep -nE 'this\.prisma\.\w+\.(findMany|findFirst|findUnique|update|updateMany|delete|deleteMany|count|aggregate|upsert|create)\b' "$FILE" 2>/dev/null | grep -v 'tenantId' | grep -v '^\s*//' | wc -l | tr -d ' ')

if [ "$MISSING" -gt 0 ]; then
  echo "===== AVVISO TENANT ISOLATION =====" >&2
  echo "$MISSING query Prisma in $(basename "$FILE") potrebbero mancare di tenantId." >&2
  echo "Verifica che ogni query abbia where: { tenantId }." >&2
fi
exit 0
