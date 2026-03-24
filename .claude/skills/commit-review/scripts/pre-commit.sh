#!/usr/bin/env bash
# Pre-commit quality gate for MechMind OS
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
FAIL=0

echo "=========================================="
echo "  MechMind OS — Pre-Commit Check"
echo "=========================================="
echo ""

# 1. TypeScript backend
echo "--- TSC Backend ---"
if cd backend && npx tsc --noEmit 2>&1 | tail -3; then
  echo -e "${GREEN}✅ Backend TypeScript OK${NC}"
else
  echo -e "${RED}❌ Backend TypeScript ERRORI${NC}"
  FAIL=$((FAIL+1))
fi
cd ..
echo ""

# 2. TypeScript frontend
echo "--- TSC Frontend ---"
if cd frontend && npx tsc --noEmit 2>&1 | tail -3; then
  echo -e "${GREEN}✅ Frontend TypeScript OK${NC}"
else
  echo -e "${RED}❌ Frontend TypeScript ERRORI${NC}"
  FAIL=$((FAIL+1))
fi
cd ..
echo ""

# 3. Lint
echo "--- Lint ---"
if cd backend && npm run lint 2>&1 | tail -3; then
  echo -e "${GREEN}✅ Lint OK${NC}"
else
  echo -e "${RED}❌ Lint ERRORI${NC}"
  FAIL=$((FAIL+1))
fi
cd ..
echo ""

# 4. Security grep
echo "--- Security ---"
MOCK=$(grep -rn "DEMO_DATA\|MOCK_DATA\|mockCustomers\|mockVehicles\|isDemoMode" frontend/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
SECRETS=$(grep -rn "password.*=.*['\"]" backend/src/ --include="*.ts" 2>/dev/null | grep -v configService | grep -v process.env | grep -v ".spec." | wc -l | tr -d ' ')
CONSOLE=$(grep -rn "console\.log" backend/src/ --include="*.ts" 2>/dev/null | grep -v ".spec.ts" | grep -v logger | wc -l | tr -d ' ')

if [ "$MOCK" -gt 0 ]; then
  echo -e "${RED}❌ Mock data nel frontend: $MOCK${NC}"
  FAIL=$((FAIL+1))
else
  echo -e "${GREEN}✅ Nessun mock data${NC}"
fi

if [ "$SECRETS" -gt 0 ]; then
  echo -e "${RED}❌ Secrets hardcoded: $SECRETS${NC}"
  FAIL=$((FAIL+1))
else
  echo -e "${GREEN}✅ Nessun secret hardcoded${NC}"
fi

if [ "$CONSOLE" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  console.log: $CONSOLE${NC}"
else
  echo -e "${GREEN}✅ Nessun console.log${NC}"
fi
echo ""

# Summary
echo "=========================================="
if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}  ❌ FALLITO — $FAIL check non superati${NC}"
  echo "  FIXA prima di committare!"
else
  echo -e "${GREEN}  ✅ TUTTO OK — Pronto per il commit${NC}"
fi
echo "=========================================="
exit $FAIL
