#!/bin/bash
# Descrizione: Testa il flusso completo di autenticazione
# Parametri: nessuno
# Equivalente a: /test-autenticazione

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

mkdir -p ./.claude/telemetry

echo "=== TEST AUTENTICAZIONE ==="
echo ""

BASE_URL="http://localhost:3002"

# FASE 0 — STRATEGIA 1: Pre-flight connectivity validation
echo "🔧 [S1] Validazione pre-volo (raggiungibilità server)..."
if ! curl -s --max-time 3 "$BASE_URL/health" > /dev/null 2>&1; then
  echo "⚠️  Backend server non raggiungibile su $BASE_URL"
  echo "  Assicurati di avere avviato: cd backend && npm run start:dev"
  exit 1
fi
echo "✅ Server raggiungibile"

echo ""
echo "1️⃣  POST /v1/auth/register..."
REGISTER=$(curl -s -X POST "$BASE_URL/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}')
echo "$REGISTER" | jq .
echo ""

echo "2️⃣  POST /v1/auth/login..."
LOGIN=$(curl -s -X POST "$BASE_URL/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}')
TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')
echo "Token: ${TOKEN:0:20}..."
echo ""

echo "3️⃣  GET /v1/auth/me (authenticated)..."
curl -s "$BASE_URL/v1/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

echo "4️⃣  POST /v1/auth/logout..."
curl -s -X POST "$BASE_URL/v1/auth/logout" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

echo "✅ Test autenticazione completato."
