#!/bin/bash
# Descrizione: Livello 5 — Load tests (k6, 50 utenti, p95 < 200ms)
# Parametri: [--url=http://host:port] [--token=JWT] [--script=path/to/k6.js]
# Uso: bash .claude/scripts/test-load.sh [--url=http://localhost:3002] [--token=eyJ...]
# CI: Eseguire solo nightly (schedule), NON su ogni PR

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TELEMETRY_DIR="$PROJECT_ROOT/.claude/telemetry"

mkdir -p "$TELEMETRY_DIR"

# ── Parse args ────────────────────────────────────────────────────────────────
BASE_URL="${K6_BASE_URL:-http://localhost:3002}"
JWT_TOKEN="${K6_JWT_TOKEN:-}"
K6_SCRIPT="$PROJECT_ROOT/backend/tests/load/booking.k6.js"

for arg in "$@"; do
  case "$arg" in
    --url=*)    BASE_URL="${arg#--url=}" ;;
    --token=*)  JWT_TOKEN="${arg#--token=}" ;;
    --script=*) K6_SCRIPT="${arg#--script=}" ;;
    *) ;;
  esac
done

REPORT="$TELEMETRY_DIR/load-$(date +%Y%m%d-%H%M%S).md"

echo "=== LIVELLO 5: LOAD TESTS (k6) ==="
echo ""
echo "  Target:  $BASE_URL"
echo "  Script:  $K6_SCRIPT"
echo ""

# ── Pre-flight ────────────────────────────────────────────────────────────────
echo "🔧 Pre-flight check..."

if ! command -v k6 &>/dev/null; then
  echo "❌ k6 non installato."
  echo "   macOS:  brew install k6"
  echo "   Linux:  https://k6.io/docs/get-started/installation/"
  exit 1
fi

if [ ! -f "$K6_SCRIPT" ]; then
  echo "❌ Script k6 non trovato: $K6_SCRIPT"
  exit 1
fi

if [ -z "$JWT_TOKEN" ]; then
  echo "⚠️  JWT_TOKEN non impostato — endpoint protetti riceveranno 401 (conteranno come errori)"
  echo "   Imposta: export K6_JWT_TOKEN=eyJ..."
fi

# Verifica che il server sia raggiungibile
if ! curl -sf "$BASE_URL/health" >/dev/null 2>&1; then
  echo "❌ Server non raggiungibile: $BASE_URL/health"
  echo "   Avvia backend: cd backend && npm run start:dev"
  exit 1
fi
echo "✅ Pre-flight OK"
echo ""

# ── Run k6 ───────────────────────────────────────────────────────────────────
echo "🚀 Avvio load test (50 utenti × 30s)..."
echo ""

K6_SUMMARY="$TELEMETRY_DIR/k6-summary-$(date +%Y%m%d-%H%M%S).json"

EXIT_CODE=0
EXIT_FILE=$(mktemp)
{
  echo "# Load Test Report"
  echo "**Data:** $(date)"
  echo "**Target:** $BASE_URL"
  echo "**Script:** $K6_SCRIPT"
  echo ""

  if k6 run \
    --env BASE_URL="$BASE_URL" \
    --env JWT_TOKEN="$JWT_TOKEN" \
    --summary-export="$K6_SUMMARY" \
    "$K6_SCRIPT" 2>&1; then
    echo "0" > "$EXIT_FILE"
    echo ""
    echo "## ✅ LOAD TEST PASSATO"
    echo "- p95 < 200ms ✅"
    echo "- Error rate < 1% ✅"
  else
    echo "$?" > "$EXIT_FILE"
    echo ""
    echo "## ❌ LOAD TEST FALLITO"
    echo "Verifica threshold in: $K6_SUMMARY"
  fi

  if [ -f "$K6_SUMMARY" ]; then
    echo ""
    echo "## Metriche chiave"
    echo ""
    if command -v jq &>/dev/null; then
      P95=$(jq -r '.metrics.http_req_duration.values["p(95)"] // "N/A"' "$K6_SUMMARY" 2>/dev/null || echo "N/A")
      ERR=$(jq -r '.metrics.http_req_failed.values.rate // "N/A"' "$K6_SUMMARY" 2>/dev/null || echo "N/A")
      echo "- **p95 latency:** ${P95}ms (threshold: < 200ms)"
      echo "- **Error rate:** ${ERR} (threshold: < 0.01)"
    fi
  fi

} | tee "$REPORT"

EXIT_CODE=$(cat "$EXIT_FILE")
rm -f "$EXIT_FILE"

echo ""
echo "📋 Report: $REPORT"
[ -f "$K6_SUMMARY" ] && echo "📊 Summary JSON: $K6_SUMMARY"

exit "$EXIT_CODE"
