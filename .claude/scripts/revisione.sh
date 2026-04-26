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

  if [ "$TYPE" = "code" ] || [ "$TYPE" = "all" ]; then
    echo "### Conductor-like Automated Review (Google Pattern 2026)"
    echo ""

    # Verifica race conditions
    RACE_RISKS=0
    if [ -d "backend/src" ]; then
      RACE_RISKS=$(grep -rn "findFirst.*then.*update\|findUnique.*then.*update\|advisory.*lock\|SERIALIZABLE" backend/src --include="*.ts" 2>/dev/null | grep -v ".spec.ts" | wc -l || echo "0")
    fi
    if [ "$RACE_RISKS" -gt 0 ]; then
      echo "  🟡 Potenziali race conditions rilevate: $RACE_RISKS occorrenze"
    else
      echo "  ✅ No race condition patterns detected"
    fi
    echo ""

    # Verifica null pointer risks
    NULL_RISKS=0
    if [ -d "backend/src" ]; then
      NULL_RISKS=$(grep -rn "\?\.\|!!\s\|\?\[" backend/src --include="*.ts" 2>/dev/null | grep -v ".spec.ts" | wc -l || echo "0")
    fi
    if [ "$NULL_RISKS" -gt 0 ]; then
      echo "  🟡 Potenziali null/optional issues: $NULL_RISKS occorrenze"
    else
      echo "  ✅ No null pointer patterns detected"
    fi
    echo ""

    # Verifica PII in chiaro
    PII_LEAKS=0
    if [ -d "backend/src" ]; then
      PII_LEAKS=$(grep -rn "console\.log.*email\|console\.log.*phone\|console\.log.*ssn\|console\.log.*password" backend/src --include="*.ts" 2>/dev/null | grep -v ".spec.ts" | wc -l || echo "0")
    fi
    if [ "$PII_LEAKS" -gt 0 ]; then
      echo "  🔴 PII LEAK DETECTED: $PII_LEAKS occorrenze (CRITICO)"
    else
      echo "  ✅ No PII leaks in console.log"
    fi
    echo ""

    # Verifica transazioni mancanti
    MISSING_TX=0
    if [ -d "backend/src" ]; then
      MULTI_OP_FILES=$(find backend/src -name "*.ts" -not -name "*.spec.ts" -exec grep -l "prisma\.\w*\.\(create\|update\|delete\)" {} \; 2>/dev/null | while read f; do
        OP_COUNT=$(grep -o "prisma\.\w*\.\(create\|update\|delete\)" "$f" 2>/dev/null | wc -l)
        TX_COUNT=$(grep -c "\$transaction\|prisma\.\$transaction" "$f" 2>/dev/null || echo "0")
        if [ "$OP_COUNT" -gt 1 ] && [ "$TX_COUNT" -eq 0 ]; then
          echo "$f"
        fi
      done | wc -l || echo "0")
      MISSING_TX=$MULTI_OP_FILES
    fi
    if [ "$MISSING_TX" -gt 0 ]; then
      echo "  🟡 Transazioni mancanti: $MISSING_TX file con ≥2 operazioni Prisma"
    else
      echo "  ✅ Transaction handling appears correct"
    fi
    echo ""

    # Verifica tenantId in Prisma queries
    MISSING_TENANT=0
    if [ -d "backend/src" ]; then
      MISSING_TENANT=$(grep -rn "prisma\..*\.findMany\|prisma\..*\.findFirst\|prisma\..*\.findUnique\|prisma\..*\.count" backend/src --include="*.ts" 2>/dev/null | grep -v ".spec.ts" | grep -v "where.*tenantId" | wc -l || echo "0")
    fi
    if [ "$MISSING_TENANT" -gt 0 ]; then
      echo "  🟠 Queries senza tenantId check: $MISSING_TENANT (verify manually)"
    else
      echo "  ✅ TenantId isolation verified"
    fi
    echo ""
  fi

  echo "✅ Revisione completata."

} | tee "$REVIEW_REPORT"

echo ""
echo "📋 Report salvato: $REVIEW_REPORT"
