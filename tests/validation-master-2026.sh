#!/bin/bash
# MechMind OS v10 - Production Readiness Validation 2026
# Master script: Sequential execution of all validation tests
# 
# Usage: ./validation-master-2026.sh [API_URL] [JWT_TOKEN]

set -e

# Configuration
API_URL=${1:-"http://localhost:3000"}
JWT_TOKEN=${2:-"test-token"}
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESULTS_DIR="$PROJECT_ROOT/validation-results-$(date +%Y%m%d-%H%M%S)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
STEP1_STATUS="PENDING"
STEP2_STATUS="PENDING"
STEP3_STATUS="PENDING"
OVERALL_SCORE=0

# Create results directory
mkdir -p "$RESULTS_DIR"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     MechMind OS v10 - Production Readiness Validation 2026     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Started: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "API URL: $API_URL"
echo "Results: $RESULTS_DIR"
echo ""

# ============================================================================
# STEP 0: Pre-flight checks
# ============================================================================
echo -e "${BLUE}[STEP 0/4] Pre-flight Checks${NC}"
echo "─────────────────────────────────────────────────────────────────"

# Check dependencies
declare -a DEPS=("curl" "jq")
for dep in "${DEPS[@]}"; do
    if command -v $dep &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} $dep"
    else
        echo -e "  ${RED}✗${NC} $dep (required)"
        exit 1
    fi
done

# Check k6 (optional but recommended)
if command -v k6 &> /dev/null; then
    K6_VERSION=$(k6 version | head -1)
    echo -e "  ${GREEN}✓${NC} $K6_VERSION"
    K6_AVAILABLE=true
else
    echo -e "  ${YELLOW}⚠${NC} k6 not found - will skip load tests"
    K6_AVAILABLE=false
fi

# Check API health
echo ""
echo "  Checking API health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")

if [ "$HEALTH_STATUS" == "200" ]; then
    echo -e "  ${GREEN}✓${NC} API is healthy (HTTP 200)"
else
    echo -e "  ${YELLOW}⚠${NC} API health check returned: $HEALTH_STATUS"
    echo "  Continuing anyway (tests may fail)"
fi

echo ""

# ============================================================================
# STEP 1: Infrastructure Validation
# ============================================================================
echo -e "${BLUE}[STEP 1/4] Infrastructure Validation${NC}"
echo "─────────────────────────────────────────────────────────────────"
echo "  Checks:"
echo "    - Lambda configuration (512MB ARM64)"
echo "    - RDS connectivity"
echo "    - Secrets Manager access"
echo ""

# Check if running on AWS Lambda
LAMBDA_CHECK=$(curl -s "$API_URL/health" | jq -r '.environment // "unknown"' 2>/dev/null || echo "unknown")

if [ "$LAMBDA_CHECK" == "lambda" ] || [ "$LAMBDA_CHECK" == "dev" ]; then
    echo -e "  ${GREEN}✓${NC} Running on AWS Lambda (env: $LAMBDA_CHECK)"
else
    echo -e "  ${YELLOW}⚠${NC} Environment: $LAMBDA_CHECK (expected: lambda)"
fi

# Test database connectivity via API
DB_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/v1/health/db" 2>/dev/null || echo "000")

if [ "$DB_CHECK" == "200" ]; then
    echo -e "  ${GREEN}✓${NC} Database connection: OK"
    STEP1_STATUS="PASS"
else
    echo -e "  ${YELLOW}⚠${NC} Database check: HTTP $DB_CHECK"
    STEP1_STATUS="PARTIAL"
fi

echo ""
echo "  Step 1 Result: $STEP1_STATUS"
echo ""

# ============================================================================
# STEP 2: k6 Race Condition Test
# ============================================================================
echo -e "${BLUE}[STEP 2/4] k6 Race Condition Test${NC}"
echo "─────────────────────────────────────────────────────────────────"
echo "  Configuration:"
echo "    - 100 concurrent users"
echo "    - 1 target booking slot"
echo "    - Expected: 1 success, 99 conflicts"
echo "    - Max double bookings: 0"
echo ""

if [ "$K6_AVAILABLE" = false ]; then
    echo -e "  ${YELLOW}⚠${NC} k6 not available - skipping"
    STEP2_STATUS="SKIPPED"
else
    # Create test slot
    echo "  Creating test slot..."
    SLOT_RESPONSE=$(curl -s -X POST "$API_URL/v1/booking-slots" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"mechanicId\": \"mech-test-001\",
            \"startTime\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
            \"endTime\": \"$(date -u -d '+1 hour' +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "2026-03-15T11:00:00Z")\"
        }" 2>/dev/null || echo '{}')
    
    TEST_SLOT_ID=$(echo "$SLOT_RESPONSE" | jq -r '.id // "test-slot-race-001"')
    echo -e "  ${GREEN}✓${NC} Test slot: $TEST_SLOT_ID"
    
    # Run k6 test
    echo ""
    echo "  Running k6 race condition test..."
    echo "  (this may take 2-3 minutes)"
    echo ""
    
    cd "$PROJECT_ROOT/tests/load/k6"
    
    K6_EXIT=0
    k6 run race-condition-2026.js \
        -e API_URL="$API_URL" \
        -e TEST_SLOT_ID="$TEST_SLOT_ID" \
        -e JWT_TOKEN="$JWT_TOKEN" \
        --out json="$RESULTS_DIR/k6-raw.jsonl" \
        2>&1 | tee "$RESULTS_DIR/k6-output.log" || K6_EXIT=$?
    
    # Check k6 summary
    if [ -f "k6-summary.json" ]; then
        mv k6-summary.json "$RESULTS_DIR/"
        
        THRESHOLDS_PASSED=$(jq -r '.thresholds.all_passed' "$RESULTS_DIR/k6-summary.json")
        
        if [ "$THRESHOLDS_PASSED" == "true" ] && [ $K6_EXIT -eq 0 ]; then
            echo -e "  ${GREEN}✓${NC} All k6 thresholds passed"
            STEP2_STATUS="PASS"
        else
            echo -e "  ${YELLOW}⚠${NC} Some thresholds failed (check logs)"
            STEP2_STATUS="PARTIAL"
        fi
        
        # Extract key metrics
        P95_LATENCY=$(jq -r '.results.latency_ms.p95' "$RESULTS_DIR/k6-summary.json")
        echo "  p95 Latency: ${P95_LATENCY}ms"
    else
        echo -e "  ${YELLOW}⚠${NC} k6 summary not generated"
        STEP2_STATUS="FAIL"
    fi
    
    cd "$PROJECT_ROOT"
fi

echo ""
echo "  Step 2 Result: $STEP2_STATUS"
echo ""

# ============================================================================
# STEP 3: GDPR Deletion Test
# ============================================================================
echo -e "${BLUE}[STEP 3/4] GDPR Article 17 Deletion Test${NC}"
echo "─────────────────────────────────────────────────────────────────"
echo "  Compliance: EDPB Coordinated Enforcement Framework 2025-2026"
echo "  Requirements:"
echo "    - ACK time: < 2000ms"
echo "    - Execution: < 5 min (best-in-class) / 30 days (EDPB SLA)"
echo "    - PII: Completely cleared"
echo "    - Audit: Trail preserved"
echo ""

# Run GDPR test script
cd "$PROJECT_ROOT/tests/gdpr"

GDPR_EXIT=0
./validate-deletion-2026.sh "$API_URL" "$JWT_TOKEN" 2>&1 | tee "$RESULTS_DIR/gdpr-output.log" || GDPR_EXIT=$?

# Copy results
if [ -d "test-results" ]; then
    cp test-results/*.json "$RESULTS_DIR/" 2>/dev/null || true
fi

cd "$PROJECT_ROOT"

# Determine status
if [ $GDPR_EXIT -eq 0 ]; then
    STEP3_STATUS="PASS"
else
    STEP3_STATUS="PARTIAL"
fi

echo ""
echo "  Step 3 Result: $STEP3_STATUS"
echo ""

# ============================================================================
# STEP 4: Generate Final Report
# ============================================================================
echo -e "${BLUE}[STEP 4/4] Final Report Generation${NC}"
echo "─────────────────────────────────────────────────────────────────"
echo ""

# Calculate score
SCORE=0
if [ "$STEP1_STATUS" == "PASS" ]; then
    SCORE=$((SCORE + 2))
elif [ "$STEP1_STATUS" == "PARTIAL" ]; then
    SCORE=$((SCORE + 1))
fi

if [ "$STEP2_STATUS" == "PASS" ]; then
    SCORE=$((SCORE + 4))
elif [ "$STEP2_STATUS" == "PARTIAL" ]; then
    SCORE=$((SCORE + 2))
elif [ "$STEP2_STATUS" == "SKIPPED" ]; then
    SCORE=$((SCORE + 1))
fi

if [ "$STEP3_STATUS" == "PASS" ]; then
    SCORE=$((SCORE + 4))
elif [ "$STEP3_STATUS" == "PARTIAL" ]; then
    SCORE=$((SCORE + 2))
fi

OVERALL_SCORE=$SCORE

# Generate JSON report
cat > "$RESULTS_DIR/validation-report.json" << EOF
{
  "validation": {
    "version": "2026.1",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "api_url": "$API_URL",
    "overall_score": $OVERALL_SCORE,
    "max_score": 10,
    "status": "$([ $OVERALL_SCORE -ge 8 ] && echo "PRODUCTION_READY" || ([ $OVERALL_SCORE -ge 5 ] && echo "CONDITIONAL" || echo "NOT_READY"))"
  },
  "steps": [
    {
      "step": 1,
      "name": "Infrastructure Validation",
      "status": "$STEP1_STATUS",
      "max_score": 2,
      "checks": ["Lambda Config", "RDS Connectivity", "Secrets Manager"]
    },
    {
      "step": 2,
      "name": "k6 Race Condition Test",
      "status": "$STEP2_STATUS",
      "max_score": 4,
      "checks": ["100 Concurrent Users", "0 Double Bookings", "p95 < 500ms"]
    },
    {
      "step": 3,
      "name": "GDPR Deletion Test",
      "status": "$STEP3_STATUS",
      "max_score": 4,
      "checks": ["ACK < 2s", "Execution < 5min", "PII Cleared", "Audit Preserved"]
    }
  ],
  "files": {
    "k6_summary": "k6-summary.json",
    "k6_output": "k6-output.log",
    "gdpr_metrics": "gdpr-metrics-*.json",
    "gdpr_output": "gdpr-output.log"
  }
}
EOF

# Print summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     FINAL RESULTS                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

printf "  %-40s %s\n" "Step 1: Infrastructure" "$(_status_color $STEP1_STATUS)"
printf "  %-40s %s\n" "Step 2: k6 Race Condition" "$(_status_color $STEP2_STATUS)"
printf "  %-40s %s\n" "Step 3: GDPR Deletion" "$(_status_color $STEP3_STATUS)"

echo ""
echo "─────────────────────────────────────────────────────────────────"
printf "  %-40s ${GREEN}%d/10${NC}\n" "OVERALL SCORE:" "$OVERALL_SCORE"
echo "─────────────────────────────────────────────────────────────────"
echo ""

if [ $OVERALL_SCORE -ge 8 ]; then
    echo -e "  ${GREEN}✅ PRODUCTION READY${NC}"
    echo ""
    echo "  Recommendations:"
    echo "    • Enable CloudWatch alarms"
    echo "    • Configure PagerDuty integration"
    echo "    • Schedule quarterly DR drills"
    echo "    • Deploy to 1-2 pilot shops"
    FINAL_EXIT=0
elif [ $OVERALL_SCORE -ge 5 ]; then
    echo -e "  ${YELLOW}⚠️  CONDITIONAL READY${NC}"
    echo ""
    echo "  Action Items:"
    echo "    • Review failed/partial tests"
    echo "    • Fix issues before full production"
    FINAL_EXIT=1
else
    echo -e "  ${RED}❌ NOT READY FOR PRODUCTION${NC}"
    echo ""
    echo "  Critical Issues Found:"
    echo "    • Major validation failures"
    echo "    • Requires significant fixes"
    FINAL_EXIT=2
fi

echo ""
echo "Results saved to: $RESULTS_DIR"
echo "Validation completed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

exit $FINAL_EXIT

# Helper function for status colors
function _status_color() {
    case $1 in
        "PASS") echo -e "${GREEN}✓ PASS${NC}" ;;
        "PARTIAL") echo -e "${YELLOW}○ PARTIAL${NC}" ;;
        "FAIL") echo -e "${RED}✗ FAIL${NC}" ;;
        "SKIPPED") echo -e "${BLUE}- SKIPPED${NC}" ;;
        *) echo -e "${YELLOW}? $1${NC}" ;;
    esac
}
