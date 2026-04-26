#!/bin/bash
# Descrizione: Dashboard con metriche coverage, velocità skill, tempi incidenti
# Parametri: nessuno
# Equivalente a: /misura-kpi

set -euo pipefail

echo "=== KPI DASHBOARD ==="
echo ""

# STEP 1: Raccoglie metriche coverage
echo "1️⃣  Coverage metrics..."
cd backend 2>/dev/null || true
npx jest --coverage --json > coverage.json 2>/dev/null || echo "⚠️  Coverage run failed"
cd - >/dev/null 2>&1 || true

# STEP 2: Raccoglie git history
echo "2️⃣  Git metrics..."
git log --oneline -20 > /tmp/recent_commits.txt 2>/dev/null || true

# STEP 3: Analizza con AI
echo "3️⃣  Analizzando con AI..."
METRICS=$(claude -p "$(cat << 'PROMPT'
Coverage JSON e git log (head -50):
PROMPT
)$(head -50 backend/coverage.json 2>/dev/null || echo '{}')$(cat << 'PROMPT'

Recent commits:
PROMPT
)$(cat /tmp/recent_commits.txt 2>/dev/null || echo '')$(cat << 'PROMPT'

Genera un KPI report con: coverage % trend, skill execution speed, incident response time. Formato tabella.
PROMPT
)" 2>/dev/null || echo "⚠️  Claude CLI non disponibile")

echo "$METRICS"

echo ""
echo "✅ KPI dashboard completato."
