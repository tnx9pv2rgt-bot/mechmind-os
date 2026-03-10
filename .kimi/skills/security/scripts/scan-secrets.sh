#!/bin/bash
#
# Secrets Scan Script - Nexo MechMind OS
# Scans for potential secrets in codebase
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../" && pwd)"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

log_critical() {
    echo -e "${RED}[CRITICAL]${NC} $1"
}

SECRETS_FOUND=0

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              🔍 SECRETS SCAN - Nexo MechMind OS            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check for .env files in git
log_info "Checking for .env files in git..."
if git ls-files | grep -q "\.env"; then
    log_critical "⚠️  .env files found in git repository:"
    git ls-files | grep "\.env" | while read -r file; do
        echo "  - $file"
    done
    SECRETS_FOUND=$((SECRETS_FOUND + 1))
else
    log_success "✓ No .env files in git"
fi

# Check for common secret patterns
log_info "Scanning for secret patterns..."

PATTERNS=(
    "password\s*=\s*['\"][^'\"]{8,}['\"]"
    "api[_-]?key\s*=\s*['\"][^'\"]{16,}['\"]"
    "secret\s*=\s*['\"][^'\"]{16,}['\"]"
    "token\s*=\s*['\"][^'\"]{16,}['\"]"
    "private[_-]?key"
    "AKIA[0-9A-Z]{16}"
    "ghp_[a-zA-Z0-9]{36}"
    "sk-[a-zA-Z0-9]{48}"
    "sk_live_[a-zA-Z0-9]{24,}"
    "sk_test_[a-zA-Z0-9]{24,}"
)

EXCLUDE_DIRS=(
    "node_modules"
    ".git"
    "dist"
    "build"
    ".next"
    "coverage"
    ".kimi/skills"
)

# Build exclude pattern
EXCLUDE_PATTERN=""
for dir in "${EXCLUDE_DIRS[@]}"; do
    EXCLUDE_PATTERN="$EXCLUDE_PATTERN --exclude-dir=$dir"
done

for pattern in "${PATTERNS[@]}"; do
    matches=$(grep -r -i -n $EXCLUDE_PATTERN -E "$pattern" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --include="*.env*" . 2>/dev/null || true)
    if [ -n "$matches" ]; then
        log_warning "Potential secret found:"
        echo "$matches" | head -10
        SECRETS_FOUND=$((SECRETS_FOUND + 1))
    fi
done

# Check for gitleaks if available
if command -v gitleaks &> /dev/null; then
    log_info "Running gitleaks scan..."
    if gitleaks detect --source . --verbose --redact 2>/dev/null; then
        log_success "✓ Gitleaks scan passed"
    else
        log_error "⚠️  Gitleaks found potential secrets"
        SECRETS_FOUND=$((SECRETS_FOUND + 1))
    fi
else
    log_warning "Gitleaks not installed. Install with: brew install gitleaks"
fi

# Check for hardcoded URLs with credentials
log_info "Checking for hardcoded URLs with credentials..."
if grep -r -n $EXCLUDE_PATTERN -E "https?://[^:]+:[^@]+@" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null; then
    log_critical "⚠️  Hardcoded credentials in URLs found!"
    SECRETS_FOUND=$((SECRETS_FOUND + 1))
else
    log_success "✓ No hardcoded credentials in URLs"
fi

# Check package.json for scripts that might expose secrets
log_info "Checking package.json scripts..."
if [ -f "package.json" ]; then
    if grep -q "PASSWORD\|SECRET\|TOKEN\|KEY" package.json; then
        log_warning "Potential secrets in package.json"
        SECRETS_FOUND=$((SECRETS_FOUND + 1))
    else
        log_success "✓ package.json looks clean"
    fi
fi

# Summary
echo ""
echo "════════════════════════════════════════════════════════════"
if [ $SECRETS_FOUND -eq 0 ]; then
    log_success "✅ SCAN COMPLETE - No secrets found!"
    exit 0
else
    log_error "❌ SCAN COMPLETE - $SECRETS_FOUND potential secret(s) found!"
    echo ""
    echo "Please review and:"
    echo "  1. Remove secrets from code"
    echo "  2. Use environment variables"
    echo "  3. Rotate exposed credentials"
    echo "  4. Consider using git-filter-repo to clean history"
    exit 1
fi
