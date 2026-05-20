#!/usr/bin/env bash
# Master config verifier — esegui dopo modifiche o per debug.
# Verifica: path-scoped CLAUDE.md, hook syntax, JSON validity, memory stack,
#           subagent frontmatter, anti-regressioni, configurabilità env.

set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOME_CC="$HOME"

PASS=0
FAIL=0
ok() { echo "✅ $1"; PASS=$((PASS+1)); }
ko() { echo "❌ $1"; FAIL=$((FAIL+1)); }

echo "═══════════════════════════════════════════════"
echo "  CLAUDE CODE CONFIG VERIFIER (NASA)"
echo "  Repo: $REPO_ROOT"
echo "═══════════════════════════════════════════════"

echo ""
echo "── 1. CLAUDE.md hierarchy (path-scoped) ──"
for f in "$REPO_ROOT/CLAUDE.md" "$REPO_ROOT/backend/CLAUDE.md" "$REPO_ROOT/frontend/CLAUDE.md" "$HOME_CC/CLAUDE.md"; do
  if [[ -f "$f" ]]; then
    LINES=$(wc -l < "$f" | tr -d ' ')
    if (( LINES <= 200 )); then
      ok "${f#$REPO_ROOT/}: ${LINES}L (≤200 best practice)"
    else
      ko "${f#$REPO_ROOT/}: ${LINES}L > 200 (Anthropic 2026 limit)"
    fi
  else
    ko "missing: $f"
  fi
done

echo ""
echo "── 2. CLAUDE.md @import ban (just-in-time loading) ──"
PROJECT_CLAUDE="$REPO_ROOT/CLAUDE.md"
IMPORT_COUNT=0
if [[ -f "$PROJECT_CLAUDE" ]]; then
  IMPORT_COUNT=$(grep -cE '^@[A-Za-z0-9./_-]+\.md' "$PROJECT_CLAUDE" 2>/dev/null | head -1 | tr -d ' \n')
  [[ -z "$IMPORT_COUNT" ]] && IMPORT_COUNT=0
fi
if (( IMPORT_COUNT == 0 )); then
  ok "Project CLAUDE.md: zero @imports (just-in-time)"
else
  ko "Project CLAUDE.md ha $IMPORT_COUNT @import (violazione 2026 just-in-time)"
fi

echo ""
echo "── 3. JSON validity ──"
for f in "$HOME_CC/.claude/settings.json" "$HOME_CC/.claude/settings.local.json" "$REPO_ROOT/.claude/settings.json"; do
  if [[ -f "$f" ]]; then
    jq empty "$f" 2>/dev/null && ok "JSON valid: $(basename "$(dirname "$f")")/$(basename "$f")" || ko "JSON invalid: $f"
  fi
done

echo ""
echo "── 4. Hook scripts: syntax + executable ──"
for f in "$REPO_ROOT/.claude/hooks/"*.sh; do
  base=$(basename "$f")
  bash -n "$f" 2>/dev/null && [[ -x "$f" ]] && ok "$base" || ko "$base: syntax/exec error"
done

echo ""
echo "── 5. Hook events configured ──"
EVENTS=$(jq -r '.hooks | keys[]?' "$REPO_ROOT/.claude/settings.json" 2>/dev/null)
for e in SessionStart PostCompact Notification Stop SubagentStop PreToolUse PostToolUse; do
  echo "$EVENTS" | grep -qx "$e" && ok "event: $e" || ko "missing event: $e"
done

echo ""
echo "── 6. Memory stack (Layer 2 + Subagent) ──"
[[ -s "$HOME_CC/.claude/MEMORY.md" ]] && ok "Layer 2 Auto-Memory popolato" || ko "MEMORY.md vuoto"
COUNT=$(find "$HOME_CC/.claude/memory" -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
(( COUNT >= 4 )) && ok "$COUNT file di memoria utente" || ko "Solo $COUNT file"

AGENTS=(code-reviewer db-auditor test-runner ts-fixer \
  nexo-architect backend-engineer frontend-engineer security-auditor \
  devops-engineer compliance-officer performance-optimizer incident-responder \
  tech-writer migration-specialist ux-auditor analytics-reporter \
  seo-geo-agent content-writer support-l1-agent product-thinker \
  i18n-agent qa-lead)
for a in "${AGENTS[@]}"; do
  if [[ -f "$REPO_ROOT/.claude/agents/${a}.md" ]]; then
    grep -q '^memory: project' "$REPO_ROOT/.claude/agents/${a}.md" 2>/dev/null \
      && ok "agent $a: memory frontmatter" \
      || ko "agent $a: NO memory frontmatter"
    [[ -s "$REPO_ROOT/.claude/agent-memory/${a}/MEMORY.md" ]] \
      && ok "agent $a: MEMORY.md seed" \
      || ko "agent $a: MEMORY.md missing"
  else
    ko "agent file missing: ${a}.md"
  fi
done

echo ""
echo "── 7. Cost-ceiling configurable ──"
HOOK="$REPO_ROOT/.claude/hooks/cost-ceiling.sh"
grep -q 'MAX_PARALLEL_AGENTS' "$HOOK" && ok "env var MAX_PARALLEL_AGENTS supportato" || ko "env var missing"
grep -q 'HARD_MAX=8' "$HOOK" && ok "hard upper bound 8 (anti-bypass)" || ko "no hard cap"
grep -q 'HARD_MIN=1' "$HOOK" && ok "hard lower bound 1 (anti-disable)" || ko "no min cap"

echo ""
echo "── 8. Resilience to git CLI absence ──"
for f in "$REPO_ROOT/.claude/hooks/session-start.sh" "$REPO_ROOT/.claude/hooks/post-compact.sh" "$REPO_ROOT/.claude/hooks/post-edit.sh"; do
  base=$(basename "$f")
  if grep -q 'SCRIPT_DIR=' "$f" && grep -q 'BASH_SOURCE\[0\]' "$f"; then
    ok "$base: usa SCRIPT_DIR (git-CLI-independent)"
  else
    ko "$base: dipende da git CLI (fragile)"
  fi
done

echo ""
echo "── 9. Anti-regression: file orfani / chiavi invalide ──"
for f in style.md constraints.md project.md quality.md security.md user_profile.md; do
  [[ ! -f "$REPO_ROOT/.claude/$f" ]] && ok "rimosso orfano: $f" || ko "ancora presente: $f"
done
[[ ! -f "$REPO_ROOT/.claude/hooks/task-completed.sh" ]] && ok "rimosso script morto: task-completed.sh" || ko "task-completed.sh ancora presente"

jq -e '.effortLevel // empty' "$HOME_CC/.claude/settings.json" >/dev/null 2>&1 \
  && ko "effortLevel ancora presente" || ok "effortLevel rimosso"
jq -e '.skipDangerousModePermissionPrompt // empty' "$HOME_CC/.claude/settings.json" >/dev/null 2>&1 \
  && ko "skipDangerousModePermissionPrompt ancora presente" || ok "skipDangerousModePermissionPrompt rimosso"
jq -e '.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE // empty' "$HOME_CC/.claude/settings.json" >/dev/null 2>&1 \
  && ko "AUTOCOMPACT_OVERRIDE ancora presente" || ok "AUTOCOMPACT_OVERRIDE rimosso"

echo ""
echo "── 10. Backup ──"
BACKUP="$HOME_CC/.claude/backups/audit-2026-05-10"
[[ -d "$BACKUP" ]] && ok "backup dir presente" || ko "backup MISSING"
COUNT=$(ls -1 "$BACKUP" 2>/dev/null | wc -l | tr -d ' ')
(( COUNT >= 5 )) && ok "$COUNT backup files (rollback ready)" || ko "Solo $COUNT backup"

echo ""
echo "── 11. Anomaly detector telemetry ──"
[[ -d "$REPO_ROOT/.claude/telemetry" ]] && ok "telemetry dir presente" || ko "telemetry dir missing"
grep -q 'ANOMALY_WARN' "$REPO_ROOT/.claude/hooks/session-start.sh" \
  && ok "session-start include anomaly check" || ko "anomaly check missing"
grep -q 'compact-events.jsonl' "$REPO_ROOT/.claude/hooks/post-compact.sh" \
  && ok "post-compact logs telemetry" || ko "compact telemetry missing"

echo ""
echo "── 12. Multi-agent coordination layer (.claude/teams) ──"
[[ -d "$REPO_ROOT/.claude/teams" ]] && ok "teams dir presente" || ko "teams dir missing"
[[ -f "$REPO_ROOT/.claude/teams/decisions.md" ]] && ok "decisions.md log presente" || ko "decisions.md missing"
[[ -f "$REPO_ROOT/.claude/teams/tasks.jsonl" ]] && ok "tasks.jsonl shared list presente" || ko "tasks.jsonl missing"
[[ -d "$REPO_ROOT/.claude/teams/mail" ]] && ok "mail dir per peer-to-peer" || ko "mail dir missing"
[[ -f "$REPO_ROOT/.claude/teams/ownership-matrix.md" ]] && ok "ownership-matrix.md (single-writer rules)" || ko "ownership-matrix missing"
[[ -f "$REPO_ROOT/.claude/teams/README.md" ]] && ok "teams/README.md (coordination doc)" || ko "teams/README missing"

echo ""
echo "── 13. Agents inventory (22 totali) ──"
AGENT_COUNT=$(ls -1 "$REPO_ROOT/.claude/agents/"*.md 2>/dev/null | wc -l | tr -d ' ')
(( AGENT_COUNT == 22 )) && ok "22/22 agenti presenti" || ko "Solo $AGENT_COUNT agenti (atteso 22)"

echo ""
echo "═══════════════════════════════════════════════"
echo "  TOTALE: PASS=$PASS  FAIL=$FAIL"
echo "═══════════════════════════════════════════════"

exit $FAIL
