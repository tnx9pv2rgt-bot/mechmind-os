#!/bin/bash
# Descrizione: Testa il flusso completo di autenticazione
# Parametri: nessuno
# Equivalente a: /test-autenticazione

set -euo pipefail

echo "=== TEST AUTENTICAZIONE ==="
echo ""

BASE_URL="http://localhost:3002"

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
