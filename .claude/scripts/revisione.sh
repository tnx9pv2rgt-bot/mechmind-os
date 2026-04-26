#!/bin/bash
# Descrizione: Review unificato — code quality, commit check, security OWASP 2025
# Parametri: [--type code|commit|security|all]
# Equivalente a: /revisione

set -euo pipefail

TYPE="${1:-code}"

echo "=== REVISIONE: $TYPE ==="
echo ""

# STEP 1: Raccoglie diff
echo "1️⃣  Raccogliendo git diff..."
DIFF=$(git diff 2>/dev/null || echo "(nessun diff)")

# STEP 2: Analizza con AI
echo "2️⃣  Analizzando con AI..."

if [ "$TYPE" = "code" ] || [ "$TYPE" = "all" ]; then
  echo "   ▪️  Code quality check..."
  REVIEW=$(claude -p "$(cat << 'PROMPT'
Code review:
PROMPT
)${DIFF}$(cat << 'PROMPT'

Valuta: readability, performance, security. Dai un giudizio 1-10 e suggerimenti.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")
  echo "$REVIEW"
fi

if [ "$TYPE" = "commit" ] || [ "$TYPE" = "all" ]; then
  echo "   ▪️  Commit check..."
  REVIEW=$(claude -p "$(cat << 'PROMPT'
Commit diff:
PROMPT
)${DIFF}$(cat << 'PROMPT'

Message quality, conventional commits, testing coverage.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")
  echo "$REVIEW"
fi

if [ "$TYPE" = "security" ] || [ "$TYPE" = "all" ]; then
  echo "   ▪️  Security review (OWASP 2025)..."
  
  # STEP 1: Esegui grep per trovare pattern insicuri
  VULNS=$(grep -r "eval\|exec\|SQL\|password\|token" src --include="*.ts" 2>/dev/null | grep -v "encrypted\|hash" | head -30 || echo "(nessuna vulnerabilità trovata)")
  
  # STEP 2: Classifica OWASP
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
fi

echo ""
echo "✅ Revisione completata."
