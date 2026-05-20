#!/bin/bash
# FileChanged hook — auto-genera Prisma client quando schema.prisma cambia

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null)

# Only trigger for schema.prisma
if echo "$FILE" | grep -q 'schema.prisma'; then
  echo "Schema Prisma modificato — rigenerazione client..." >&2
  cd backend && npx prisma generate 2>&1 | tail -3 >&2
fi

exit 0
