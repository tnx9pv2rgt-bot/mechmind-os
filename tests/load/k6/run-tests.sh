#!/bin/bash

# MechMind OS v10 - k6 Load Test Runner
# Executes all load tests sequentially and aggregates results

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Configuration
ENVIRONMENT="${ENVIRONMENT:-local}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
JWT_TOKEN="${JWT_TOKEN:-}"
VAPI_WEBHOOK_SECRET="${VAPI_WEBHOOK_SECRET:-test-webhook-secret}"

# Test configuration
RUN_RACE_TEST="${RUN_RACE_TEST:-true}"
RUN_LOCK_TEST="${RUN_LOCK_TEST:-true}"
RUN_VOICE_TEST="${RUN_VOICE_TEST:-true}"
RUN_GDPR_TEST="${RUN_GDPR_TEST:-false}"  # Disabled by default (long running)

# Result aggregation
TEST_RESULTS=()
OVERALL_STATUS="PASSED"

# ============================================
# UTILITY FUNCTIONS
# ============================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# SETUP FUNCTIONS
# ============================================

setup() {
    log_info "Setting up load test environment..."
    
    # Create results directory
    mkdir -p "${RESULTS_DIR}/${TIMESTAMP}"
    
    # Check if k6 is installed
    if ! command -v k6 &> /dev/null; then
        log_error "k6 is not installed. Installing..."
        install_k6
    fi
    
    # Verify k6 installation
    K6_VERSION=$(k6 version | head -n 1)
    log_info "Using ${K6_VERSION}"
    
    # Check environment variables
    if [[ -z "${JWT_TOKEN}" ]]; then
        log_warning "JWT_TOKEN not set. Authentication may fail."
    fi
    
    log_success "Setup complete"
    echo ""
}

install_k6() {
    log_info "Installing k6..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install -y k6
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install k6
        else
            log_error "Homebrew not found. Please install k6 manually."
            exit 1
        fi
    else
        log_error "Unsupported OS. Please install k6 manually: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    
    log_success "k6 installed successfully"
}

# ============================================
# TEST EXECUTION FUNCTIONS
# ============================================

run_test() {
    local test_name="$1"
    local test_file="$2"
    local test_duration="$3"
    
    log_info "Running ${test_name}..."
    log_info "Duration: ${test_duration}"
    
    local output_dir="${RESULTS_DIR}/${TIMESTAMP}"
    local json_output="${output_dir}/${test_name}.json"
    local html_output="${output_dir}/${test_name}.html"
    
    # Run k6 test
    export ENVIRONMENT="${ENVIRONMENT}"
    export BASE_URL="${BASE_URL}"
    export JWT_TOKEN="${JWT_TOKEN}"
    export VAPI_WEBHOOK_SECRET="${VAPI_WEBHOOK_SECRET}"
    export TEST_TENANT_ID="${TEST_TENANT_ID:-550e8400-e29b-41d4-a716-446655440000}"
    export TEST_SHOP_ID="${TEST_SHOP_ID:-550e8400-e29b-41d4-a716-446655440001}"
    
    local start_time=$(date +%s)
    
    if k6 run \
        --out "json=${json_output}" \
        --summary-export "${output_dir}/${test_name}-summary.json" \
        "${SCRIPT_DIR}/${test_file}"; then
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_success "${test_name} completed in ${duration}s"
        TEST_RESULTS+=("${test_name}: PASSED (${duration}s)")
        
        # Generate HTML report if k6-html-reporter is available
        generate_html_report "${json_output}" "${html_output}"
        
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_error "${test_name} failed after ${duration}s"
        TEST_RESULTS+=("${test_name}: FAILED (${duration}s)")
        OVERALL_STATUS="FAILED"
        
        return 1
    fi
}

generate_html_report() {
    local json_file="$1"
    local html_file="$2"
    
    # Check if k6-html-reporter is available
    if command -v k6-reporter &> /dev/null; then
        k6-reporter "${json_file}" -o "${html_file}" 2>/dev/null || true
    fi
}

# ============================================
# INDIVIDUAL TEST RUNNERS
# ============================================

run_race_condition_test() {
    if [[ "${RUN_RACE_TEST}" != "true" ]]; then
        log_warning "Skipping race condition test"
        return 0
    fi
    
    run_test "race-condition" "race-condition-test.js" "~5 minutes"
}

run_lock_contention_test() {
    if [[ "${RUN_LOCK_TEST}" != "true" ]]; then
        log_warning "Skipping lock contention test"
        return 0
    fi
    
    run_test "lock-contention" "lock-contention-test.js" "~10 minutes"
}

run_voice_throughput_test() {
    if [[ "${RUN_VOICE_TEST}" != "true" ]]; then
        log_warning "Skipping voice throughput test"
        return 0
    fi
    
    run_test "voice-throughput" "voice-throughput-test.js" "~10 minutes"
}

run_gdpr_deletion_test() {
    if [[ "${RUN_GDPR_TEST}" != "true" ]]; then
        log_warning "Skipping GDPR deletion test (enable with RUN_GDPR_TEST=true)"
        return 0
    fi
    
    log_warning "GDPR deletion test creates 10,000 customer records and may take up to 1 hour"
    read -p "Are you sure you want to continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Skipping GDPR deletion test"
        return 0
    fi
    
    run_test "gdpr-deletion" "gdpr-deletion-test.js" "~60 minutes"
}

# ============================================
# RESULT AGGREGATION
# ============================================

generate_summary() {
    log_info "Generating test summary..."
    
    local output_dir="${RESULTS_DIR}/${TIMESTAMP}"
    local summary_file="${output_dir}/SUMMARY.md"
    
    cat > "${summary_file}" << EOF
# MechMind OS v10 - Load Test Summary

**Test Run:** ${TIMESTAMP}  
**Environment:** ${ENVIRONMENT}  
**Base URL:** ${BASE_URL}  
**Overall Status:** ${OVERALL_STATUS}

## Test Results

| Test | Status | Duration |
|------|--------|----------|
EOF

    for result in "${TEST_RESULTS[@]}"; do
        local test_name=$(echo "$result" | cut -d: -f1)
        local status=$(echo "$result" | cut -d: -f2 | tr -d ' ')
        local duration=$(echo "$result" | cut -d: -f3-)
        echo "| ${test_name} | ${status} | ${duration} |" >> "${summary_file}"
    done

    cat >> "${summary_file}" << EOF

## Artifacts

- JSON Results: \`${output_dir}\`
- Individual test summaries: \`${output_dir}/*-summary.json\`

## Environment Variables

\`\`\`bash
ENVIRONMENT=${ENVIRONMENT}
BASE_URL=${BASE_URL}
TEST_TENANT_ID=${TEST_TENANT_ID:-550e8400-e29b-41d4-a716-446655440000}
TEST_SHOP_ID=${TEST_SHOP_ID:-550e8400-e29b-41d4-a716-446655440001}
\`\`\`

## Thresholds

| Metric | Target |
|--------|--------|
| Race Condition - Double Bookings | 0 |
| Race Condition - p99 Response | < 500ms |
| Lock Contention - p99 Lock Wait | < 100ms |
| Lock Contention - Deadlocks | 0 |
| Voice Throughput - p99 Latency | < 2.5s |
| Voice Throughput - Error Rate | < 1% |
| Voice Throughput - Lost Webhooks | 0 |
| GDPR Deletion - Duration | < 1 hour |
| GDPR Deletion - PII Leaks | 0 |

---
*Generated by MechMind OS Load Test Suite*
EOF

    log_success "Summary saved to: ${summary_file}"
    
    # Print summary to console
    echo ""
    echo "========================================"
    echo "         TEST SUMMARY"
    echo "========================================"
    echo "Environment: ${ENVIRONMENT}"
    echo "Timestamp: ${TIMESTAMP}"
    echo "Status: ${OVERALL_STATUS}"
    echo ""
    echo "Results:"
    for result in "${TEST_RESULTS[@]}"; do
        local status=$(echo "$result" | cut -d: -f2 | tr -d ' ')
        if [[ "$status" == "PASSED" ]]; then
            echo -e "  ${GREEN}✓${NC} ${result}"
        else
            echo -e "  ${RED}✗${NC} ${result}"
        fi
    done
    echo ""
    echo "Results directory: ${output_dir}"
    echo "========================================"
}

# ============================================
# CLEANUP
# ============================================

cleanup() {
    log_info "Cleaning up..."
    
    # Archive old results (keep last 10)
    local results_count=$(ls -1 "${RESULTS_DIR}" 2>/dev/null | wc -l)
    if [[ $results_count -gt 10 ]]; then
        log_info "Archiving old results..."
        ls -1t "${RESULTS_DIR}" | tail -n +11 | while read dir; do
            rm -rf "${RESULTS_DIR}/${dir}"
        done
    fi
    
    log_success "Cleanup complete"
}

# ============================================
# MAIN
# ============================================

main() {
    echo "========================================"
    echo "  MechMind OS v10 - Load Test Suite"
    echo "========================================"
    echo ""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --url)
                BASE_URL="$2"
                shift 2
                ;;
            --token)
                JWT_TOKEN="$2"
                shift 2
                ;;
            --skip-race)
                RUN_RACE_TEST="false"
                shift
                ;;
            --skip-lock)
                RUN_LOCK_TEST="false"
                shift
                ;;
            --skip-voice)
                RUN_VOICE_TEST="false"
                shift
                ;;
            --run-gdpr)
                RUN_GDPR_TEST="true"
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --env ENV           Set environment (local, staging, prod)"
                echo "  --url URL           Set base URL"
                echo "  --token TOKEN       Set JWT token"
                echo "  --skip-race         Skip race condition test"
                echo "  --skip-lock         Skip lock contention test"
                echo "  --skip-voice        Skip voice throughput test"
                echo "  --run-gdpr          Run GDPR deletion test (disabled by default)"
                echo "  --help              Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Setup
    setup
    
    # Run tests
    run_race_condition_test
    echo ""
    
    run_lock_contention_test
    echo ""
    
    run_voice_throughput_test
    echo ""
    
    run_gdpr_deletion_test
    echo ""
    
    # Generate summary
    generate_summary
    
    # Cleanup
    cleanup
    
    # Exit with appropriate code
    if [[ "${OVERALL_STATUS}" == "PASSED" ]]; then
        log_success "All tests passed!"
        exit 0
    else
        log_error "Some tests failed!"
        exit 1
    fi
}

# Run main function
trap cleanup EXIT
main "$@"
