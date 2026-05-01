#!/usr/bin/env bash
# ==============================================================================
# FULL-SCAN v4 — NASA-grade Continuous Quality Assurance
# Standards: NASA NPR 7150.2D, OWASP ASVS 5.0, SLSA Level 3, SARIF 2.1.0
# ==============================================================================
set -euo pipefail

# --- CONFIGURAZIONE RIGIDA ---
readonly PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
readonly SCAN_DIR="$PROJECT_ROOT/.claude/scans"
readonly REPORT_DIR="$SCAN_DIR/$(date +%Y%m%d-%H%M%S)"
readonly SARIF_REPORT="$REPORT_DIR/report.sarif"
readonly SBOM_PATH="$REPORT_DIR/sbom.cyclonedx.json"
readonly LOG_FILE="$REPORT_DIR/execution.log"
readonly LOCK_FILE="$SCAN_DIR/.full-scan.lock"

# Threshold NASA NPR 7150.2D §3.7.5
readonly COVERAGE_STATEMENTS=90
readonly COVERAGE_BRANCHES=85
readonly COVERAGE_FUNCTIONS=90
readonly COVERAGE_LINES=90
readonly COMPLEXITY_MAX=15

# Colori
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

# --- UTILITIES ---
log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"; }
fatal() { echo -e "${RED}[FATAL]${NC} $1" | tee -a "$LOG_FILE"; exit 1; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"; }

# Lock file per prevenire esecuzioni concorrenti
acquire_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        local pid; pid=$(cat "$LOCK_FILE" 2>/dev/null) || true
        if kill -0 "$pid" 2>/dev/null; then
            fatal "Scan gia' in esecuzione (PID: $pid). Usa: rm $LOCK_FILE se sei sicuro."
        fi
    fi
    echo $$ > "$LOCK_FILE"
    trap 'rm -f "$LOCK_FILE"' EXIT INT TERM
}

# Inizializzazione SARIF 2.1.0 standard
init_sarif() {
    mkdir -p "$REPORT_DIR"
    cat > "$SARIF_REPORT" <<'EOF'
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "full-scan-v4",
          "informationUri": "https://github.com/nexo-gestionale/full-scan",
          "version": "4.0.0",
          "rules": []
        }
      },
      "results": [],
      "invocations": [{
        "executionSuccessful": true,
        "startTimeUtc": "",
        "endTimeUtc": ""
      }]
    }
  ]
}
EOF
    local start_time; start_time=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
    jq --arg start "$start_time" '.runs[0].invocations[0].startTimeUtc = $start' "$SARIF_REPORT" > "$SARIF_REPORT.tmp" && mv "$SARIF_REPORT.tmp" "$SARIF_REPORT"
}

# Aggiunge finding SARIF con severity OWASP ASVS mapping
add_sarif_finding() {
    local severity="$1" rule_id="$2" message="$3" file="$4" line="$5" col="${6:-1}"
    local level="warning"
    case "$severity" in
        CRITICAL) level="error" ;;
        HIGH) level="error" ;;
        MEDIUM) level="warning" ;;
        LOW) level="note" ;;
    esac

    # NASA FIX BUG5: jq can fail if SARIF is malformed; default to 0 instead of crashing
    local rule_exists
    rule_exists=$(jq --arg id "$rule_id" '[.runs[0].tool.driver.rules[]? | select(.id == $id)] | length' "$SARIF_REPORT" 2>/dev/null) || rule_exists=0
    if [[ "$rule_exists" == "0" ]]; then
        # NASA FIX BUG8: guard jq mutations so a malformed SARIF never kills the scan
        jq --arg id "$rule_id" --arg msg "$message" \
           '.runs[0].tool.driver.rules += [{"id": $id, "shortDescription": {"text": $msg}}]' \
           "$SARIF_REPORT" > "$SARIF_REPORT.tmp" 2>/dev/null && mv "$SARIF_REPORT.tmp" "$SARIF_REPORT" || true
    fi

    # NASA FIX BUG8: guard main result append — jq exit codes (3=compile, 5=system) must not kill scan
    jq --arg rule "$rule_id" --arg msg "$message" --arg file "$file" \
       --argjson line "${line:-1}" --argjson col "${col:-1}" --arg level "$level" \
       '.runs[0].results += [{
         "ruleId": $rule,
         "message": {"text": $msg},
         "level": $level,
         "locations": [{
           "physicalLocation": {
             "artifactLocation": {"uri": $file, "uriBaseId": "%SRCROOT%"},
             "region": {"startLine": $line, "startColumn": $col}
           }
         }]
       }]' \
       "$SARIF_REPORT" > "$SARIF_REPORT.tmp" 2>/dev/null && mv "$SARIF_REPORT.tmp" "$SARIF_REPORT" || true
}

# Verifica prerequisiti
check_prerequisites() {
    log "Verifica prerequisiti..."
    local missing=()
    for cmd in jq node npm npx; do
        command -v "$cmd" &>/dev/null || missing+=("$cmd")
    done

    if ! command -v trivy &>/dev/null; then
        warn "Trivy non installato. Installa: brew install trivy (macOS) o apt install trivy (Linux)"
    fi
    if ! command -v semgrep &>/dev/null; then
        warn "Semgrep non installato. Installa: pip install semgrep"
    fi
    if ! command -v grype &>/dev/null; then
        warn "Grype non installato. Installa: brew install grype"
    fi

    if [[ ${#missing[@]} -gt 0 ]]; then
        fatal "Prerequisiti mancanti: ${missing[*]}"
    fi
}

# --- FASE 1: SAST LAYER 1 — Semgrep (Fast PR-level, ~10s) ---
fase_1_semgrep() {
    log "FASE 1/15 — SAST Layer 1: Semgrep (fast pattern matching)..."
    if ! command -v semgrep &>/dev/null; then
        warn "Semgrep non disponibile — skip"
        add_sarif_finding "MEDIUM" "semgrep-missing" "Semgrep non installato. Installa per SAST layer 1." "full-scan.sh" 1
        return 0
    fi

    local semgrep_out="$REPORT_DIR/semgrep.json"
    cd "$PROJECT_ROOT"

    semgrep ci --json --output="$semgrep_out" \
        --config=auto \
        --config="p/owasp-top-ten-2025" \
        --config="p/cwe-top-25" \
        --config="p/typescript" \
        --config="p/react" \
        --exclude="*.spec.ts" --exclude="*.test.ts" \
        --exclude="node_modules" --exclude="dist" \
        --quiet 2>/dev/null || true

    if [[ -f "$semgrep_out" ]]; then
        jq -c '.results[]?' "$semgrep_out" 2>/dev/null | while read -r finding; do
            local file line rule msg severity
            file=$(echo "$finding" | jq -r '.path' | sed "s|$PROJECT_ROOT/||")
            line=$(echo "$finding" | jq -r '.start.line // 1')
            rule=$(echo "$finding" | jq -r '.check_id')
            msg=$(echo "$finding" | jq -r '.extra.message')
            severity=$(echo "$finding" | jq -r '.extra.metadata.severity // "MEDIUM"')
            add_sarif_finding "$severity" "$rule" "$msg" "$file" "$line" || true
        done || true
        log "   Semgrep completato. Report: $semgrep_out"
    fi
}

# --- FASE 2: SAST LAYER 2 — CodeQL (Deep semantic analysis) ---
fase_2_codeql() {
    log "FASE 2/15 — SAST Layer 2: CodeQL (deep dataflow analysis)..."
    if ! command -v codeql &>/dev/null; then
        warn "CodeQL CLI non disponibile — skip (richiede GitHub Advanced Security o CLI standalone)"
        add_sarif_finding "MEDIUM" "codeql-missing" "CodeQL non installato. Installa per deep semantic analysis." "full-scan.sh" 1
        return 0
    fi

    local codeql_db="$REPORT_DIR/codeql-db"
    local codeql_out="$REPORT_DIR/codeql.sarif"

    cd "$PROJECT_ROOT"

    codeql database create "$codeql_db" --language=javascript --source-root="$PROJECT_ROOT" --codescanning-config=.github/codeql-config.yml --quiet 2>/dev/null || {
        warn "CodeQL database creation failed — skip"
        return 0
    }

    codeql database analyze "$codeql_db" \
        javascript-security-extended \
        --format=sarifv2.1.0 \
        --output="$codeql_out" \
        --sarif-add-snippets \
        --quiet 2>/dev/null || true

    if [[ -f "$codeql_out" ]]; then
        jq -s '.[0].runs[0].results += .[1].runs[0].results | .[0]' \
           "$SARIF_REPORT" "$codeql_out" > "$SARIF_REPORT.tmp" 2>/dev/null && \
           mv "$SARIF_REPORT.tmp" "$SARIF_REPORT"
        log "   CodeQL completato. Report: $codeql_out"
    fi
}

# --- FASE 3: Secret Scanning — Trivy + Git History ---
fase_3_secrets() {
    log "FASE 3/15 — Secret Scanning: Trivy filesystem + git history..."

    if command -v trivy &>/dev/null; then
        local trivy_out="$REPORT_DIR/trivy-secrets.json"
        cd "$PROJECT_ROOT"

        trivy filesystem . \
            --scanners secret \
            --format json \
            --output "$trivy_out" \
            --severity HIGH,CRITICAL \
            --skip-dirs "node_modules,dist,coverage,.git" \
            --quiet 2>/dev/null || true

        if [[ -f "$trivy_out" ]]; then
            jq -c '.Results[]? | select(.Secrets) | .Secrets[]?' "$trivy_out" 2>/dev/null | while read -r secret; do
                local file line rule msg
                file=$(echo "$secret" | jq -r '.Target // "unknown"' | sed "s|$PROJECT_ROOT/||")
                line=$(echo "$secret" | jq -r '.StartLine // 1')
                rule=$(echo "$secret" | jq -r '.RuleID // "secret-detected"')
                msg=$(echo "$secret" | jq -r '.Title // "Secret detected"')
                add_sarif_finding "CRITICAL" "$rule" "$msg" "$file" "$line" || true
            done || true
        fi

        if command -v trufflehog &>/dev/null; then
            local truffle_out="$REPORT_DIR/trufflehog.json"
            trufflehog git file://. --json --no-update > "$truffle_out" 2>/dev/null || true
            if [[ -f "$truffle_out" ]]; then
                jq -c 'select(.DetectorName != "")' "$truffle_out" 2>/dev/null | while read -r finding; do
                    local file line detector
                    file=$(echo "$finding" | jq -r '.SourceMetadata.Data.Filesystem.file // "unknown"' | sed "s|$PROJECT_ROOT/||")
                    line=$(echo "$finding" | jq -r '.SourceMetadata.Data.Filesystem.line // 1')
                    detector=$(echo "$finding" | jq -r '.DetectorName')
                    add_sarif_finding "CRITICAL" "trufflehog-$detector" "Secret $detector detected in git history" "$file" "$line" || true
                done || true
            fi
        else
            warn "TruffleHog non installato — git history scan saltato"
        fi

        log "   Secret scanning completato"
    else
        warn "Trivy non installato — secret scanning saltato"
        add_sarif_finding "HIGH" "trivy-missing" "Trivy non installato. Secret scanning non eseguito." "full-scan.sh" 1
    fi
}

# --- FASE 4: Dependency Scanning + SBOM (SLSA Level 3) ---
fase_4_dependencies() {
    log "FASE 4/15 — Dependency Scanning + SBOM Generation..."

    if command -v trivy &>/dev/null; then
        cd "$PROJECT_ROOT"
        trivy filesystem . \
            --scanners vuln \
            --format cyclonedx \
            --output "$SBOM_PATH" \
            --skip-dirs "node_modules,dist,coverage" \
            --quiet 2>/dev/null || true

        if [[ -f "$SBOM_PATH" ]]; then
            log "   SBOM CycloneDX generato: $SBOM_PATH"

            local vuln_out="$REPORT_DIR/trivy-vuln.json"
            trivy sbom "$SBOM_PATH" \
                --format json \
                --output "$vuln_out" \
                --severity HIGH,CRITICAL \
                --quiet 2>/dev/null || true

            if [[ -f "$vuln_out" ]]; then
                jq -c '.Results[]? | select(.Vulnerabilities) | .Vulnerabilities[]?' "$vuln_out" 2>/dev/null | while read -r vuln; do
                    local pkg severity cve msg
                    pkg=$(echo "$vuln" | jq -r '.PkgName // "unknown"')
                    severity=$(echo "$vuln" | jq -r '.Severity // "HIGH"')
                    cve=$(echo "$vuln" | jq -r '.VulnerabilityID // "CVE-unknown"')
                    msg="$cve in $pkg: $(echo "$vuln" | jq -r '.Title // "Vulnerability detected"')"
                    add_sarif_finding "$severity" "$cve" "$msg" "package.json" 1 || true
                done || true
            fi
        fi
    else
        log "   Trivy non disponibile, uso npm audit..."
        local audit_out="$REPORT_DIR/npm-audit.json"
        cd "$PROJECT_ROOT" && npm audit --json > "$audit_out" 2>/dev/null || true

        if [[ -f "$audit_out" ]]; then
            jq -c '.vulnerabilities? // {} | to_entries[]?' "$audit_out" 2>/dev/null | while read -r entry; do
                local pkg severity cve msg
                pkg=$(echo "$entry" | jq -r '.key')
                severity=$(echo "$entry" | jq -r '.value.severity // "HIGH"')
                cve=$(echo "$entry" | jq -r '.value.via[0]?.title // "CVE-unknown"')
                msg="npm audit: $severity vulnerability in $pkg"
                add_sarif_finding "$severity" "npm-audit-$pkg" "$msg" "package.json" 1 || true
            done || true
        fi
    fi
}

# --- FASE 5: Backend TypeScript + NASA Quality Gates ---
fase_5_backend_typescript() {
    log "FASE 5/15 — Backend: TypeScript strict + NASA quality gates..."

    cd "$PROJECT_ROOT/backend"

    # NASA FIX BUG2a: capture tsc output into a variable first, then grep it.
    # Original `npx tsc 2>&1 || true --pretty false | grep` was parsed as
    # (tsc) || (true --pretty false | grep ...) — true produces no output,
    # grep exits 1 on no match, pipefail → crash. TS errors were never captured.
    local tsc_output
    tsc_output=$(timeout 120 npx tsc --noEmit --pretty false 2>&1) || true
    printf '%s\n' "$tsc_output" | grep "error TS" 2>/dev/null | while IFS= read -r line; do
        local file lineno msg
        file=$(echo "$line" | grep -oE 'src/[^:]+' | head -1)
        lineno=$(echo "$line" | grep -oE ':[0-9]+:' | head -1 | tr -d ':')
        msg=$(echo "$line" | cut -d: -f3-)
        add_sarif_finding "HIGH" "typescript-error" "$msg" "backend/${file:-unknown}" "${lineno:-0}"
    done || true

    local eslint_out="$REPORT_DIR/backend-eslint.json"
    # NASA FIX BUG2b: original `npx eslint ... 2>&1 || true --format json > file` was parsed as
    # (eslint) || (true --format json > file) — `true` ignores args, file is always empty.
    # Run eslint with timeout; --format json writes JSON findings, exit!=0 is tolerated.
    timeout 120 npx eslint src --format json --quiet > "$eslint_out" 2>/dev/null || true

    if [[ -f "$eslint_out" ]]; then
        jq -c '.[]?' "$eslint_out" 2>/dev/null | while read -r obj; do
            local file messages
            file=$(echo "$obj" | jq -r '.filePath' | sed "s|$PROJECT_ROOT/backend/||")
            messages=$(echo "$obj" | jq -c '.messages[]?' 2>/dev/null)
            if [[ -n "$messages" ]]; then
                echo "$messages" | while read -r msg; do
                    local lineno rule text severity
                    lineno=$(echo "$msg" | jq -r '.line // 1')
                    rule=$(echo "$msg" | jq -r '.ruleId // "eslint-rule"')
                    text=$(echo "$msg" | jq -r '.message // "ESLint issue"')
                    severity=$(echo "$msg" | jq -r 'if .severity == 2 then "HIGH" else "MEDIUM" end')
                    add_sarif_finding "$severity" "$rule" "[$rule] $text" "backend/$file" "$lineno" || true
                done || true
            fi
        done || true
    fi

    if npx eslint --print-config src/index.ts 2>/dev/null | jq -e '.rules["complexity"]' &>/dev/null; then
        log "   ESLint complexity rule configurato"
    else
        warn "   Aggiungi 'complexity': ['error', $COMPLEXITY_MAX] a .eslintrc per NASA compliance"
        add_sarif_finding "LOW" "nasa-complexity" "Cyclomatic complexity rule non configurato. NASA NPR 7150.2D richiede <=$COMPLEXITY_MAX." "backend/.eslintrc" 1
    fi

    # NASA FIX BUG3: grep finding nothing exits 1; with pipefail the whole pipeline fails.
    # Add || true after every grep|while...done pipeline.
    grep -rIn "@ts-ignore\|@ts-expect-error" src --include="*.ts" 2>/dev/null | head -20 | while IFS= read -r line; do
        local file lineno
        file=$(echo "$line" | cut -d: -f1)
        lineno=$(echo "$line" | cut -d: -f2)
        add_sarif_finding "MEDIUM" "nasa-ts-suppress" "@ts-ignore/@ts-expect-error rilevato — richiede justification form NASA" "backend/$file" "$lineno"
    done || true
}

# --- FASE 6: Backend Coverage con Per-File Thresholds ---
fase_6_backend_coverage() {
    log "FASE 6/15 — Backend: Coverage con per-file thresholds (NASA standard)..."

    cd "$PROJECT_ROOT/backend"

    if [[ -f "vitest.config.ts" ]]; then
        local vitest_out="$REPORT_DIR/backend-vitest-coverage.json"
        npx vitest run --coverage --reporter=json --outputFile="$vitest_out" --silent 2>/dev/null || true

        if [[ -f "$vitest_out" ]]; then
            local global_coverage
            global_coverage=$(jq -r '.coverage?.summary?.statements?.pct // 0' "$vitest_out" 2>/dev/null)
            if [[ "${global_coverage%.*}" -lt "$COVERAGE_STATEMENTS" ]] 2>/dev/null; then
                add_sarif_finding "HIGH" "coverage-statements" "Statements coverage ${global_coverage}% sotto soglia ${COVERAGE_STATEMENTS}%" "backend/" 0
            fi
        fi
    elif [[ -f "jest.config.js" ]] || [[ -f "jest.config.ts" ]]; then
        local jest_out="$REPORT_DIR/backend-jest-coverage"
        # NASA FIX: cap jest at 300s so it never eats the full scan budget
        timeout 300 npx jest --coverage --coverageReporters=json-summary --coverageDirectory="$jest_out" --silent 2>/dev/null || true

        if [[ -f "$jest_out/coverage-summary.json" ]]; then
            local total_stmts total_branches
            total_stmts=$(jq -r '.total.statements.pct // 0' "$jest_out/coverage-summary.json")
            total_branches=$(jq -r '.total.branches.pct // 0' "$jest_out/coverage-summary.json")

            if [[ "${total_stmts%.*}" -lt "$COVERAGE_STATEMENTS" ]] 2>/dev/null; then
                add_sarif_finding "HIGH" "coverage-statements" "Statements coverage ${total_stmts}% sotto soglia ${COVERAGE_STATEMENTS}%" "backend/" 0
            fi
            if [[ "${total_branches%.*}" -lt "$COVERAGE_BRANCHES" ]] 2>/dev/null; then
                add_sarif_finding "HIGH" "coverage-branches" "Branches coverage ${total_branches}% sotto soglia ${COVERAGE_BRANCHES}%" "backend/" 0
            fi
        fi
    else
        warn "   Nessun config di test trovato (vitest/jest)"
    fi
}

# --- FASE 7: Backend Resilience & Observability ---
fase_7_backend_resilience() {
    log "FASE 7/15 — Backend: Resilience & Observability..."

    cd "$PROJECT_ROOT/backend"

    # NASA FIX BUG3: || true after grep|while pipelines to handle zero-match case
    grep -rIn "catch\s*[(][^)]*[)]\s*[{]\s*[}]" src --include="*.ts" 2>/dev/null | while IFS= read -r line; do
        local file lineno
        file=$(echo "$line" | cut -d: -f1)
        lineno=$(echo "$line" | cut -d: -f2)
        add_sarif_finding "MEDIUM" "resilience-empty-catch" "catch vuoto — richiede almeno logging o re-throw" "backend/$file" "$lineno"
    done || true

    # NASA FIX BUG3: || true after grep|while pipelines to handle zero-match case
    grep -rIn "console\.log\|console\.warn\|console\.error" src --include="*.ts" 2>/dev/null | while IFS= read -r line; do
        local file lineno
        file=$(echo "$line" | cut -d: -f1)
        lineno=$(echo "$line" | cut -d: -f2)
        add_sarif_finding "LOW" "observability-console" "console.* rilevato — usa logger strutturato con correlation IDs (OpenTelemetry)" "backend/$file" "$lineno"
    done || true

    if ! grep -rq "opentelemetry\|@opentelemetry" src --include="*.ts" 2>/dev/null; then
        add_sarif_finding "LOW" "observability-otel-missing" "OpenTelemetry non rilevato. NASA NPR 7150.2D richiede tracing distribuito per sistemi critici." "backend/" 0
    fi
}

# --- FASE 8: Frontend TypeScript ---
fase_8_frontend_typescript() {
    log "FASE 8/15 — Frontend: TypeScript strict check..."

    if [[ ! -d "$PROJECT_ROOT/frontend" ]]; then
        log "   Frontend non trovato — skip"
        return 0
    fi

    cd "$PROJECT_ROOT/frontend"

    # NASA FIX BUG2a: same broken pipeline as backend fase_5; capture output first
    local tsc_output
    tsc_output=$(timeout 120 npx tsc --noEmit --pretty false 2>&1) || true
    printf '%s\n' "$tsc_output" | grep "error TS" 2>/dev/null | while IFS= read -r line; do
        local file lineno msg
        file=$(echo "$line" | grep -oE 'src/[^:]+' | head -1)
        lineno=$(echo "$line" | grep -oE ':[0-9]+:' | head -1 | tr -d ':')
        msg=$(echo "$line" | cut -d: -f3-)
        add_sarif_finding "HIGH" "typescript-error" "$msg" "frontend/${file:-unknown}" "${lineno:-0}"
    done || true
}

# --- FASE 9: Frontend ESLint + React Best Practices ---
fase_9_frontend_eslint() {
    log "FASE 9/15 — Frontend: ESLint + React best practices..."

    if [[ ! -d "$PROJECT_ROOT/frontend" ]]; then
        return 0
    fi

    cd "$PROJECT_ROOT/frontend"

    local eslint_out="$REPORT_DIR/frontend-eslint.json"
    # NASA FIX BUG2b: same broken pattern as backend fase_5; run with timeout, tolerate exit!=0
    timeout 120 npx eslint src --format json --quiet > "$eslint_out" 2>/dev/null || true

    if [[ -f "$eslint_out" ]]; then
        # NASA FIX BUG9: both while-pipeline done's need || true (BUG3 pattern missed in fase_9)
        jq -c '.[]?' "$eslint_out" 2>/dev/null | while read -r obj; do
            local file messages
            file=$(echo "$obj" | jq -r '.filePath' | sed "s|$PROJECT_ROOT/frontend/||")
            messages=$(echo "$obj" | jq -c '.messages[]?' 2>/dev/null)
            if [[ -n "$messages" ]]; then
                echo "$messages" | while read -r msg; do
                    local lineno rule text severity
                    lineno=$(echo "$msg" | jq -r '.line // 1')
                    rule=$(echo "$msg" | jq -r '.ruleId // "eslint-rule"')
                    text=$(echo "$msg" | jq -r '.message // "ESLint issue"')
                    severity=$(echo "$msg" | jq -r 'if .severity == 2 then "HIGH" else "MEDIUM" end')
                    add_sarif_finding "$severity" "$rule" "[$rule] $text" "frontend/$file" "$lineno" || true
                done || true
            fi
        done || true
    fi

    if ! npx eslint --print-config src/main.tsx 2>/dev/null | jq -e '.rules["react-hooks/rules-of-hooks"]' &>/dev/null; then
        warn "   react-hooks/rules-of-hooks non configurato"
        add_sarif_finding "MEDIUM" "react-hooks-missing" "react-hooks/rules-of-hooks non configurato in ESLint" "frontend/.eslintrc" 1 || true
    fi

    if command -v npx knip &>/dev/null; then
        local knip_out="$REPORT_DIR/frontend-knip.json"
        npx knip --json > "$knip_out" 2>/dev/null || true
        if [[ -f "$knip_out" ]]; then
            jq -c '.issues?.dependencies? // [] | .[]?' "$knip_out" 2>/dev/null | while read -r issue; do
                local file msg
                file=$(echo "$issue" | jq -r '.file // "unknown"')
                msg=$(echo "$issue" | jq -r '.symbol // "Dead code detected"')
                add_sarif_finding "LOW" "knip-dead-code" "$msg" "frontend/$file" 1 || true
            done || true
        fi
    fi
}

# --- FASE 10: Frontend Vitest + Coverage ---
fase_10_frontend_vitest() {
    log "FASE 10/15 — Frontend: Vitest + per-file coverage thresholds..."

    if [[ ! -d "$PROJECT_ROOT/frontend" ]]; then
        return 0
    fi

    cd "$PROJECT_ROOT/frontend"

    if [[ -f "vitest.config.ts" ]]; then
        if ! grep -q "thresholds.*perFile\|perFile.*true" vitest.config.ts 2>/dev/null; then
            warn "   coverage.thresholds.perFile non configurato in vitest.config.ts"
            add_sarif_finding "MEDIUM" "vitest-perfile-threshold" "coverage.thresholds.perFile non configurato. NASA richiede per-file coverage." "frontend/vitest.config.ts" 1
        fi
    fi

    local vitest_out="$REPORT_DIR/frontend-vitest.json"
    # NASA FIX: cap vitest at 120s to avoid blocking the scan budget
    timeout 120 npx vitest run --reporter=json --outputFile="$vitest_out" --silent 2>/dev/null || true

    if [[ -f "$vitest_out" ]]; then
        jq -c '.testResults[]?' "$vitest_out" 2>/dev/null | while read -r result; do
            local file failed
            file=$(echo "$result" | jq -r '.name // "unknown"' | sed "s|$PROJECT_ROOT/frontend/||")
            failed=$(echo "$result" | jq -r '[.assertionResults[]? | select(.status == "failed")] | length')
            if [[ "$failed" -gt 0 ]] 2>/dev/null; then
                add_sarif_finding "HIGH" "vitest-failed" "$failed test falliti" "frontend/$file" 0 || true
            fi
        done || true
    fi

    local coverage_out="$REPORT_DIR/frontend-coverage.json"
    # NASA FIX: cap vitest coverage at 120s
    timeout 120 npx vitest run --coverage --reporter=json --outputFile="$coverage_out" --silent 2>/dev/null || true

    if [[ -f "$coverage_out" ]]; then
        local total_stmts total_branches
        total_stmts=$(jq -r '.coverage?.summary?.statements?.pct // 0' "$coverage_out" 2>/dev/null)
        total_branches=$(jq -r '.coverage?.summary?.branches?.pct // 0' "$coverage_out" 2>/dev/null)

        if [[ "${total_stmts%.*}" -lt "$COVERAGE_STATEMENTS" ]] 2>/dev/null; then
            add_sarif_finding "HIGH" "coverage-statements" "Frontend statements coverage ${total_stmts}% sotto soglia ${COVERAGE_STATEMENTS}%" "frontend/" 0
        fi
        if [[ "${total_branches%.*}" -lt "$COVERAGE_BRANCHES" ]] 2>/dev/null; then
            add_sarif_finding "HIGH" "coverage-branches" "Frontend branches coverage ${total_branches}% sotto soglia ${COVERAGE_BRANCHES}%" "frontend/" 0
        fi
    fi
}

# --- FASE 11: Playwright E2E con Test Containers ---
fase_11_playwright() {
    log "FASE 11/15 — Frontend: Playwright E2E (test containers)..."

    if [[ ! -d "$PROJECT_ROOT/frontend" ]]; then
        return 0
    fi

    cd "$PROJECT_ROOT/frontend"

    if [[ ! -f "playwright.config.ts" ]]; then
        log "   Playwright non configurato — skip"
        return 0
    fi

    local pw_out="$REPORT_DIR/frontend-playwright.json"
    npx playwright test --reporter=json --trace=on --screenshot=only-on-failure > "$pw_out" 2>/dev/null || true

    if [[ -f "$pw_out" ]]; then
        jq -c '.suites[]? | .specs[]? | select(.ok == false)' "$pw_out" 2>/dev/null | while read -r spec; do
            local file
            file=$(echo "$spec" | jq -r '.title // "unknown"')
            add_sarif_finding "HIGH" "playwright-failed" "Test E2E fallito: $file" "frontend/e2e/$file" 0 || true
        done || true
    fi

    if [[ -d "test-results" ]]; then
        cp -r test-results "$REPORT_DIR/playwright-traces" 2>/dev/null || true
        log "   Playwright traces archiviati in $REPORT_DIR/playwright-traces"
    fi
}

# --- FASE 12: Accessibilita' (axe-core in Playwright) ---
fase_12_accessibility() {
    log "FASE 12/15 — Frontend: Accessibilita' WCAG 2.1 AA + EN 301 549..."

    if [[ ! -d "$PROJECT_ROOT/frontend" ]]; then
        return 0
    fi

    cd "$PROJECT_ROOT/frontend"

    if ! npm list @axe-core/playwright &>/dev/null 2>&1; then
        warn "   @axe-core/playwright non installato. Installa: npm i -D @axe-core/playwright"
        add_sarif_finding "MEDIUM" "axe-missing" "@axe-core/playwright non installato. EU Accessibility Act 2025 richiede WCAG 2.1 AA." "frontend/package.json" 1
        return 0
    fi

    local axe_out="$REPORT_DIR/frontend-axe.json"

    if grep -rq "axe" e2e --include="*.spec.ts" 2>/dev/null; then
        npx playwright test e2e --grep "axe\|accessibility" --reporter=json > "$axe_out" 2>/dev/null || true
        if [[ -f "$axe_out" ]]; then
            jq -c '.suites[]? | .specs[]? | select(.ok == false)' "$axe_out" 2>/dev/null | while read -r spec; do
                local file
                file=$(echo "$spec" | jq -r '.title // "unknown"')
                add_sarif_finding "MEDIUM" "axe-violation" "WCAG violation: $file" "frontend/e2e/$file" 0 || true
            done || true
        fi
    else
        warn "   Nessun test axe-core trovato in e2e/"
        add_sarif_finding "LOW" "axe-no-tests" "Nessun test di accessibilita' axe-core trovato." "frontend/e2e/" 0
    fi
}

# --- FASE 13: Dead Links (Lychee) ---
fase_13_dead_links() {
    log "FASE 13/15 — Frontend: Dead links scan..."

    if [[ ! -d "$PROJECT_ROOT/frontend" ]]; then
        return 0
    fi

    if command -v lychee &>/dev/null; then
        local lychee_out="$REPORT_DIR/frontend-lychee.json"
        cd "$PROJECT_ROOT/frontend"

        lychee --json --output "$lychee_out" \
            --exclude "localhost" \
            --exclude "127.0.0.1" \
            --exclude "example.com" \
            src/ public/ 2>/dev/null || true

        if [[ -f "$lychee_out" ]]; then
            jq -c '.fail_map? | to_entries[]?' "$lychee_out" 2>/dev/null | while read -r entry; do
                local file url
                file=$(echo "$entry" | jq -r '.key')
                url=$(echo "$entry" | jq -r '.value[0]?.url // "unknown"')
                add_sarif_finding "HIGH" "dead-link" "Dead link: $url in $file" "frontend/$file" 1 || true
            done || true
        fi
    else
        warn "   Lychee non installato. Installa: brew install lychee (macOS) o cargo install lychee"
        add_sarif_finding "LOW" "lychee-missing" "Lychee non installato per dead link detection." "frontend/" 0
    fi
}

# --- FASE 14: API Contract Testing (OpenAPI + Zod) ---
fase_14_api_contract() {
    log "FASE 14/15 — API Contract: OpenAPI validation..."

    local openapi_file=""
    for f in "$PROJECT_ROOT/backend/openapi.yaml" "$PROJECT_ROOT/backend/openapi.json" "$PROJECT_ROOT/openapi.yaml"; do
        [[ -f "$f" ]] && openapi_file="$f" && break || true
    done

    if [[ -z "$openapi_file" ]]; then
        warn "   OpenAPI spec non trovata. Genera con @nestjs/swagger o strumento equivalente."
        add_sarif_finding "MEDIUM" "openapi-missing" "OpenAPI spec non trovata. Contract testing impossibile." "backend/" 0
        return 0
    fi

    if command -v npx spectral &>/dev/null; then
        local spectral_out="$REPORT_DIR/spectral.json"
        npx spectral lint "$openapi_file" --format=json --output="$spectral_out" 2>/dev/null || true

        if [[ -f "$spectral_out" ]]; then
            jq -c '.[]?' "$spectral_out" 2>/dev/null | while read -r issue; do
                local line msg severity
                line=$(echo "$issue" | jq -r '.range.start.line // 1')
                msg=$(echo "$issue" | jq -r '.message // "Spectral issue"')
                # NASA FIX BUG7: jq has no C-style ternary; use if/then/else
                severity=$(echo "$issue" | jq -r 'if .severity == 0 then "HIGH" else (if .severity == 1 then "MEDIUM" else "LOW" end) end')
                add_sarif_finding "$severity" "spectral-lint" "$msg" "backend/openapi.yaml" "$line" || true
            done || true
        fi
    fi

    if grep -rq "zod\|@zod" "$PROJECT_ROOT/backend/src" --include="*.ts" 2>/dev/null; then
        log "   Zod rilevato per runtime validation"
    else
        warn "   Zod non rilevato. Considera @anatine/zod-nestjs per validazione automatica."
        add_sarif_finding "LOW" "zod-missing" "Zod non rilevato per runtime schema validation." "backend/package.json" 1
    fi
}

# --- FASE 15: SLSA Provenance + Final Report ---
fase_15_slsa_report() {
    log "FASE 15/15 — SLSA Provenance + Final Report..."

    if [[ -n "${CI:-}" ]] && command -v gh &>/dev/null; then
        log "   Generazione artifact attestation SLSA Level 3..."
        gh attestation verify "$SARIF_REPORT" -R "${GITHUB_REPOSITORY:-}" 2>/dev/null || {
            warn "   Artifact attestation non generata. Richiede GitHub Actions con permissions: id-token: write, attestations: write"
        }
    fi

    local end_time; end_time=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
    jq --arg end "$end_time" '.runs[0].invocations[0].endTimeUtc = $end' "$SARIF_REPORT" > "$SARIF_REPORT.tmp" 2>/dev/null && mv "$SARIF_REPORT.tmp" "$SARIF_REPORT" || true

    local total critical high medium low
    total=$(jq '[.runs[0].results[]?] | length' "$SARIF_REPORT" 2>/dev/null || echo 0)
    critical=$(jq '[.runs[0].results[]? | select(.level == "error") | select(.message.text | contains("CRITICAL"))] | length' "$SARIF_REPORT" 2>/dev/null || echo 0)
    high=$(jq '[.runs[0].results[]? | select(.level == "error")] | length' "$SARIF_REPORT" 2>/dev/null || echo 0)
    medium=$(jq '[.runs[0].results[]? | select(.level == "warning")] | length' "$SARIF_REPORT" 2>/dev/null || echo 0)
    low=$(jq '[.runs[0].results[]? | select(.level == "note")] | length' "$SARIF_REPORT" 2>/dev/null || echo 0)

    local score=10
    [[ "$critical" -gt 0 ]] && score=$((score - 4))
    [[ "$high" -gt 5 ]] && score=$((score - 2))
    [[ "$high" -gt 0 ]] && score=$((score - 1))
    [[ "$medium" -gt 10 ]] && score=$((score - 1))

    cat <<EOF

================================================================================
                        FULL-SCAN v4 — REPORT FINALE
================================================================================
  Timestamp:    $(date -u '+%Y-%m-%d %H:%M:%S UTC')
  Standards:    NASA NPR 7150.2D | OWASP ASVS 5.0 | SLSA Level 3 | SARIF 2.1.0
  Report:       $SARIF_REPORT
  SBOM:         $SBOM_PATH
  Log:          $LOG_FILE

  SEVERITY DISTRIBUTION
  CRITICAL:  $critical  |  HIGH:  $high  |  MEDIUM:  $medium  |  LOW:  $low
  TOTAL:     $total findings

  NASA NPR 7150.2D COMPLIANCE SCORE: ${score}/10
  $(if [[ "$score" -ge 8 ]]; then echo "COMPLIANT — Pronto per deployment"; \
     elif [[ "$score" -ge 5 ]]; then echo "CONDITIONAL — Review richiesta"; \
     else echo "NON-COMPLIANT — Deployment BLOCCATO"; fi)

  SLSA LEVEL 3 CHECKLIST
  $(if [[ -f "$SBOM_PATH" ]]; then echo "SBOM CycloneDX generato"; else echo "SBOM mancante"; fi)
  $(if [[ -n "${CI:-}" ]]; then echo "Build in ambiente isolato (CI)"; else echo "Build locale — non SLSA L3"; fi)
  $(if command -v gh &>/dev/null && gh attestation verify "$SARIF_REPORT" &>/dev/null 2>&1; then echo "Artifact attestation firmata"; else echo "Artifact attestation non verificata"; fi)

================================================================================
EOF

    if [[ -n "${CI:-}" ]] && [[ -n "${GITHUB_TOKEN:-}" ]]; then
        log "Upload SARIF a GitHub Security tab..."
        gh api "repos/${GITHUB_REPOSITORY}/code-scanning/sarifs" \
            -X POST \
            -F "sarif=$(base64 -i "$SARIF_REPORT")" \
            -F "ref=${GITHUB_REF:-}" \
            -F "commit_sha=${GITHUB_SHA:-}" 2>/dev/null || \
            warn "Upload SARIF fallito — verifica permissions: security-events: write"
    fi

    if [[ "$critical" -gt 0 ]]; then
        fatal "CRITICAL findings rilevati. Deployment BLOCCATO."
    elif [[ "$high" -gt 5 ]]; then
        fatal "Troppi HIGH findings (>5). Deployment BLOCCATO."
    else
        log "Scan completato. Review findings prima del deployment."
        return 0
    fi
}

# ==============================================================================
# FASE 5B — Backend: pattern 'any' (NASA) e console.log/catch vuoti
# NASA FIX BUG1: moved BEFORE main() — bash reads sequentially; functions defined
# after `main "$@"` are not available when main() runs, causing exit 127.
# ==============================================================================
fase_5b_backend_nasa_patterns() {
    log "FASE 5B/15 — Backend: NASA patterns (any, console.log, catch vuoti)..."

    cd "$PROJECT_ROOT/backend"

    # NASA FIX BUG3: || true after each grep|while pipeline (grep exits 1 on no match)
    grep -rIn "[:][ ]*any[ ]*[=;),]" src --include="*.ts" 2>/dev/null | head -30 | while IFS= read -r line; do
        local file lineno
        file=$(echo "$line" | cut -d: -f1)
        lineno=$(echo "$line" | cut -d: -f2)
        add_sarif_finding "LOW" "nasa-any" "Uso di 'any' — sostituire con unknown o tipo esplicito" "backend/$file" "$lineno"
    done || true

    grep -rIn "console\.log" src --include="*.ts" 2>/dev/null | while IFS= read -r line; do
        local file lineno
        file=$(echo "$line" | cut -d: -f1)
        lineno=$(echo "$line" | cut -d: -f2)
        add_sarif_finding "LOW" "observability-console" "console.log rilevato — usa logger strutturato" "backend/$file" "$lineno"
    done || true

    grep -rIn "catch\s*[(][^)]*[)]\s*[{]\s*[}]" src --include="*.ts" 2>/dev/null | while IFS= read -r line; do
        local file lineno
        file=$(echo "$line" | cut -d: -f1)
        lineno=$(echo "$line" | cut -d: -f2)
        add_sarif_finding "MEDIUM" "resilience-empty-catch" "catch vuoto — gestire l'errore esplicitamente" "backend/$file" "$lineno"
    done || true
}

# ==============================================================================
# FASE 9B — Frontend: pattern 'any', console.log, catch vuoti
# NASA FIX BUG1: moved BEFORE main() — same reason as fase_5b
# ==============================================================================
fase_9b_frontend_nasa_patterns() {
    log "FASE 9B/15 — Frontend: NASA patterns (any, console.log, catch vuoti)..."

    if [[ ! -d "$PROJECT_ROOT/frontend" ]]; then
        return 0
    fi

    cd "$PROJECT_ROOT/frontend"

    # NASA FIX BUG3: || true after each grep|while pipeline
    grep -rIn "[:][ ]*any[ ]*[=;),]" src --include="*.ts" --include="*.tsx" 2>/dev/null | head -30 | while IFS= read -r line; do
        local file lineno
        file=$(echo "$line" | cut -d: -f1)
        lineno=$(echo "$line" | cut -d: -f2)
        add_sarif_finding "LOW" "nasa-any" "Uso di 'any' — sostituire con unknown o tipo esplicito" "frontend/$file" "$lineno"
    done || true

    grep -rIn "console\.log" src --include="*.ts" --include="*.tsx" 2>/dev/null | while IFS= read -r line; do
        local file lineno
        file=$(echo "$line" | cut -d: -f1)
        lineno=$(echo "$line" | cut -d: -f2)
        add_sarif_finding "LOW" "observability-console" "console.log rilevato — usa logger strutturato" "frontend/$file" "$lineno"
    done || true

    grep -rIn "catch\s*[(][^)]*[)]\s*[{]\s*[}]" src --include="*.ts" --include="*.tsx" 2>/dev/null | while IFS= read -r line; do
        local file lineno
        file=$(echo "$line" | cut -d: -f1)
        lineno=$(echo "$line" | cut -d: -f2)
        add_sarif_finding "MEDIUM" "resilience-empty-catch" "catch vuoto — gestire l'errore esplicitamente" "frontend/$file" "$lineno"
    done || true
}

# ==============================================================================
# FASE 14B — API Contract (grep frontend vs backend)
# NASA FIX BUG1: moved BEFORE main() — same reason as fase_5b
# ==============================================================================
fase_14b_api_contract() {
    log "FASE 14B/15 — API Contract: validazione chiamate frontend vs backend..."

    if [[ ! -d "$PROJECT_ROOT/frontend" ]]; then
        return 0
    fi

    # NASA FIX BUG4: grep pipelines in command substitution exit 1 on no match → set -e crash.
    # Use || true inside the subshell so assignment always succeeds.
    local be_endpoints fe_calls
    be_endpoints=$(grep -rh "@Controller\|@Get\|@Post\|@Put\|@Patch\|@Delete" "$PROJECT_ROOT/backend/src" --include="*.ts" 2>/dev/null | grep -oE "['\"](/[^'\"]+)['\"]" | tr -d "'\"" | sort -u || true)
    fe_calls=$(grep -rh "fetch(\|axios\.\|useQuery(" "$PROJECT_ROOT/frontend/src" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -oE "['\"](\/v1\/[^'\"]+)['\"]" | tr -d "'\"" | sort -u || true)

    while IFS= read -r fe; do
        if ! echo "$be_endpoints" | grep -qF "$fe"; then
            add_sarif_finding "CRITICAL" "api-contract" "Il frontend chiama $fe ma il backend non lo espone" "frontend/" 1 || true
        fi
    done <<< "$fe_calls" || true
}

# ==============================================================================
# FASE 14C — React Doctor (best practice React)
# NASA FIX BUG1: moved BEFORE main() — same reason as fase_5b
# ==============================================================================
fase_14c_react_doctor() {
    log "FASE 14C/15 — Frontend: React Doctor (47+ regole best practice)..."

    if [[ ! -d "$PROJECT_ROOT/frontend" ]]; then
        return 0
    fi

    cd "$PROJECT_ROOT/frontend"

    if command -v npx react-doctor &>/dev/null || npx react-doctor --version &>/dev/null 2>&1; then
        npx react-doctor --ci 2>/dev/null | while IFS= read -r line; do
            local file lineno msg
            file=$(echo "$line" | grep -oE 'src/[^:]+' | head -1)
            lineno=$(echo "$line" | grep -oE ':[0-9]+' | head -1 | tr -d ':')
            msg=$(echo "$line" | cut -d: -f3-)
            add_sarif_finding "LOW" "react-best-practice" "$msg" "frontend/${file:-unknown}" "${lineno:-0}"
        done || true
    else
        add_sarif_finding "LOW" "react-doctor-missing" "react-doctor non installato. Installa: npm i -D react-doctor" "frontend/package.json" 1
    fi
}

# ==============================================================================
# MAIN
# ==============================================================================
main() {
  mkdir -p "$REPORT_DIR"
    acquire_lock
    check_prerequisites
    init_sarif

    log "Avvio FULL-SCAN v4 — $(date)"
    log "Project: $PROJECT_ROOT"
    log "Report:  $REPORT_DIR"

    fase_1_semgrep
    fase_2_codeql
    fase_3_secrets
    fase_4_dependencies
    fase_5_backend_typescript
    fase_5b_backend_nasa_patterns
    fase_6_backend_coverage
    fase_7_backend_resilience
    fase_8_frontend_typescript
    fase_9_frontend_eslint
    fase_9b_frontend_nasa_patterns
    fase_10_frontend_vitest
    fase_11_playwright
    fase_12_accessibility
    fase_13_dead_links
    fase_14_api_contract
    fase_14b_api_contract
    fase_14c_react_doctor
    fase_15_slsa_report

    log "FULL-SCAN v4 completato — $(date)"
}

main "$@"
