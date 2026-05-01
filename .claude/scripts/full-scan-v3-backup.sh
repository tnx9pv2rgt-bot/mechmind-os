#!/bin/bash
# ==============================================================================
# FULL-SCAN v3 — backend (Fase 1‑7) + frontend (Fase 8‑15)
# ==============================================================================
set -uo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCAN_DIR="$PROJECT_ROOT/.claude/scans"
mkdir -p "$SCAN_DIR"
REPORT="$SCAN_DIR/scan-$(date +%Y%m%d-%H%M%S).json"
echo '{"timestamp":"'"$(date -u '+%Y-%m-%dT%H:%M:%SZ')"'","findings":[]}' > "$REPORT"

add_finding() {
  local severity="$1" file="$2" line="$3" category="$4" msg="$5"
  jq --arg severity "$severity" \
     --arg file "$file" \
     --argjson line "$line" \
     --arg category "$category" \
     --arg msg "$msg" \
     '.findings += [{"severity":$severity,"file":$file,"line":$line,"category":$category,"message":$msg}]' \
     "$REPORT" > "$REPORT.tmp" && mv "$REPORT.tmp" "$REPORT"
}

# =============================== BACKEND ===============================
echo "🔍 FASE 1/15 — Backend: TypeScript check..."
cd "$PROJECT_ROOT/backend" && npx tsc --noEmit 2>&1 | grep "error TS" | while read -r line; do
  file=$(echo "$line" | grep -oE 'src/[^:]+' | head -1)
  lineno=$(echo "$line" | grep -oE ':[0-9]+:' | head -1 | tr -d ':')
  msg=$(echo "$line" | cut -d: -f3-)
  add_finding "HIGH" "${file:-unknown}" "${lineno:-0}" "typescript" "$msg"
done

echo "🔍 FASE 2/15 — Backend: ESLint + autofix..."
cd "$PROJECT_ROOT/backend" && npx eslint src --fix --quiet 2>/dev/null
cd "$PROJECT_ROOT/backend" && npx eslint src --max-warnings 0 --format json 2>/dev/null | jq -c '.[] | {file:.filePath,messages:.messages}' | while read -r obj; do
  file=$(echo "$obj" | jq -r '.file' | sed "s|$PROJECT_ROOT/backend/||")
  echo "$obj" | jq -c '.messages[]' | while read -r msg; do
    lineno=$(echo "$msg" | jq -r '.line')
    rule=$(echo "$msg" | jq -r '.ruleId')
    text=$(echo "$msg" | jq -r '.message')
    add_finding "MEDIUM" "$file" "$lineno" "eslint" "[$rule] $text"
  done
done

echo "🔍 FASE 3/15 — Segreti e TruffleHog..."
if command -v trufflehog &>/dev/null; then
  cd "$PROJECT_ROOT" && trufflehog filesystem --directory=. --json 2>/dev/null | jq -c 'select(.DetectorName!="")' | while read -r finding; do
    file=$(echo "$finding" | jq -r '.SourceMetadata.Data.Filesystem.file' | sed "s|$PROJECT_ROOT/||")
    lineno=$(echo "$finding" | jq -r '.SourceMetadata.Data.Filesystem.line')
    detector=$(echo "$finding" | jq -r '.DetectorName')
    add_finding "CRITICAL" "$file" "$lineno" "security" "Segreto $detector"
  done
else
  cd "$PROJECT_ROOT" && grep -rInE "(password\s*=\s*['\"][^'\"]+['\"]|apiKey\s*=\s*['\"][^'\"]+['\"]|secret\s*=\s*['\"][^'\"]+['\"]|token\s*=\s*['\"][^'\"]+['\"])" backend/src frontend/src --include="*.ts" --include="*.tsx" --exclude="*.spec.ts" 2>/dev/null | while read -r line; do
    file=$(echo "$line" | cut -d: -f1 | sed "s|$PROJECT_ROOT/||")
    lineno=$(echo "$line" | cut -d: -f2)
    add_finding "CRITICAL" "$file" "$lineno" "security" "Possibile segreto (installa trufflehog)"
  done
fi

echo "🔍 FASE 4/15 — Backend: coverage c8..."
for modulo in $(ls -d "$PROJECT_ROOT/backend/src"/*/ | grep -v __ | xargs -n1 basename); do
  coverage=$(cd "$PROJECT_ROOT/backend" && npx c8 --include "src/$modulo/**/*.ts" --exclude "src/$modulo/**/*.spec.ts" npx jest "src/$modulo" --no-coverage --forceExit --silent 2>&1 | grep "All files" | awk '{print $4, $6}')
  stmts=$(echo "$coverage" | awk '{print $1}' | tr -d '%')
  branches=$(echo "$coverage" | awk '{print $2}' | tr -d '%')
  if [ -n "$stmts" ] && [ "${stmts%.*}" -lt 90 ] 2>/dev/null; then
    add_finding "HIGH" "src/$modulo" 0 "coverage" "Statements ${stmts}% sotto 90%"
  fi
  if [ -n "$branches" ] && [ "${branches%.*}" -lt 90 ] 2>/dev/null; then
    add_finding "HIGH" "src/$modulo" 0 "coverage" "Branches ${branches}% sotto 90%"
  fi
done

echo "🔍 FASE 5/15 — Backend: pattern NASA..."
cd "$PROJECT_ROOT/backend" && grep -rIn "[:][ ]*any[ ]*[=;),]" src --include="*.ts" 2>/dev/null | head -30 | while read -r line; do
  file=$(echo "$line" | cut -d: -f1)
  lineno=$(echo "$line" | cut -d: -f2)
  add_finding "LOW" "$file" "$lineno" "nasa-quality" "Uso di 'any'"
done
cd "$PROJECT_ROOT/backend" && grep -rIn "@ts-ignore\|@ts-expect-error" src --include="*.ts" 2>/dev/null | while read -r line; do
  file=$(echo "$line" | cut -d: -f1)
  lineno=$(echo "$line" | cut -d: -f2)
  add_finding "LOW" "$file" "$lineno" "nasa-quality" "@ts-ignore / @ts-expect-error"
done

echo "🔍 FASE 6/15 — Backend: console.log / catch vuoti..."
cd "$PROJECT_ROOT/backend" && grep -rIn "console\.log" src --include="*.ts" 2>/dev/null | while read -r line; do
  file=$(echo "$line" | cut -d: -f1)
  lineno=$(echo "$line" | cut -d: -f2)
  add_finding "LOW" "$file" "$lineno" "observability" "console.log → logger strutturato"
done
cd "$PROJECT_ROOT/backend" && grep -rIn "catch\s*[(][^)]*[)]\s*[{]\s*[}]" src --include="*.ts" 2>/dev/null | while read -r line; do
  file=$(echo "$line" | cut -d: -f1)
  lineno=$(echo "$line" | cut -d: -f2)
  add_finding "MEDIUM" "$file" "$lineno" "resilience" "catch vuoto"
done

echo "🔍 FASE 7/15 — Backend: Prettier + pulizia..."
cd "$PROJECT_ROOT/backend" && npx prettier --write "src/**/*.ts" --loglevel silent 2>/dev/null || true
cd "$PROJECT_ROOT/backend" && find src -name "*.ts" -exec sed -i '' '/console\.log/d' {} \; 2>/dev/null || true

# =============================== FRONTEND ===============================
if [ -d "$PROJECT_ROOT/frontend" ]; then
  BACKEND_UP=$(lsof -i :3002 2>/dev/null | grep -q LISTEN && echo 1 || echo 0)

  echo "🔍 FASE 8/15 — Frontend: TypeScript check..."
  cd "$PROJECT_ROOT/frontend" && npx tsc --noEmit 2>&1 | grep "error TS" | while read -r line; do
    file=$(echo "$line" | grep -oE 'src/[^:]+' | head -1)
    lineno=$(echo "$line" | grep -oE ':[0-9]+:' | head -1 | tr -d ':')
    msg=$(echo "$line" | cut -d: -f3-)
    add_finding "HIGH" "frontend/${file:-unknown}" "${lineno:-0}" "typescript" "$msg"
  done

  echo "🔍 FASE 9/15 — Frontend: ESLint + Prettier..."
  cd "$PROJECT_ROOT/frontend" && npx eslint src --fix --quiet 2>/dev/null
  cd "$PROJECT_ROOT/frontend" && npx eslint src --max-warnings 0 --format json 2>/dev/null | jq -c '.[] | {file:.filePath,messages:.messages}' | while read -r obj; do
    file=$(echo "$obj" | jq -r '.file' | sed "s|$PROJECT_ROOT/frontend/||")
    echo "$obj" | jq -c '.messages[]' | while read -r msg; do
      lineno=$(echo "$msg" | jq -r '.line')
      rule=$(echo "$msg" | jq -r '.ruleId')
      text=$(echo "$msg" | jq -r '.message')
      add_finding "MEDIUM" "frontend/$file" "$lineno" "eslint" "[$rule] $text"
    done
  done
  cd "$PROJECT_ROOT/frontend" && npx prettier --write "src/**/*.{ts,tsx}" --loglevel silent 2>/dev/null || true

  echo "🔍 FASE 10/15 — Frontend: Vitest..."
  cd "$PROJECT_ROOT/frontend" && npx vitest run --reporter=json 2>/dev/null | jq -c '.testResults[] | {file:.name, suites:.assertionResults}' | while read -r result; do
    file=$(echo "$result" | jq -r '.file' | sed "s|$PROJECT_ROOT/frontend/||")
    failed=$(echo "$result" | jq -r '.suites | map(select(.status == "failed")) | length')
    if [ "$failed" -gt 0 ] 2>/dev/null; then
      add_finding "HIGH" "frontend/$file" 0 "vitest" "$failed test falliti"
    fi
  done

  # FASE 11: Playwright solo se backend up
  if [ "$BACKEND_UP" -eq 1 ]; then
    echo "🔍 FASE 11/15 — Frontend: Playwright E2E..."
    cd "$PROJECT_ROOT/frontend" && npx playwright test --reporter=json 2>/dev/null | jq -c '.suites[] | .specs[] | select(.ok == false)' | while read -r spec; do
      file=$(echo "$spec" | jq -r '.title')
      add_finding "HIGH" "frontend/e2e/$file" 0 "playwright" "Test E2E fallito"
    done
  else
    echo "🔍 FASE 11/15 — Frontend: Playwright E2E ⏭ saltato (backend offline)"
  fi

  echo "🔍 FASE 12/15 — Frontend: Accessibilità (axe)..."
  if command -v axe &>/dev/null; then
    cd "$PROJECT_ROOT/frontend" && npx @axe-core/cli http://localhost:3000 --rules wcag2a,wcag2aa --format json 2>/dev/null | jq -c '.[] | .violations[]' | while read -r violation; do
      rule=$(echo "$violation" | jq -r '.id')
      count=$(echo "$violation" | jq -r '.nodes | length')
      add_finding "MEDIUM" "frontend" 0 "accessibility" "WCAG $rule: $count elementi"
    done
  else
    add_finding "LOW" "frontend" 0 "accessibility" "axe non installato (npm i -g @axe-core/cli)"
  fi

  echo "🔍 FASE 13/15 — Frontend: Dead links..."
  if [ "$BACKEND_UP" -eq 1 ]; then
    cd "$PROJECT_ROOT/frontend" && npx sniff-qa --url http://localhost:3000 --ci --checks dead-links --reporter json 2>/dev/null | jq -c '.findings[]' 2>/dev/null | while read -r finding; do
      msg=$(echo "$finding" | jq -r '.message')
      add_finding "HIGH" "frontend" 0 "dead-links" "$msg"
    done || echo "⚠️ sniff-qa non disponibile per dead-links"
  else
    echo "🔍 FASE 13/15 — Frontend: Dead links ⏭ saltato (backend offline)"
  fi

  echo "🔍 FASE 14/15 — Frontend: API contract validation..."
  if [ "$BACKEND_UP" -eq 1 ]; then
    be_endpoints=$(grep -rh "@Controller\|@Get\|@Post\|@Put\|@Patch\|@Delete" "$PROJECT_ROOT/backend/src" --include="*.ts" | grep -oE "['\"](/[^'\"]+)['\"]" | tr -d "'\"" | sort -u)
    fe_calls=$(grep -rh "fetch(\|axios\.\|useQuery(" "$PROJECT_ROOT/frontend/src" --include="*.ts" --include="*.tsx" | grep -oE "['\"](\/v1\/[^'\"]+)['\"]" | tr -d "'\"" | sort -u)
    while read -r fe; do
      echo "$be_endpoints" | grep -qF "$fe" || add_finding "CRITICAL" "frontend" 0 "api-contract" "$fe chiamato ma non esposto dal backend"
    done <<< "$fe_calls"
  else
    echo "🔍 FASE 14/15 — API contract ⏭ saltato (backend offline)"
  fi

  echo "🔍 FASE 15/15 — Frontend: React best practice..."
  cd "$PROJECT_ROOT/frontend" && npx react-doctor --ci 2>/dev/null | while read -r line; do
    file=$(echo "$line" | grep -oE 'src/[^:]+' | head -1)
    lineno=$(echo "$line" | grep -oE ':[0-9]+' | head -1 | tr -d ':')
    msg=$(echo "$line" | cut -d: -f3-)
    add_finding "LOW" "frontend/${file:-unknown}" "${lineno:-0}" "react-best-practice" "$msg"
  done || add_finding "LOW" "frontend" 0 "react-best-practice" "react-doctor non eseguibile"
else
  echo "🔍 FASE 8-15⏭ Frontend non trovato — skip."
fi

# =============================== REPORT ===============================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SCANSIONE COMPLETATA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "$REPORT" ]; then
  total=$(jq '.findings | length' "$REPORT")
  be_crit=$(jq '[.findings[] | select(.file | startswith("backend") or (startswith("src/") and (startswith("frontend/") | not))) | select(.severity=="CRITICAL")] | length' "$REPORT")
  fe_crit=$(jq '[.findings[] | select(.file | startswith("frontend/")) | select(.severity=="CRITICAL")] | length' "$REPORT")
  echo "CRITICAL: backend $be_crit / frontend $fe_crit"
  be_high=$(jq '[.findings[] | select(.file | startswith("backend") or (startswith("src/") and (startswith("frontend/") | not))) | select(.severity=="HIGH")] | length' "$REPORT")
  fe_high=$(jq '[.findings[] | select(.file | startswith("frontend/")) | select(.severity=="HIGH")] | length' "$REPORT")
  echo "HIGH:     backend $be_high / frontend $fe_high"
  be_med=$(jq '[.findings[] | select(.file | startswith("backend") or (startswith("src/") and (startswith("frontend/") | not))) | select(.severity=="MEDIUM")] | length' "$REPORT")
  fe_med=$(jq '[.findings[] | select(.file | startswith("frontend/")) | select(.severity=="MEDIUM")] | length' "$REPORT")
  echo "MEDIUM:   backend $be_med / frontend $fe_med"
  be_low=$(jq '[.findings[] | select(.file | startswith("backend") or (startswith("src/") and (startswith("frontend/") | not))) | select(.severity=="LOW")] | length' "$REPORT")
  fe_low=$(jq '[.findings[] | select(.file | startswith("frontend/")) | select(.severity=="LOW")] | length' "$REPORT")
  echo "LOW:      backend $be_low / frontend $fe_low"
  echo "TOTALE:   $total"
  echo "Report:   $REPORT"
else
  echo "ERRORE: Report non creato."
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
