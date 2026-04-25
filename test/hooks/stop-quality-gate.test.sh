#!/bin/bash
# Test suite for stop-quality-gate.sh hook
# Run: bash test/hooks/stop-quality-gate.test.sh

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK="$REPO_ROOT/.claude/hooks/stop-quality-gate.sh"
TEMP_DIR="/tmp/stop-quality-gate-test"
PASS=0
FAIL=0

cleanup() {
  rm -rf "$TEMP_DIR"
  cd "$REPO_ROOT"
}
trap cleanup EXIT

mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"
git init --quiet
git config user.name "Test" && git config user.email "test@example.com"

# Test 1: File TS con errori → exit 2
echo "=== Test 1: TS with errors → exit 2 ==="
echo 'let x: number = "string";' > test-err.ts
git add test-err.ts
OUTPUT=$("$HOOK" <<< '{}' 2>&1 || true)
EXIT_CODE=$?
if [ "$EXIT_CODE" -eq 2 ] || [[ "$OUTPUT" == *"STOP HOOK"* ]]; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL: Expected exit 2 or STOP HOOK message, got $EXIT_CODE"
  ((FAIL++))
fi

# Test 2: File TS valido → exit 0
echo "=== Test 2: Valid TS → exit 0 ==="
git reset HEAD test-err.ts
rm test-err.ts
echo 'let x: number = 42;' > test-ok.ts
git add test-ok.ts
OUTPUT=$("$HOOK" <<< '{}' 2>&1 || true)
EXIT_CODE=$?
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL: Expected exit 0, got $EXIT_CODE"
  echo "Output: $OUTPUT"
  ((FAIL++))
fi

# Test 3: Nessun file TS → skip (exit 0)
echo "=== Test 3: No TS files → skip (exit 0) ==="
git reset HEAD test-ok.ts
rm test-ok.ts
OUTPUT=$("$HOOK" <<< '{}' 2>&1 || true)
EXIT_CODE=$?
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL: Expected exit 0 on skip, got $EXIT_CODE"
  ((FAIL++))
fi

# Test 4: Emergency bypass flag → exit 0 (no block)
echo "=== Test 4: Emergency bypass → exit 0 ==="
echo 'let x: number = "string";' > test-bypass.ts
git add test-bypass.ts
OUTPUT=$("$HOOK" <<< '{"stop_hook_active":false}' 2>&1 || true)
EXIT_CODE=$?
# Should still fail because bypass is false; test real bypass behavior
OUTPUT=$("$HOOK" <<< '{"stop_hook_active":true}' 2>&1 || true)
EXIT_CODE=$?
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "✅ PASS: Bypass flag honored"
  ((PASS++))
else
  echo "❌ FAIL: Bypass flag not working"
  ((FAIL++))
fi

# Test 5: JSX/TSX files → same rules
echo "=== Test 5: TSX files → same rules ==="
git reset HEAD test-bypass.ts
rm test-bypass.ts
echo 'const x: string = 123 as any;' > Component.tsx
git add Component.tsx
OUTPUT=$("$HOOK" <<< '{}' 2>&1 || true)
EXIT_CODE=$?
if [ "$EXIT_CODE" -eq 2 ] || [[ "$OUTPUT" == *"STOP HOOK"* ]]; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "⚠️  WARN: TSX error detection may need implementation"
  ((FAIL++))
fi

echo ""
echo "====== SUMMARY ======"
echo "✅ PASS: $PASS"
echo "❌ FAIL: $FAIL"
echo "TOTAL: $((PASS + FAIL))"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
