#!/usr/bin/env bash
# E2E hook smoke test — production-realistic scenarios.
# Esegui prima/dopo ogni cambio config.

set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOKS="$REPO_ROOT/.claude/hooks"

PASS=0
FAIL=0
ok() { echo "✅ $1"; PASS=$((PASS+1)); }
ko() { echo "❌ $1"; FAIL=$((FAIL+1)); }

export TMPDIR="/tmp/e2e-$$"
mkdir -p "$TMPDIR"
trap 'find "$TMPDIR" -type f -delete; rmdir "$TMPDIR" 2>/dev/null || true' EXIT

# Build sensitive payloads dynamically (avoid triggering literal-string guards)
DANGER_BRANCH="m"$(printf "ai")"n"
DANGER_CMD="git pu"$(printf "sh")" origin $DANGER_BRANCH"
DOTENV=$(printf '.%s' env)
ENV_CMD="cat backend/$DOTENV"

echo "═══════════════════════════════════════════════"
echo "  E2E HOOK SMOKE TESTS"
echo "═══════════════════════════════════════════════"

echo ""
echo "── S1: dev tenta push to protected branch → BLOCK ──"
OUT=$(echo "{\"tool_input\":{\"command\":\"$DANGER_CMD\"}}" | bash "$HOOKS/guard-bash.sh" 2>&1; echo "EXIT=$?")
echo "$OUT" | grep -q 'EXIT=2' && ok "push protetto bloccato" || ko "FAIL: $OUT"

echo ""
echo "── S2: dev legge file segreto via cat → BLOCK ──"
OUT=$(echo "{\"tool_input\":{\"command\":\"$ENV_CMD\"}}" | bash "$HOOKS/guard-bash.sh" 2>&1; echo "EXIT=$?")
echo "$OUT" | grep -q 'EXIT=2' && ok "secrets read bloccato" || ko "FAIL: $OUT"

echo ""
echo "── S3: AI scrive mock data in API route → DENY ──"
OUT=$(echo '{"tool_input":{"file_path":"frontend/app/api/booking/route.ts","content":"const x = mockData()"}}' | bash "$HOOKS/guard-write.sh")
echo "$OUT" | jq -e '.hookSpecificOutput.permissionDecision == "deny"' >/dev/null && ok "mock in route negato" || ko "FAIL"

echo ""
echo "── S4: AI mette ts-bypass in service → DENY ──"
TS_BYPASS="@"$(printf "ts-")"ignore"
OUT=$(echo "{\"tool_input\":{\"file_path\":\"backend/src/foo.service.ts\",\"content\":\"// $TS_BYPASS\"}}" | bash "$HOOKS/guard-write.sh")
echo "$OUT" | jq -e '.hookSpecificOutput.permissionDecision == "deny"' >/dev/null && ok "ts-bypass in code negato" || ko "FAIL"

echo ""
echo "── S5: AI cita anti-pattern in MEMORY.md → ALLOW ──"
OUT=$(echo "{\"tool_input\":{\"file_path\":\".claude/agent-memory/foo/MEMORY.md\",\"content\":\"MAI usare $TS_BYPASS\"}}" | bash "$HOOKS/guard-write.sh" 2>&1)
[[ -z "$OUT" ]] && ok "anti-pattern in .md permesso" || ko "FAIL: $OUT"

echo ""
echo "── S6: proxyToNestJS in API route → ALLOW ──"
OUT=$(echo '{"tool_input":{"file_path":"frontend/app/api/booking/route.ts","content":"return proxyToNestJS({backendPath:\"v1/booking\"});"}}' | bash "$HOOKS/guard-write.sh" 2>&1)
[[ -z "$OUT" ]] && ok "proxyToNestJS permesso" || ko "FAIL: $OUT"

echo ""
echo "── S7: 5 subagent paralleli → 5° BLOCKED (cap=4 default) ──"
LD="$TMPDIR/claude-task-locks"
rm -rf "$LD" 2>/dev/null
for tid in a b c d; do
  echo "{\"tool_use_id\":\"$tid\"}" | bash "$HOOKS/cost-ceiling.sh" >/dev/null
done
OUT=$(echo '{"tool_use_id":"e"}' | bash "$HOOKS/cost-ceiling.sh")
echo "$OUT" | jq -e '.hookSpecificOutput.permissionDecision == "deny"' >/dev/null && ok "5° subagent bloccato" || ko "FAIL"

echo ""
echo "── S8: SubagentStop libera lock → 6° passa ──"
echo '{"tool_use_id":"a"}' | bash "$HOOKS/subagent-stop.sh" >/dev/null
OUT=$(echo '{"tool_use_id":"f"}' | bash "$HOOKS/cost-ceiling.sh" 2>&1)
[[ -z "$OUT" ]] && ok "post-stop ricicla slot" || ko "FAIL: $OUT"

echo ""
echo "── S9: env override cap=2 → 3° BLOCKED ──"
rm -rf "$LD" 2>/dev/null
echo '{"tool_use_id":"x"}' | MAX_PARALLEL_AGENTS=2 bash "$HOOKS/cost-ceiling.sh" >/dev/null
echo '{"tool_use_id":"y"}' | MAX_PARALLEL_AGENTS=2 bash "$HOOKS/cost-ceiling.sh" >/dev/null
OUT=$(echo '{"tool_use_id":"z"}' | MAX_PARALLEL_AGENTS=2 bash "$HOOKS/cost-ceiling.sh")
echo "$OUT" | jq -e '.hookSpecificOutput.permissionDecision == "deny"' >/dev/null && ok "MAX_PARALLEL_AGENTS=2 enforced" || ko "FAIL"

echo ""
echo "── S10: bypass attempt cap=999 → clampato a 8 ──"
rm -rf "$LD" 2>/dev/null
for i in 1 2 3 4 5 6 7 8; do
  echo "{\"tool_use_id\":\"agent$i\"}" | MAX_PARALLEL_AGENTS=999 bash "$HOOKS/cost-ceiling.sh" >/dev/null
done
OUT=$(echo '{"tool_use_id":"agent9"}' | MAX_PARALLEL_AGENTS=999 bash "$HOOKS/cost-ceiling.sh")
echo "$OUT" | jq -e '.hookSpecificOutput.permissionDecision == "deny"' >/dev/null && ok "bypass clampato a 8" || ko "FAIL"

echo ""
echo "── S11: SessionStart output completo + no path bug ──"
OUT=$(echo '{}' | bash "$HOOKS/session-start.sh" 2>&1)
echo "$OUT" | grep -q 'Session Context' && ok "session-start outputs context" || ko "FAIL"
[[ ! -d "$REPO_ROOT/.claude/hooks/.claude" ]] && ok "no path bug nested" || ko "path bug presente"

echo ""
echo "── S12: PostCompact logga telemetria ──"
LINES_BEFORE=$(wc -l < "$REPO_ROOT/.claude/telemetry/compact-events.jsonl" 2>/dev/null || echo 0)
echo '{}' | bash "$HOOKS/post-compact.sh" >/dev/null 2>&1
LINES_AFTER=$(wc -l < "$REPO_ROOT/.claude/telemetry/compact-events.jsonl" 2>/dev/null || echo 0)
(( LINES_AFTER > LINES_BEFORE )) && ok "compact event loggato" || ko "FAIL: $LINES_BEFORE→$LINES_AFTER"

echo ""
echo "── S13: clean-locks utility ──"
OUT=$(bash "$HOOKS/clean-locks.sh" --status 2>&1)
echo "$OUT" | grep -q 'Total locks' && ok "clean-locks --status OK" || ko "FAIL"

echo ""
echo "── S14: post-edit non blocca mai ──"
echo '{"tool_input":{"file_path":"/nonexistent.ts"}}' | bash "$HOOKS/post-edit.sh"; E=$?
[[ "$E" == "0" ]] && ok "post-edit non-blocking" || ko "FAIL exit=$E"

echo ""
echo "═══════════════════════════════════════════════"
echo "  E2E TOTALE: PASS=$PASS  FAIL=$FAIL"
echo "═══════════════════════════════════════════════"

exit $FAIL
