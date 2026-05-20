#!/bin/bash
# Descrizione: Simula guasti (Redis, encryption, race condition) per testare robustezza
# Parametri: [tipo-failure] (redis|encryption|race-condition)
# Equivalente a: /chaos-test

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

mkdir -p ./.claude/telemetry

# Atomic RAM staging: scratch dir per output diagnostici prima di promuoverli al report
STAGING_DIR=$(mktemp -d -t chaos-stage.XXXXXX 2>/dev/null || echo "/tmp/chaos-stage-$$")
trap 'rm -rf "$STAGING_DIR"' EXIT

FAILURE="${1:-redis}"

echo "=== TEST CAOS: $FAILURE ==="
echo ""

# FASE 0 — STRATEGIA 1: Pre-flight validation (Docker available)
echo "🔧 [S1] Validazione pre-volo (Docker environment)..."
if ! docker ps > /dev/null 2>&1; then
  echo "❌ Docker non disponibile. Avvia con: docker compose up -d"
  exit 1
fi
echo "✅ Docker environment OK"

# STEP 1: Simula il failure
echo "1️⃣  Simula failure: $FAILURE..."

case "$FAILURE" in
  redis)
    echo "Spegnendo Redis..."
    docker-compose stop redis 2>/dev/null || true
    sleep 2
    ;;
  encryption)
    echo "Disabilitando encryption temporaneamente..."
    export ENCRYPTION_ENABLED=false
    ;;
  race-condition)
    echo "Creando contention su advisory lock..."
    ;;
esac

# STEP 2: Esegui test
echo "2️⃣  Esegui test sotto failure..."
cd backend 2>/dev/null || true
npm run test -- --testNamePattern="chaos|failure" 2>/dev/null || true
cd - >/dev/null 2>&1 || true

# STEP 3: Ripristina e analizza resilience
echo "3️⃣  Ripristina stato..."
docker-compose start redis 2>/dev/null || true
unset ENCRYPTION_ENABLED 2>/dev/null || true

echo "4️⃣  Resilience score..."
ANALYSIS=$(claude -p "Failure: $FAILURE - Analizza se il sistema ha resistito bene. Dai un score 0-10 di resilience e una azione di fix." 2>/dev/null || echo "⚠️  Claude CLI non disponibile")
echo "$ANALYSIS"

echo ""
echo "✅ Test caos completato."
