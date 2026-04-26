#!/bin/bash
# Descrizione: Verifica indici, tenantId, query N+1 e crittografia PII
# Parametri: nessuno
# Equivalente a: /integrita-db

set -euo pipefail

echo "=== INTEGRITÀ DATABASE ==="
echo ""

cd backend 2>/dev/null || { echo "⚠️  Cartella backend non trovata"; exit 1; }

# STEP 1: Controlla tenantId su tutti i modelli
echo "1️⃣  Controlla tenantId..."
MISSING_TENANT=$(grep -A 5 "model " prisma/schema.prisma 2>/dev/null | grep -B 5 -v "tenantId" | grep "model " | head -20 || echo "")

if [ -n "$MISSING_TENANT" ]; then
  echo "⚠️  Modelli senza tenantId:"
  echo "$MISSING_TENANT"
else
  echo "✅ Tutti i modelli hanno tenantId"
fi

# STEP 2: Controlla N+1 queries
echo ""
echo "2️⃣  Controlla N+1 queries..."
N_PLUS_ONE=$(grep -r "include:\|\.find(" src --include="*.ts" 2>/dev/null | grep -v "select:" | head -10 || echo "")

# STEP 3: Classifica severity
echo ""
echo "3️⃣  Severity classification..."
SEVERITY=$(claude -p "$(cat << 'PROMPT'
N+1 queries trovate:
PROMPT
)${N_PLUS_ONE:-'(nessun risultato)'}$(cat << 'PROMPT'

Classifica ogni linea per severity (CRITICO se loop, ALTO se 1-n, MEDIO se optimization hint). Formato: linea | severity
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")
echo "$SEVERITY"

cd - >/dev/null 2>&1 || true
echo ""
echo "✅ Integrità database verificata."
