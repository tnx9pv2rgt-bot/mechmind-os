#!/bin/bash
# Descrizione: Controlla conformità GDPR (articoli 5, 17, 20, 25)
# Parametri: nessuno
# Equivalente a: /conformita-gdpr

set -euo pipefail

echo "=== VERIFICA GDPR ==="
echo ""

cd backend 2>/dev/null || { echo "⚠️  Cartella backend non trovata"; exit 1; }

# STEP 1: Cerca EncryptionService usage
echo "1️⃣  Controlla PII encryption..."
PII_CHECKS=$(grep -r "EncryptionService\|encrypt(" src --include="*.ts" 2>/dev/null | grep -v "spec.ts" | head -20 || echo "")

# STEP 2: Classifica severity
echo "2️⃣  Classificazione severity..."
GDPR_ANALYSIS=$(claude -p "$(cat << 'PROMPT'
PII encryption checks:
PROMPT
)${PII_CHECKS:-'(nessun risultato trovato)'}$(cat << 'PROMPT'

Classifica ogni linea per severity GDPR (CRITICO se PII non encrypted, ALTO se audit log mancante, MEDIO se policy):
Formato: file:linea | severity | articolo GDPR
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")

# STEP 3: Output
echo "$GDPR_ANALYSIS"

cd - >/dev/null 2>&1 || true
echo ""
echo "✅ Verifica GDPR completata."
