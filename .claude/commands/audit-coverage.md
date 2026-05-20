Esegui un audit completo della coverage del progetto. Rileva gap, distingui
ceiling architetturali da lacune reali, e fixa automaticamente le lacune
fixabili.

```bash
echo "=========================================="
echo "  AUDIT COVERAGE — MechMind OS"
echo "  $(date '+%Y-%m-%d %H:%M')"
echo "=========================================="

echo ""
echo "=== 1. HOOK FRONTEND — test mancanti ==="
HOOKS_DIR="frontend/hooks"
TESTS_DIR="frontend/__tests__/hooks"
MISSING_HOOKS=()

for hook_file in $(find "$HOOKS_DIR" -name "*.ts" ! -name "index.ts" -type f | sort); do
  hook_name=$(basename "$hook_file" .ts)
  test_file="$TESTS_DIR/${hook_name}.test.ts"
  if [ ! -f "$test_file" ]; then
    MISSING_HOOKS+=("$hook_name")
    echo "  ❌ $hook_name (no test found)"
  fi
done

if [ ${#MISSING_HOOKS[@]} -eq 0 ]; then
  echo "  ✅ Tutti gli hook hanno test dedicati"
else
  echo "  → ${#MISSING_HOOKS[@]} hook senza test"
fi

echo ""
echo "=== 2. DASHBOARD E2E — moduli senza spec ==="
DASHBOARD_DIR="frontend/app/dashboard"
E2E_DIR="frontend/e2e/dashboard"
MISSING_E2E=()

for module_dir in $(find "$DASHBOARD_DIR" -mindepth 1 -maxdepth 1 -type d | sort); do
  module_name=$(basename "$module_dir")
  spec_file="$E2E_DIR/${module_name}.spec.ts"
  if [ ! -f "$spec_file" ]; then
    MISSING_E2E+=("$module_name")
    echo "  ❌ $module_name (no E2E spec)"
  fi
done

if [ ${#MISSING_E2E[@]} -eq 0 ]; then
  echo "  ✅ Tutti i moduli dashboard hanno spec E2E"
else
  echo "  → ${#MISSING_E2E[@]} moduli senza spec E2E"
fi

echo ""
echo "=== 3. BACKEND — moduli con test (conteggio spec) ==="
BACKEND_SRC="backend/src"
MISSING_SPEC=()

for service_file in $(find "$BACKEND_SRC" -name "*.service.ts" ! -name "*.spec.ts" -type f | sort); do
  spec_file="${service_file%.service.ts}.service.spec.ts"
  if [ ! -f "$spec_file" ]; then
    rel=$(echo "$service_file" | sed "s|$BACKEND_SRC/||")
    MISSING_SPEC+=("$rel")
    echo "  ❌ $rel (no spec.ts)"
  fi
done

if [ ${#MISSING_SPEC[@]} -eq 0 ]; then
  echo "  ✅ Tutti i service backend hanno spec"
else
  echo "  → ${#MISSING_SPEC[@]} service senza spec"
fi

echo ""
echo "=== 4. BACKEND — ceiling architetturali noti ==="
echo "  ⚠️  NestJS/Swagger decorators (@ApiTags, @ApiOperation, @ApiOkResponse)"
echo "     generano IIFE branches non strumentabili in unit test (Istanbul/c8 limit)"
echo "  ⚠️  Moduli a ceiling: public-token controller (75% branches — 3 IIFE decorator)"
echo "  ℹ️  Misura autoritative: jest native (NON c8 standalone)"

echo ""
echo "=========================================="
echo "  RIEPILOGO"
echo "=========================================="
HOOK_COUNT=${#MISSING_HOOKS[@]}
E2E_COUNT=${#MISSING_E2E[@]}
SPEC_COUNT=${#MISSING_SPEC[@]}
TOTAL_GAPS=$((HOOK_COUNT + E2E_COUNT + SPEC_COUNT))

[ $HOOK_COUNT -eq 0 ] && echo "  Hook frontend:    ✅ completo" || echo "  Hook frontend:    ❌ $HOOK_COUNT mancanti"
[ $E2E_COUNT -eq 0 ]  && echo "  Dashboard E2E:    ✅ completo" || echo "  Dashboard E2E:    ❌ $E2E_COUNT mancanti"
[ $SPEC_COUNT -eq 0 ] && echo "  Backend service:  ✅ completo" || echo "  Backend service:  ❌ $SPEC_COUNT mancanti"
echo "  Ceiling arch.:    ⚠️  public-token controller (documentato, non fixabile)"
echo ""
[ $TOTAL_GAPS -eq 0 ] && echo "  → NESSUN GAP REALE. Ceiling solo architetturali." || echo "  → $TOTAL_GAPS gap reali rilevati."
echo "=========================================="
```

Se $ARGUMENTS contiene "fix", per ogni gap rilevato lancia un subagent (model:
sonnet) con il prompt:

- Hook mancante: "Crea **tests**/hooks/<hookName>.test.ts per
  frontend/hooks/<path>/<hookName>.ts. Segui il pattern dei test esistenti in
  frontend/**tests**/hooks/. Soglia: ≥8 test, ≥2 expect per test,
  jest.clearAllMocks() in beforeEach."
- E2E mancante: "Crea frontend/e2e/dashboard/<modulo>.spec.ts con ≥13 test
  Playwright per il modulo <modulo>. Segui il pattern di
  frontend/e2e/dashboard/billing.spec.ts."
- Service senza spec: "Crea il file spec per
  backend/src/<path>/<service>.service.ts. TDD: failing test prima, poi
  implementazione. Soglia statements ≥90% AND branches ≥90%."

Nota: i ceiling architetturali (decorator IIFE NestJS/Swagger) NON sono fixabili
in unit test. Non generare test per coprirli — sono bug strumentali di Istanbul,
non lacune reali.
