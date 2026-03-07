#!/bin/bash

echo "=========================================="
echo "Multi-Tenancy Implementation Verification"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 (missing)"
        return 1
    fi
}

check_schema() {
    echo "Checking Prisma schema..."
    if grep -q "model Tenant" prisma/schema.prisma; then
        echo -e "${GREEN}✓${NC} Tenant model exists"
    else
        echo -e "${RED}✗${NC} Tenant model missing"
    fi
    
    if grep -q "tenantId" prisma/schema.prisma; then
        count=$(grep -c "tenantId" prisma/schema.prisma)
        echo -e "${GREEN}✓${NC} Found $count tenantId references"
    else
        echo -e "${RED}✗${NC} No tenantId fields found"
    fi
}

echo "1. Database Schema"
echo "------------------"
check_schema
echo ""

echo "2. Middleware Files"
echo "-------------------"
check_file "middleware/tenant.ts"
check_file "middleware.ts"
echo ""

echo "3. Tenant Context Module"
echo "------------------------"
check_file "lib/tenant/context.ts"
check_file "lib/tenant/index.ts"
echo ""

echo "4. Updated Services"
echo "-------------------"
check_file "lib/services/maintenanceService.ts"
check_file "lib/services/warrantyService.ts"
check_file "lib/services/notificationService.ts"
echo ""

echo "5. Authentication"
echo "-----------------"
check_file "lib/auth/portal-auth.ts"
echo ""

echo "6. API Routes"
echo "-------------"
check_file "app/api/tenant/register/route.ts"
check_file "app/api/tenant/resolve/route.ts"
check_file "app/api/tenant/setup/route.ts"
echo ""

echo "7. Tests"
echo "--------"
check_file "lib/tenant/__tests__/data-isolation.test.ts"
echo ""

echo "8. Documentation"
echo "----------------"
check_file "MULTI_TENANCY_IMPLEMENTATION.md"
echo ""

echo "=========================================="
echo "Verification Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Run: npx prisma migrate dev --name add_multi_tenancy"
echo "2. Run: npx prisma generate"
echo "3. Run: npm test -- lib/tenant/__tests__/data-isolation.test.ts"
echo "4. Start the development server"
