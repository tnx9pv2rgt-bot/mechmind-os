#!/usr/bin/env bash
# Code review automated checks for MechMind OS
set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "=========================================="
echo "  MechMind OS — Code Review Automatico"
echo "=========================================="

# Get changed files
CHANGED=$(git diff --name-only HEAD~1 2>/dev/null || git diff --cached --name-only 2>/dev/null || git diff --name-only 2>/dev/null || echo "")
if [ -z "$CHANGED" ]; then
  echo "Nessun file modificato trovato."
  exit 0
fi

echo "File modificati: $(echo "$CHANGED" | wc -l | tr -d ' ')"
echo ""

ISSUES=0

# Check each changed .ts file
for FILE in $CHANGED; do
  [ ! -f "$FILE" ] && continue
  [[ "$FILE" != *.ts && "$FILE" != *.tsx ]] && continue
  [[ "$FILE" == *.spec.* ]] && continue
  [[ "$FILE" == *node_modules* ]] && continue

  FILE_ISSUES=0

  # @ts-ignore
  COUNT=$(grep -c "@ts-ignore\|@ts-nocheck" "$FILE" 2>/dev/null || echo 0)
  if [ "$COUNT" -gt 0 ]; then
    echo -e "${RED}❌ $FILE: $COUNT @ts-ignore${NC}"
    FILE_ISSUES=$((FILE_ISSUES + COUNT))
  fi

  # console.log
  COUNT=$(grep -c "console\.log\|console\.warn" "$FILE" 2>/dev/null || echo 0)
  if [ "$COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $FILE: $COUNT console.log${NC}"
    FILE_ISSUES=$((FILE_ISSUES + COUNT))
  fi

  # explicit any
  COUNT=$(grep -c ": any\b\|as any" "$FILE" 2>/dev/null || echo 0)
  if [ "$COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $FILE: $COUNT 'any' type${NC}"
    FILE_ISSUES=$((FILE_ISSUES + COUNT))
  fi

  # Prisma query without tenantId (backend only)
  if [[ "$FILE" == backend/* && "$FILE" != *.spec.* ]]; then
    COUNT=$(grep -c "prisma\.\w\+\.find\|prisma\.\w\+\.update\|prisma\.\w\+\.delete\|prisma\.\w\+\.create" "$FILE" 2>/dev/null || echo 0)
    NO_TENANT=$(grep "prisma\.\w\+\.find\|prisma\.\w\+\.update\|prisma\.\w\+\.delete\|prisma\.\w\+\.create" "$FILE" 2>/dev/null | grep -vc "tenantId" || echo 0)
    if [ "$NO_TENANT" -gt 0 ]; then
      echo -e "${RED}❌ $FILE: $NO_TENANT query senza tenantId${NC}"
      FILE_ISSUES=$((FILE_ISSUES + NO_TENANT))
    fi
  fi

  # English text in frontend UI
  if [[ "$FILE" == frontend/* && "$FILE" == *.tsx ]]; then
    COUNT=$(grep -c "'Loading\.\.\.\|'Error\|'No data\|'Submit\|'Cancel\|'Delete\|'Save\|'Search'" "$FILE" 2>/dev/null || echo 0)
    if [ "$COUNT" -gt 0 ]; then
      echo -e "${YELLOW}⚠️  $FILE: $COUNT testi inglesi nel frontend${NC}"
      FILE_ISSUES=$((FILE_ISSUES + COUNT))
    fi
  fi

  ISSUES=$((ISSUES + FILE_ISSUES))
done

echo ""
echo "=========================================="
echo "  TOTALE ISSUE: $ISSUES"
echo "=========================================="
exit 0
