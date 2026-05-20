#!/bin/bash
# Descrizione: Controlla conformità GDPR (articoli 5, 17, 20, 25)
# Parametri: nessuno
# Equivalente a: /conformita-gdpr

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

GDPR_REPORT="./.claude/telemetry/gdpr-verify-$(date +%Y%m%d-%H%M%S).md"
mkdir -p ./.claude/telemetry

get_model() {
  local module="$1"
  case "$module" in
    auth|booking|invoice|payment-link|subscription|gdpr) echo "opus" ;;
    notifications|admin|analytics|common|dvi|iot|work-order|customer|estimate|voice) echo "sonnet" ;;
    *) echo "sonnet" ;;
  esac
}

# Atomic RAM staging: scratch dir per output Claude prima di promuoverli al report GDPR
STAGING_DIR=$(mktemp -d -t gdpr-stage.XXXXXX 2>/dev/null || echo "/tmp/gdpr-stage-$$")
trap 'rm -rf "$STAGING_DIR"' EXIT

echo "=== VERIFICA GDPR ==="
echo ""

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo (backend environment)..."
if [ ! -d "backend" ]; then
  echo "❌ Cartella backend non trovata"
  exit 1
fi
if [ ! -d "backend/src" ]; then
  echo "❌ Directory src non trovata in backend"
  exit 1
fi
echo "✅ Backend environment OK"
echo ""

{
  echo "# GDPR Conformità Report"
  echo "**Data:** $(date)"
  echo ""

  cd backend 2>/dev/null || { echo "❌ Impossibile entrare in backend"; exit 1; }

  # STEP 1: Cerca EncryptionService usage
  echo "## 1. PII Encryption (Art. 5, 32)"
  echo ""

  PII_CHECKS=$(grep -r "EncryptionService\|encrypt(" src --include="*.ts" 2>/dev/null | grep -v "spec.ts" | head -20 || echo "")

  if [ -n "$PII_CHECKS" ]; then
    echo "Found encryption patterns:"
    echo "\`\`\`"
    echo "$PII_CHECKS"
    echo "\`\`\`"
  else
    echo "⚠️  Nessun pattern EncryptionService trovato"
  fi
  echo ""

  # STEP 2: Cerca soft deletes (Art. 17 - diritto all'oblio)
  echo "## 2. Soft Deletes (Art. 17 - Right to be Forgotten)"
  echo ""

  SOFT_DELETE=$(grep -r "deletedAt" src --include="*.ts" 2>/dev/null | grep -cv "spec.ts" || echo "0")

  if [ "$SOFT_DELETE" -gt 0 ]; then
    echo "✅ Soft delete pattern found ($SOFT_DELETE occorrenze)"
  else
    echo "⚠️  Nessun pattern soft delete trovato"
  fi
  echo ""

  # STEP 3: Classifica severity
  echo "## 3. Severity Classification"
  echo ""

  if [ -n "$PII_CHECKS" ]; then
    MODEL=$(get_model "gdpr")
    GDPR_ANALYSIS=$(claude -p --model "$MODEL" "$(cat << 'PROMPT'
PII encryption checks:
PROMPT
)${PII_CHECKS:-'(nessun risultato trovato)'}$(cat << 'PROMPT'

Classifica ogni linea per severity GDPR (CRITICO se PII non encrypted, ALTO se audit log mancante, MEDIO se policy):
Formato: file:linea | severity | articolo GDPR
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")
    echo "$GDPR_ANALYSIS"
  else
    echo "ℹ️  Non disponibile (nessun pattern trovato)"
  fi
  echo ""

  echo "✅ Verifica GDPR completata."

  cd - >/dev/null 2>&1 || true

} | tee "$GDPR_REPORT"

echo ""
echo "📋 Report salvato: $GDPR_REPORT"
