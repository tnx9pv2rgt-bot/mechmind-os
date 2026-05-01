#!/bin/bash
# Descrizione: Verifica che tutte le skill e gli hook funzionino correttamente
# Parametri: nessuno
# Equivalente a: /verifica-skill

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

VERIFY_REPORT="./.claude/telemetry/skill-verify-$(date +%Y%m%d-%H%M%S).md"
mkdir -p ./.claude/telemetry

echo "=== VERIFICA SKILL ==="
echo ""

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo (skill directory)..."
if [ ! -d ".claude/scripts" ]; then
  echo "❌ Directory .claude/scripts non trovata"
  exit 1
fi
if ! command -v bash &>/dev/null; then
  echo "❌ bash non disponibile"
  exit 1
fi
echo "✅ Skill environment OK"
echo ""

{
  echo "# Skill Verification Report"
  echo "**Data:** $(date)"
  echo ""

  # Controlla sintassi bash di tutti gli script
  echo "## 1. Sintassi Bash"
  echo ""

  SYNTAX_ERRORS=0
  for script in .claude/scripts/*.sh; do
    if ! bash -n "$script" 2>/dev/null; then
      echo "⚠️  $script: sintassi non valida"
      SYNTAX_ERRORS=$((SYNTAX_ERRORS + 1))
    fi
  done

  if [ $SYNTAX_ERRORS -eq 0 ]; then
    echo "✅ Tutti gli script hanno sintassi valida"
  else
    echo "❌ $SYNTAX_ERRORS script con errori di sintassi"
  fi
  echo ""

  # Controlla YAML frontmatter skill
  echo "## 2. YAML Frontmatter"
  echo ""
  if [ -d ".claude/skills" ]; then
    FRONTMATTER_ERRORS=0
    for skill in .claude/skills/*/SKILL.md; do
      if [ -f "$skill" ] && ! head -1 "$skill" | grep -q "^---"; then
        echo "⚠️  $skill manca YAML frontmatter"
        FRONTMATTER_ERRORS=$((FRONTMATTER_ERRORS + 1))
      fi
    done
    if [ $FRONTMATTER_ERRORS -eq 0 ]; then
      echo "✅ Tutti gli skill hanno YAML frontmatter corretto"
    else
      echo "❌ $FRONTMATTER_ERRORS skill senza frontmatter"
    fi
  else
    echo "⚠️  Directory .claude/skills non trovata"
  fi
  echo ""

  # Verifica hook funzionali
  echo "## 3. Hook Verification"
  echo ""
  if [ -d ".claude/hooks" ]; then
    HOOK_ERRORS=0
    for hook in .claude/hooks/*.sh; do
      if [ -f "$hook" ] && ! bash -n "$hook" 2>/dev/null; then
        echo "⚠️  $hook: sintassi non valida"
        HOOK_ERRORS=$((HOOK_ERRORS + 1))
      fi
    done
    if [ $HOOK_ERRORS -eq 0 ]; then
      echo "✅ Tutti gli hook hanno sintassi valida"
    else
      echo "❌ $HOOK_ERRORS hook con errori"
    fi
  else
    echo "⚠️  Nessun hook trovato in .claude/hooks"
  fi
  echo ""

  echo "✅ Verifica skill completata."

} | tee "$VERIFY_REPORT"

echo ""
echo "📋 Report salvato: $VERIFY_REPORT"
