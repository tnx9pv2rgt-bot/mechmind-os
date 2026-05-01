#!/bin/bash
# Descrizione: Orchestratore suite 5 livelli — Unit + Integration + API + (Load opzionale)
# Parametri: [modulo] [--skip-load] [--only=unit|integration|api|load]
# Uso: bash .claude/scripts/test-suite.sh [modulo] [--skip-load]
# Richiede: DATABASE_URL per livelli 2-3; k6 installato per livello 5

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TELEMETRY_DIR="$PROJECT_ROOT/.claude/telemetry"

mkdir -p "$TELEMETRY_DIR"

# ── Argomenti ────────────────────────────────────────────────────────────────
MODULO=""
SKIP_LOAD=0
ONLY=""

for arg in "$@"; do
  case "$arg" in
    --skip-load)  SKIP_LOAD=1 ;;
    --only=*)     ONLY="${arg#--only=}" ;;
    --*)          echo "⚠️  Flag sconosciuto: $arg" ;;
    *)            MODULO="$arg" ;;
  esac
done

SUITE_REPORT="$TELEMETRY_DIR/suite-$(date +%Y%m%d-%H%M%S)${MODULO:+-$MODULO}.md"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         TEST SUITE 5 LIVELLI — GOOGLE SMURF 2026            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo "  Modulo:  ${MODULO:-ALL}"
echo "  Livelli: Unit + Integration + API${SKIP_LOAD:+ (load skipped)}"
echo "  Report:  $SUITE_REPORT"
echo ""

# ── Tracking risultati ────────────────────────────────────────────────────────
L1_STATUS="⏭️  skip"
L2_STATUS="⏭️  skip"
L3_STATUS="⏭️  skip"
L5_STATUS="⏭️  skip"
TOTAL_FAILURES=0

run_level() {
  local level="$1"
  local script="$2"
  shift 2
  local label="$*"

  echo "──────────────────────────────────────────────────────────────"
  echo "▶  $label"
  echo "──────────────────────────────────────────────────────────────"

  if bash "$SCRIPT_DIR/$script" ${MODULO:+"$MODULO"} 2>&1; then
    echo "✅ $label PASSATO"
    echo "$level:PASS"
  else
    echo "❌ $label FALLITO"
    echo "$level:FAIL"
    TOTAL_FAILURES=$((TOTAL_FAILURES + 1))
  fi
  echo ""
}

# ── Livello 1: Unit tests ─────────────────────────────────────────────────────
if [ -z "$ONLY" ] || [ "$ONLY" = "unit" ]; then
  L1_RESULT=$(run_level L1 fix-coverage.sh "LIVELLO 1: Unit Tests (fix-coverage)")
  if echo "$L1_RESULT" | grep -q "L1:PASS"; then
    L1_STATUS="✅ PASS"
  else
    L1_STATUS="❌ FAIL"
  fi
fi

# ── Livello 2: Integration tests ──────────────────────────────────────────────
if [ -z "$ONLY" ] || [ "$ONLY" = "integration" ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    L2_STATUS="⏭️  skip (DATABASE_URL non impostata)"
    echo "⚠️  Livello 2 saltato: DATABASE_URL non impostata"
    echo ""
  else
    L2_RESULT=$(run_level L2 test-integration.sh "LIVELLO 2: Integration Tests (real DB)")
    if echo "$L2_RESULT" | grep -q "L2:PASS"; then
      L2_STATUS="✅ PASS"
    else
      L2_STATUS="❌ FAIL"
    fi
  fi
fi

# ── Livello 3: API contract tests ─────────────────────────────────────────────
if [ -z "$ONLY" ] || [ "$ONLY" = "api" ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    L3_STATUS="⏭️  skip (DATABASE_URL non impostata)"
    echo "⚠️  Livello 3 saltato: DATABASE_URL non impostata"
    echo ""
  else
    L3_RESULT=$(run_level L3 test-api.sh "LIVELLO 3: API Contract Tests (Supertest)")
    if echo "$L3_RESULT" | grep -q "L3:PASS"; then
      L3_STATUS="✅ PASS"
    else
      L3_STATUS="❌ FAIL"
    fi
  fi
fi

# ── Livello 5: Load tests (opzionale) ────────────────────────────────────────
if [ "$SKIP_LOAD" -eq 0 ] && { [ -z "$ONLY" ] || [ "$ONLY" = "load" ]; }; then
  if command -v k6 &>/dev/null && [ -n "${K6_BASE_URL:-}" ]; then
    L5_RESULT=$(run_level L5 test-load.sh "LIVELLO 5: Load Tests (k6)")
    if echo "$L5_RESULT" | grep -q "L5:PASS"; then
      L5_STATUS="✅ PASS"
    else
      L5_STATUS="❌ FAIL"
    fi
  else
    L5_STATUS="⏭️  skip (k6 non installato o K6_BASE_URL non impostata)"
    echo "ℹ️  Livello 5 saltato: installa k6 e imposta K6_BASE_URL per il load test"
    echo ""
  fi
fi

# ── Report finale ─────────────────────────────────────────────────────────────
{
  echo "# Test Suite Report — $(date)"
  echo ""
  echo "**Modulo:** ${MODULO:-ALL}"
  echo ""
  echo "## Risultati per Livello"
  echo ""
  echo "| Livello | Strumento | Status |"
  echo "|---------|-----------|--------|"
  echo "| L1 Unit | fix-coverage.sh | $L1_STATUS |"
  echo "| L2 Integration | test-integration.sh | $L2_STATUS |"
  echo "| L3 API Contract | test-api.sh | $L3_STATUS |"
  echo "| L5 Load | test-load.sh + k6 | $L5_STATUS |"
  echo ""
  if [ "$TOTAL_FAILURES" -eq 0 ]; then
    echo "## ✅ SUITE COMPLETA — 0 FALLIMENTI"
  else
    echo "## ❌ $TOTAL_FAILURES LIVELL$([ "$TOTAL_FAILURES" -eq 1 ] && echo O || echo I) FALLITI"
  fi
} | tee "$SUITE_REPORT"

echo ""
echo "📋 Suite report: $SUITE_REPORT"

[ "$TOTAL_FAILURES" -eq 0 ]
