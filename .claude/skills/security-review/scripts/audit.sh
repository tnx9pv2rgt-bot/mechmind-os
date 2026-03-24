#!/usr/bin/env bash
# Security audit script for MechMind OS
set -euo pipefail

BACKEND="backend/src"
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "=========================================="
echo "  MechMind OS — Security Audit"
echo "=========================================="
echo ""

# 1. Tenant isolation: Prisma queries without tenantId
echo "--- TENANT ISOLATION ---"
TENANT_ISSUES=$(grep -rn "prisma\.\w\+\.find\|prisma\.\w\+\.update\|prisma\.\w\+\.delete\|prisma\.\w\+\.create" "$BACKEND" --include="*.ts" | grep -v tenantId | grep -v ".spec.ts" | grep -v "node_modules" | grep -v "prisma.service" || true)
TENANT_COUNT=$(echo "$TENANT_ISSUES" | grep -c "." || echo 0)
if [ "$TENANT_COUNT" -gt 0 ]; then
  echo -e "${RED}❌ Query senza tenantId: $TENANT_COUNT${NC}"
  echo "$TENANT_ISSUES" | head -20
else
  echo -e "${GREEN}✅ Tutte le query hanno tenantId${NC}"
fi
echo ""

# 2. console.log in production code
echo "--- CONSOLE.LOG ---"
CONSOLE_ISSUES=$(grep -rn "console\.log\|console\.warn\|console\.error" "$BACKEND" --include="*.ts" | grep -v ".spec.ts" | grep -v "node_modules" | grep -v "logger.service" || true)
CONSOLE_COUNT=$(echo "$CONSOLE_ISSUES" | grep -c "." || echo 0)
if [ "$CONSOLE_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  console.log in produzione: $CONSOLE_COUNT${NC}"
  echo "$CONSOLE_ISSUES" | head -10
else
  echo -e "${GREEN}✅ Nessun console.log${NC}"
fi
echo ""

# 3. PII fields potentially unencrypted
echo "--- PII NON CIFRATI ---"
PII_ISSUES=$(grep -rn "phone\|email\|firstName\|lastName\|fiscalCode\|taxCode" "$BACKEND" --include="*.ts" | grep -v encrypted | grep -v hash | grep -v ".spec.ts" | grep -v ".dto.ts" | grep -v "node_modules" | grep -v "EncryptionService" | grep -v "encrypt\|decrypt" || true)
PII_COUNT=$(echo "$PII_ISSUES" | grep -c "." || echo 0)
if [ "$PII_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  PII potenzialmente non cifrati: $PII_COUNT${NC}"
  echo "$PII_ISSUES" | head -10
else
  echo -e "${GREEN}✅ PII cifrati correttamente${NC}"
fi
echo ""

# 4. Secrets hardcoded
echo "--- SECRETS HARDCODED ---"
SECRET_ISSUES=$(grep -rn "password.*=.*['\"].*[a-zA-Z0-9]\|secret.*=.*['\"].*[a-zA-Z0-9]\|apiKey.*=.*['\"].*[a-zA-Z0-9]" "$BACKEND" --include="*.ts" -i | grep -v configService | grep -v process.env | grep -v ".spec." | grep -v "node_modules" | grep -v "@ApiProperty\|@IsString\|description" || true)
SECRET_COUNT=$(echo "$SECRET_ISSUES" | grep -c "." || echo 0)
if [ "$SECRET_COUNT" -gt 0 ]; then
  echo -e "${RED}❌ Secrets hardcoded: $SECRET_COUNT${NC}"
  echo "$SECRET_ISSUES" | head -10
else
  echo -e "${GREEN}✅ Nessun secret hardcoded${NC}"
fi
echo ""

# 5. @ts-ignore / any
echo "--- TYPESCRIPT VIOLATIONS ---"
TS_ISSUES=$(grep -rn "@ts-ignore\|@ts-nocheck\|: any\b\|as any" "$BACKEND" --include="*.ts" | grep -v "node_modules" | grep -v ".spec.ts" || true)
TS_COUNT=$(echo "$TS_ISSUES" | grep -c "." || echo 0)
if [ "$TS_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  TypeScript violations: $TS_COUNT${NC}"
  echo "$TS_ISSUES" | head -10
else
  echo -e "${GREEN}✅ Nessuna violazione TypeScript${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "  RIEPILOGO"
echo "=========================================="
echo "  Tenant isolation:    $TENANT_COUNT issue"
echo "  Console.log:         $CONSOLE_COUNT issue"
echo "  PII non cifrati:     $PII_COUNT issue"
echo "  Secrets hardcoded:   $SECRET_COUNT issue"
echo "  TS violations:       $TS_COUNT issue"
TOTAL=$((TENANT_COUNT + CONSOLE_COUNT + PII_COUNT + SECRET_COUNT + TS_COUNT))
echo "  TOTALE:              $TOTAL issue"
echo "=========================================="
exit 0
