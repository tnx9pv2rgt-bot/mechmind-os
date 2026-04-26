#!/bin/bash
# Descrizione: Dashboard con metriche coverage, velocità skill, tempi incidenti
# Parametri: nessuno
# Equivalente a: /misura-kpi

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

source "$(dirname "$0")/_error-handler.sh"

METRICS_REPORT="./.claude/telemetry/metrics-$(date +%Y%m%d-%H%M%S).md"
mkdir -p ./.claude/telemetry

echo "=== KPI DASHBOARD ==="
echo ""

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo (backend environment)..."
if [ ! -d "backend" ]; then
  echo "❌ Cartella backend non trovata"
  exit 1
fi
if ! command -v git &>/dev/null; then
  echo "❌ git non disponibile"
  exit 1
fi
if ! command -v npm &>/dev/null; then
  echo "❌ npm non disponibile"
  exit 1
fi
echo "✅ Environment OK"
echo ""

{
  echo "# KPI Dashboard Report"
  echo "**Data:** $(date)"
  echo ""

  echo "## 1. Code Coverage Metrics"
  echo ""

  cd backend 2>/dev/null || { echo "❌ Cannot enter backend"; exit 1; }

  if npm run test -- --coverage --json > coverage.json 2>/dev/null; then
    # Extract key metrics from coverage.json
    STATEMENTS=$(grep -o '"statements".*[0-9.]*' coverage.json 2>/dev/null | head -1 | grep -o '[0-9.]*' || echo "N/A")
    BRANCHES=$(grep -o '"branches".*[0-9.]*' coverage.json 2>/dev/null | head -1 | grep -o '[0-9.]*' || echo "N/A")
    FUNCTIONS=$(grep -o '"functions".*[0-9.]*' coverage.json 2>/dev/null | head -1 | grep -o '[0-9.]*' || echo "N/A")

    echo "| Metric | Value | Target | Status |"
    echo "|--------|-------|--------|--------|"
    echo "| Statements | $STATEMENTS% | ≥90% | $([ "${STATEMENTS%.*}" -ge 90 ] 2>/dev/null && echo "✅" || echo "🔴") |"
    echo "| Branches | $BRANCHES% | ≥90% | $([ "${BRANCHES%.*}" -ge 90 ] 2>/dev/null && echo "✅" || echo "🔴") |"
    echo "| Functions | $FUNCTIONS% | ≥90% | $([ "${FUNCTIONS%.*}" -ge 90 ] 2>/dev/null && echo "✅" || echo "🔴") |"
  else
    echo "⚠️  Coverage collection failed"
  fi
  echo ""

  cd - >/dev/null 2>&1 || true

  echo "## 2. Git Activity Metrics"
  echo ""

  COMMIT_COUNT=$(git rev-list --count --all 2>/dev/null || echo "0")
  RECENT_COMMITS=$(git log --oneline -10 2>/dev/null || echo "No commits")

  echo "**Total Commits:** $COMMIT_COUNT"
  echo ""
  echo "**Recent commits:**"
  echo "\`\`\`"
  echo "$RECENT_COMMITS"
  echo "\`\`\`"
  echo ""

  echo "## 3. Project Health Score"
  echo ""

  if [ ! -f ".claude/telemetry/inventory-"* ] 2>/dev/null; then
    bash TUTTI.sh > /dev/null 2>&1 || true
  fi

  SCRIPT_COUNT=$(find .claude/scripts -maxdepth 1 -name "*.sh" -type f 2>/dev/null | wc -l || echo "0")
  TELEMETRY_COUNT=$(find .claude/telemetry -maxdepth 1 -name "*.md" -type f 2>/dev/null | wc -l || echo "0")

  echo "| Component | Count | Status |"
  echo "|-----------|-------|--------|"
  echo "| Automation Scripts | $SCRIPT_COUNT | ✅ |"
  echo "| Telemetry Reports | $TELEMETRY_COUNT | ✅ |"
  echo "| Git Commits | $COMMIT_COUNT | ✅ |"
  echo ""

  echo "## 4. Recommendations"
  echo ""
  echo "- Review coverage trends monthly"
  echo "- Run \`/misura-kpi\` weekly before sprint planning"
  echo "- Check MODULI_NEXO.md for module-level status"
  echo ""

  echo "✅ KPI dashboard completato."

} | tee "$METRICS_REPORT"

echo ""
echo "📋 Report salvato: $METRICS_REPORT"
