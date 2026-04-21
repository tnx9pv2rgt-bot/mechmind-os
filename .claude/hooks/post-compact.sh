#!/bin/bash
BRANCH=$(git branch --show-current 2>/dev/null || echo "n/a")
printf "\033[33m===== POST COMPACTION: REGOLE CORE =====\033[0m\n"
printf " * OGNI query Prisma -> where: { tenantId }\n"
printf " * PII -> SOLO EncryptionService (AES-256-CBC)\n"
printf " * Route API frontend -> SOLO proxyToNestJS — MAI mock/demo data\n"
printf " * TDD: test PRIMA — minimo 1 .spec.ts per service/controller\n"
printf " * Fine task: npx tsc --noEmit && npm run lint && npx jest --forceExit\n"
printf " * Branch: %s | Backend: 3002 | Frontend: 3000\n" "$BRANCH"
exit 0
