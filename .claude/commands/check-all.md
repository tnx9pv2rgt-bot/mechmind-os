Esegui TUTTI i check di qualità. Per ogni check, stampa ✅ o ❌ con dettaglio.

```bash
echo "=== 1. TypeScript backend ==="
cd backend && npx tsc --noEmit --pretty false 2>&1 | grep -c "error TS" || echo "0"
cd ..

echo "=== 2. TypeScript frontend ==="
cd frontend && npx tsc --noEmit --pretty false 2>&1 | grep -c "error TS" || echo "0"
cd ..

echo "=== 3. ESLint ==="
cd backend && npm run lint 2>&1 | tail -3
cd ..

echo "=== 4. Test ==="
cd backend && npx jest --forceExit 2>&1 | tail -5
cd ..

echo "=== 5. Build ==="
cd backend && npm run build 2>&1 | tail -3
cd ..

echo "=== 6. Mock data ==="
grep -rn "DEMO_DATA\|demoData\|mockData\|isDemoMode\|getDemoData" frontend/app/api/ --include="*.ts" | wc -l

echo "=== 7. console.log in prod ==="
grep -rn "console\.log" backend/src/ --include="*.ts" | grep -v ".spec.ts" | grep -v "logger" | wc -l

echo "=== 8. Query senza tenantId ==="
grep -rn "prisma\.\w\+\.find\|prisma\.\w\+\.update\|prisma\.\w\+\.delete" backend/src/ --include="*.ts" | grep -v tenantId | grep -v ".spec.ts" | wc -l
```

Stampa report finale:
```
CHECK-ALL REPORT — MechMind OS v10
TypeScript backend:  ✅ 0 errori / ❌ N errori
TypeScript frontend: ✅ 0 errori / ❌ N errori
ESLint:              ✅ 0 / ❌ N errori
Test:                ✅ XXXX/XXXX / ❌ N falliti
Build:               ✅ clean / ❌ errori
Mock data:           ✅ 0 / ❌ N trovati
console.log:         ✅ 0 / ❌ N trovati
Query no-tenant:     ✅ 0 / ❌ N trovati
```

Per OGNI ❌ → fixa immediatamente senza chiedere.
