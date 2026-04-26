#!/bin/bash
# Descrizione: Review unificato — code quality, commit check, security OWASP 2025
# Parametri: [--type code|commit|security|all]
# Equivalente a: /revisione

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

source "$(dirname "$0")/_error-handler.sh"

TYPE="${1:-code}"
REVIEW_REPORT="./.claude/telemetry/review-${TYPE}-$(date +%Y%m%d-%H%M%S).md"
mkdir -p ./.claude/telemetry

echo "=== REVISIONE: $TYPE ==="
echo ""

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo (git environment)..."
if ! command -v git &>/dev/null; then
  echo "❌ git non disponibile"
  exit 1
fi
if [ ! -d ".git" ]; then
  echo "❌ Repository git non trovato"
  exit 1
fi

case "$TYPE" in
  code|commit|security|all)
    echo "✅ Tipo di review valido: $TYPE"
    ;;
  *)
    echo "❌ Tipo non riconosciuto: $TYPE (valori: code|commit|security|all)"
    exit 1
    ;;
esac
echo ""

{
  echo "# Code Review Report"
  echo "**Data:** $(date)"
  echo "**Tipo:** $TYPE"
  echo ""

  # STEP 1: Raccoglie diff
  echo "## 1. Diff Analysis"
  echo ""
  DIFF=$(git diff 2>/dev/null || echo "(nessun diff)")

  if [ "$DIFF" != "(nessun diff)" ]; then
    echo "Found changes:"
    echo "\`\`\`diff"
    echo "$DIFF" | head -50
    echo "\`\`\`"
  else
    echo "ℹ️  Nessun diff trovato"
  fi
  echo ""

  # STEP 2: Analizza con AI
  echo "## 2. Review Analysis"
  echo ""

  if [ "$TYPE" = "code" ] || [ "$TYPE" = "all" ]; then
    echo "### Code Quality Check"
    echo ""
    if [ "$DIFF" != "(nessun diff)" ]; then
      REVIEW=$(claude -p "$(cat << 'PROMPT'
Code review:
PROMPT
)${DIFF}$(cat << 'PROMPT'

Valuta: readability, performance, security. Dai un giudizio 1-10 e suggerimenti.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")
      echo "$REVIEW"
    else
      echo "ℹ️  Nessun diff disponibile"
    fi
    echo ""
  fi

  if [ "$TYPE" = "commit" ] || [ "$TYPE" = "all" ]; then
    echo "### Commit Message Check"
    echo ""
    if [ "$DIFF" != "(nessun diff)" ]; then
      REVIEW=$(claude -p "$(cat << 'PROMPT'
Commit diff:
PROMPT
)${DIFF}$(cat << 'PROMPT'

Message quality, conventional commits, testing coverage.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")
      echo "$REVIEW"
    else
      echo "ℹ️  Nessun diff disponibile"
    fi
    echo ""
  fi

  if [ "$TYPE" = "security" ] || [ "$TYPE" = "all" ]; then
    echo "### Security Review (OWASP 2025)"
    echo ""

    if [ -d "backend/src" ]; then
      VULNS=$(grep -r "eval\|exec\|SQL\|password\|token" backend/src --include="*.ts" 2>/dev/null | grep -v "encrypted\|hash" | head -30 || echo "(nessuna vulnerabilità trovata)")

      if [ "$VULNS" != "(nessuna vulnerabilità trovata)" ] && [ -n "$VULNS" ]; then
        OWASP=$(claude -p "$(cat << 'PROMPT'
Vulnerabilità trovate:
PROMPT
)${VULNS}$(cat << 'PROMPT'

Diff:
PROMPT
)${DIFF}$(cat << 'PROMPT'

Classifica per OWASP A01-A10. Formato: linea | OWASP-id | severity | fix
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")
        echo "$OWASP"
      else
        echo "✅ Nessun pattern di vulnerabilità rilevato"
      fi
    else
      echo "⚠️  Directory backend/src non trovata"
    fi
    echo ""
  fi

  echo "✅ Revisione completata."

} | tee "$REVIEW_REPORT"

echo ""
echo "📋 Report salvato: $REVIEW_REPORT"
