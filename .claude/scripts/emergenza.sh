#!/bin/bash
# Descrizione: Runbook per incidenti P0-P3. Pagamenti, autenticazione, database, Redis
# Parametri: [tipo-incidente] (payment|auth|database|redis)
# Equivalente a: /risposta-incidente

set -euo pipefail

TIPO="${1:-all}"

echo "=== RISPOSTA INCIDENTE ==="

if [ "$TIPO" = "payment" ] || [ "$TIPO" = "all" ]; then
  echo "1️⃣  Payment incident checks..."
  curl -s http://localhost:3002/health | grep payment
  echo "✅ Payment health OK"
fi

if [ "$TIPO" = "auth" ] || [ "$TIPO" = "all" ]; then
  echo "2️⃣  Auth incident checks..."
  curl -s http://localhost:3002/v1/auth/me
  echo "✅ Auth endpoint OK"
fi

if [ "$TIPO" = "database" ] || [ "$TIPO" = "all" ]; then
  echo "3️⃣  Database incident checks..."
  pg_isready -h localhost -p 5432
  echo "✅ Database OK"
fi

if [ "$TIPO" = "redis" ] || [ "$TIPO" = "all" ]; then
  echo "4️⃣  Redis incident checks..."
  redis-cli -h localhost -p 6379 ping
  echo "✅ Redis OK"
fi

echo ""
echo "✅ Incidente verificato."
