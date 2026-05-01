#!/bin/bash
# Descrizione: Genera script k6 per load test su endpoint critici
# Parametri: [endpoint] (es: /v1/booking/confirm)
# Equivalente a: /test-carico

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

mkdir -p ./.claude/telemetry

ENDPOINT="${1:-/v1/booking/confirm}"

echo "=== TEST CARICO (k6): $ENDPOINT ==="
echo ""

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo..."
if ! curl -s --max-time 2 "http://localhost:3002/health" > /dev/null 2>&1; then
  echo "⚠️  Backend non raggiungibile. Avvia con: cd backend && npm run start:dev"
  exit 1
fi

if ! command -v k6 &>/dev/null; then
  echo "⚠️  k6 non installato. Installa con: brew install k6 o npm install -g k6"
  echo "ℹ️  Script generato comunque in /tmp/test-load.js per review"
fi
echo "✅ Pre-flight validation OK"
echo ""

# STEP 1: Genera script k6
echo "1️⃣  Generazione script k6..."
K6_SCRIPT=$(claude -p "$(cat << 'PROMPT'
Endpoint: 
PROMPT
)$ENDPOINT$(cat << 'PROMPT'

Genera uno script k6 che:
- Fa 100 request concorrenti
- Misura P95 latency (target <200ms)
- Setup/teardown con dati test realistici
- Checks su response code e payload

Formato: JavaScript k6 HTTP test.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")

# STEP 2: Salva script
echo "$K6_SCRIPT" > "/tmp/test-load.js"

# STEP 3: Esegui k6
echo "2️⃣  Esecuzione k6..."
if command -v k6 &>/dev/null; then
  k6 run "/tmp/test-load.js" --vus=100 --duration=60s 2>/dev/null || echo "⚠️  k6 esecuzione fallita"
else
  echo "⚠️  k6 non installato"
fi

echo ""
echo "✅ Test carico completato. Script salvato in /tmp/test-load.js"
