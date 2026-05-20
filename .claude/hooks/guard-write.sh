#!/usr/bin/env bash
# PreToolUse guard for Write|Edit|MultiEdit
# Blocks: mock/demo data in API routes, @ts-ignore/@ts-expect-error in code files,
#         console.log in production code files
# NB: scope-limited to code files (.ts/.tsx/.js/.jsx) — anti-pattern strings can be
#     legitimately CITED in markdown/docs/memory files.

set -uo pipefail

INPUT=$(cat)

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null || echo "")
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty' 2>/dev/null || echo "")

[[ -z "$FILE" ]] && exit 0

deny() {
  local reason="$1"
  jq -n --arg r "$reason" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $r}}'
  exit 0
}

# Guard 1: mock/demo data in frontend API routes (always-on, file path naturally constrained)
if echo "$FILE" | grep -qE 'app/api/.*route\.ts$'; then
  if echo "$CONTENT" | grep -qiE 'DEMO_DATA|demoData|mockData|isDemoMode|demo\.mode|getDemoData|fakeData'; then
    deny "VIETATO: mock/demo data nelle route API. Usa SOLO proxyToNestJS({ backendPath: 'v1/<resource>' })."
  fi
fi

# Guards 2 & 3 apply ONLY to code files. Documentation/MEMORY files may legitimately
# cite anti-patterns (e.g., "MAI usare @ts-ignore" as a rule).
is_code_file=false
case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) is_code_file=true ;;
esac
if [[ "$is_code_file" != "true" ]]; then
  exit 0
fi

# Guard 2: ts-bypass directives in code
if echo "$CONTENT" | grep -qE '@ts-ignore|@ts-expect-error'; then
  deny "VIETATO: directive di bypass TS nei file di codice. Tipi corretti, non bypass."
fi

# Guard 3: console.log in production code (skip spec/test files)
if ! echo "$FILE" | grep -qE '\.(spec|test|e2e-spec)\.(ts|tsx|js|jsx)$'; then
  if echo "$CONTENT" | grep -qE 'console\.log\('; then
    deny "VIETATO: console.log in produzione. Usa Logger del framework (this.logger.log/warn/error)."
  fi
fi

exit 0
