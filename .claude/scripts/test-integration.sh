#!/bin/bash
# Descrizione: Livello 2 — Integration tests (real DB, mock Stripe/Redis)
# Parametri: [modulo] es. "booking", "invoice"
# Uso: bash .claude/scripts/test-integration.sh [modulo]
# Richiede: DATABASE_URL puntato a Postgres reale (docker compose up -d postgres)

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
TELEMETRY_DIR="$PROJECT_ROOT/.claude/telemetry"
MODULO="${1:-}"

mkdir -p "$TELEMETRY_DIR"

REPORT="$TELEMETRY_DIR/integration-$(date +%Y%m%d-%H%M%S)${MODULO:+-$MODULO}.md"

echo "=== LIVELLO 2: INTEGRATION TESTS${MODULO:+ — $MODULO} ==="
echo ""

# ── Pre-flight ────────────────────────────────────────────────────────────────
echo "🔧 Pre-flight check..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL non impostata."
  echo "   Avvia Postgres: docker compose up -d postgres"
  echo "   Poi: export DATABASE_URL=postgresql://mechmind:mechmind@localhost:5432/mechmind_test"
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "❌ node non disponibile"
  exit 1
fi

INTEGRATION_CONFIG="$BACKEND_DIR/jest.integration.config.js"
if [ ! -f "$INTEGRATION_CONFIG" ]; then
  echo "❌ Config non trovata: $INTEGRATION_CONFIG"
  exit 1
fi
echo "✅ Pre-flight OK"
echo ""

# ── Test env ──────────────────────────────────────────────────────────────────
export NODE_ENV=test
export JWT_SECRET="${JWT_SECRET:-test-integration-jwt-secret-32chars!}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-test-integration-refresh-32chars!!}"
export JWT_2FA_SECRET="${JWT_2FA_SECRET:-test-integration-2fa-secret-32chars!!}"
export ENCRYPTION_KEY="${ENCRYPTION_KEY:-test-integration-enc-key-32chars!!}"
export LOG_LEVEL=error

# ── Run ───────────────────────────────────────────────────────────────────────
echo "🧪 Esecuzione integration tests..."
echo ""

cd "$BACKEND_DIR"

JEST_ARGS=(
  --config jest.integration.config.js
  --forceExit
  --verbose
  --testPathPattern='\.integration\.spec\.ts$'
)

if [ -n "$MODULO" ]; then
  JEST_ARGS+=(--testPathPattern="$MODULO.*\.integration\.spec\.ts$")
fi

EXIT_FILE=$(mktemp)
{
  echo "# Integration Test Report"
  echo "**Data:** $(date)"
  echo "**Modulo:** ${MODULO:-ALL}"
  echo "**DATABASE_URL:** ${DATABASE_URL%%@*}@***"
  echo ""

  if npx jest "${JEST_ARGS[@]}" 2>&1; then
    echo "0" > "$EXIT_FILE"
    echo ""
    echo "## ✅ TUTTI I TEST PASSATI"
  else
    echo "$?" > "$EXIT_FILE"
    echo ""
    echo "## ❌ ALCUNI TEST FALLITI"
  fi

} | tee "$REPORT"

EXIT_CODE=$(cat "$EXIT_FILE")
rm -f "$EXIT_FILE"

echo ""
echo "📋 Report: $REPORT"

exit "$EXIT_CODE"
