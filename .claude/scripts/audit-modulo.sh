#!/bin/bash
# Skill: audit-modulo → fix-coverage → report permanente (loop fino a 100/10)
# Uso: bash .claude/scripts/audit-modulo.sh <NOME_MODULO>
# Es:   bash .claude/scripts/audit-modulo.sh booking
set -euo pipefail
MODULO="${1:?Specificare il modulo. Es: booking}"
DATA=$(date +%Y-%m-%d)
ORA=$(date +%H:%M)
REPORT_DIR="docs/audit-reports"
mkdir -p "$REPORT_DIR"
REPORT="$REPORT_DIR/${MODULO}-${DATA}.md"

echo "=== AUDIT MODULO: $MODULO ==="
echo "1. Coverage baseline con c8..."
cd backend
npx c8 --include "src/${MODULO}/**/*.ts" \
  --exclude "src/${MODULO}/**/*.spec.ts" \
  npx jest "src/${MODULO}" --no-coverage --forceExit 2>&1 | tee ../.claude/logs/audit-${MODULO}-c8.log
cd ..

echo "2. Lancio fix-coverage sul modulo..."
cd tools/fix-coverage
npx ts-node bin/fix-coverage.ts --project ../../backend \
  --globs "src/${MODULO}/**/*.service.ts" "src/${MODULO}/**/*.controller.ts" \
  --parallelism 2 2>&1 | tee ../../.claude/logs/audit-${MODULO}-fix.log
cd ../..

echo "3. Riverifica coverage dopo fix..."
cd backend
npx c8 --include "src/${MODULO}/**/*.ts" \
  --exclude "src/${MODULO}/**/*.spec.ts" \
  npx jest "src/${MODULO}" --no-coverage --forceExit 2>&1 | tee ../.claude/logs/audit-${MODULO}-c8-final.log
cd ..

echo "4. Generazione report permanente..."
cat > "$REPORT" << REPORTEOF
# Audit Report: \`$MODULO\`

- **Data:** $DATA $ORA
- **Modulo:** $MODULO
- **Sessione:** audit-$MODULO-$DATA

## Score Finale
(Compilare dopo l'analisi)

## Problemi Trovati e Fix
| Urgenza | File:riga | Asse | Problema | Fix | Stato |
|---------|-----------|------|----------|-----|-------|

## Root Cause Analysis (BLOCCANTI)
...

## Comandi Eseguiti
- \`bash .claude/scripts/audit-modulo.sh $MODULO\`
- \`fix-coverage\` su \`src/$MODULO/\`
- \`c8\` pre e post fix

## Lezioni Apprese
...

## Prossimi Passi
...

*Report generato automaticamente da audit-modulo.sh*
REPORTEOF

echo "✅ Report creato: $REPORT"
echo "✅ Log salvati in .claude/logs/audit-${MODULO}-*.log"
