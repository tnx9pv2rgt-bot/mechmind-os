#!/usr/bin/env bash
# Staging parity check — diff .env.production vs .env.staging (keys only, no values)
# Usage: bash .claude/scripts/staging-diff.sh
# Exit code: 0 = parity OK, 1 = gaps found

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROD_ENV="$REPO_ROOT/.env.production"
STAGING_ENV="$REPO_ROOT/.env.staging"
ENV_EXAMPLE="$REPO_ROOT/.env.example"

# ── Helpers ───────────────────────────────────────────────────────────────────
extract_keys() {
  # Extract variable names (before =), skip comments and blank lines
  grep -v '^\s*#' "$1" 2>/dev/null | grep -v '^\s*$' | cut -d'=' -f1 | sort -u
}

# ── Determine reference file ──────────────────────────────────────────────────
if [ -f "$PROD_ENV" ]; then
  REF="$PROD_ENV"
  REF_LABEL=".env.production"
elif [ -f "$ENV_EXAMPLE" ]; then
  REF="$ENV_EXAMPLE"
  REF_LABEL=".env.example"
else
  echo "❌ Neither .env.production nor .env.example found in $REPO_ROOT"
  exit 1
fi

if [ ! -f "$STAGING_ENV" ]; then
  echo "❌ .env.staging not found at $STAGING_ENV"
  echo "   Create it by copying: cp $REF $STAGING_ENV"
  echo "   Then replace production values with staging equivalents."
  exit 1
fi

REF_KEYS=$(extract_keys "$REF")
STAGING_KEYS=$(extract_keys "$STAGING_ENV")

MISSING=$(comm -23 <(echo "$REF_KEYS") <(echo "$STAGING_KEYS"))
EXTRA=$(comm -13 <(echo "$REF_KEYS") <(echo "$STAGING_KEYS"))

GAPS=0

echo "=== Staging Parity Check ==="
echo "Reference : $REF_LABEL"
echo "Staging   : .env.staging"
echo ""

if [ -n "$MISSING" ]; then
  echo "❌ MISSING in .env.staging (present in $REF_LABEL):"
  echo "$MISSING" | sed 's/^/   - /'
  GAPS=1
else
  echo "✅ No missing keys"
fi

if [ -n "$EXTRA" ]; then
  echo ""
  echo "⚠️  EXTRA in .env.staging (not in $REF_LABEL):"
  echo "$EXTRA" | sed 's/^/   + /'
fi

# ── Dangerous production-only vars that must NOT be in staging ────────────────
PROD_ONLY_PATTERNS=("PROD_" "PRODUCTION_" "LIVE_" "STRIPE_LIVE" "STRIPE_SECRET_KEY" "SENDGRID_API_KEY")
LEAKS=()
for pattern in "${PROD_ONLY_PATTERNS[@]}"; do
  hits=$(grep "^${pattern}" "$STAGING_ENV" 2>/dev/null | cut -d'=' -f1 || true)
  [ -n "$hits" ] && LEAKS+=("$hits")
done

if [ ${#LEAKS[@]} -gt 0 ]; then
  echo ""
  echo "🚨 PRODUCTION KEYS DETECTED in .env.staging (security risk!):"
  printf '   %s\n' "${LEAKS[@]}"
  GAPS=1
fi

# ── NODE_ENV check ────────────────────────────────────────────────────────────
STAGING_NODE_ENV=$(grep '^NODE_ENV=' "$STAGING_ENV" 2>/dev/null | cut -d'=' -f2 | tr -d '"' || true)
if [ "$STAGING_NODE_ENV" = "production" ]; then
  echo ""
  echo "❌ NODE_ENV=production in .env.staging — must be 'staging'"
  GAPS=1
elif [ "$STAGING_NODE_ENV" = "staging" ]; then
  echo "✅ NODE_ENV=staging"
else
  echo "⚠️  NODE_ENV='$STAGING_NODE_ENV' — expected 'staging'"
fi

echo ""
if [ "$GAPS" -eq 0 ]; then
  echo "✅ Staging parity: OK"
else
  echo "❌ Staging parity: GAPS FOUND — fix before running staging tests"
fi

exit $GAPS
