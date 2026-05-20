#!/bin/bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null)
[ -z "$FILE" ] && exit 0
[ ! -f "$FILE" ] && exit 0

# Only check backend service files, skip spec files
if ! echo "$FILE" | grep -qE 'backend/src/.+\.service\.ts$'; then exit 0; fi
if echo "$FILE" | grep -qE '\.spec\.ts$'; then exit 0; fi

MISSING=0
# For each Prisma call, verify tenantId appears within ±5 lines (captures multiline where clauses)
while IFS= read -r match; do
  LINENO=$(echo "$match" | cut -d: -f1)
  START=$(( LINENO > 5 ? LINENO - 5 : 1 ))
  END=$(( LINENO + 5 ))
  CONTEXT=$(sed -n "${START},${END}p" "$FILE" 2>/dev/null)
  if ! echo "$CONTEXT" | grep -q 'tenantId'; then
    MISSING=$(( MISSING + 1 ))
  fi
done < <(grep -nE 'this\.prisma\.\w+\.(findMany|findFirst|findUnique|update|updateMany|delete|deleteMany|count|aggregate|upsert|create)\b' "$FILE" 2>/dev/null | grep -v '^\s*//')

if [ "$MISSING" -gt 0 ]; then
  echo "===== AVVISO TENANT ISOLATION =====" >&2
  echo "$MISSING query Prisma in $(basename "$FILE") potrebbero mancare di tenantId (controllo ±5 righe)." >&2
  echo "Verifica che ogni query abbia where: { tenantId }." >&2
fi
exit 0
