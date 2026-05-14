#!/usr/bin/env bash
# DORA Metrics measurement via GitHub API + git log
# Usage: bash dora-measure.sh <owner/repo>
# Output: JSON to stdout
# Requires: gh CLI authenticated, jq, git

set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")}"
if [ -z "$REPO" ]; then
  echo '{"error":"REPO not provided and gh repo view failed"}' >&2
  exit 1
fi

NOW_TS=$(date +%s)
THIRTY_DAYS_AGO=$(date -d "30 days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || \
                  date -v-30d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null)

# ── 1. Deployment Frequency ─────────────────────────────────────────────────
# Count successful deployments to main in last 30 days (via workflow runs or push events)
DEPLOYMENTS=$(gh api \
  "repos/$REPO/actions/runs?branch=main&status=success&per_page=100" \
  --jq "[.workflow_runs[] | select(.created_at >= \"$THIRTY_DAYS_AGO\") | select(.name == \"CI\")] | length" \
  2>/dev/null || echo "0")

DEPLOY_FREQ=$(echo "scale=3; $DEPLOYMENTS / 30" | bc 2>/dev/null || echo "0")

# ── 2. Lead Time for Changes ─────────────────────────────────────────────────
# Median time from first commit on a branch to merge to main (via closed PRs)
LEAD_TIMES_JSON=$(gh api \
  "repos/$REPO/pulls?state=closed&base=main&per_page=50" \
  --jq '[.[] | select(.merged_at != null) | select(.merged_at >= "'"$THIRTY_DAYS_AGO"'") |
        { merged: .merged_at, created: .created_at }]' \
  2>/dev/null || echo "[]")

LEAD_TIME_MEDIAN=$(echo "$LEAD_TIMES_JSON" | python3 -c "
import json, sys
from datetime import datetime
data = json.load(sys.stdin)
if not data:
    print('0')
    sys.exit(0)
hours = []
for pr in data:
    created = datetime.fromisoformat(pr['created'].replace('Z','+00:00'))
    merged  = datetime.fromisoformat(pr['merged'].replace('Z','+00:00'))
    hours.append((merged - created).total_seconds() / 3600)
hours.sort()
n = len(hours)
median = hours[n//2] if n % 2 else (hours[n//2-1] + hours[n//2]) / 2
print(f'{median:.2f}')
" 2>/dev/null || echo "0")

# ── 3. MTTR (Mean Time To Recovery) ──────────────────────────────────────────
# Closed incidents: pairs of [hotfix/fix commit] → next green deploy
# Proxy: PRs with title starting with "fix" or "hotfix" in last 30 days
MTTR_JSON=$(gh api \
  "repos/$REPO/pulls?state=closed&base=main&per_page=100" \
  --jq '[.[] | select(.merged_at != null) | select(.merged_at >= "'"$THIRTY_DAYS_AGO"'") |
        select(.title | test("^(fix|hotfix|revert|incident|bugfix)"; "i")) |
        { merged: .merged_at, created: .created_at }]' \
  2>/dev/null || echo "[]")

MTTR_MEDIAN=$(echo "$MTTR_JSON" | python3 -c "
import json, sys
from datetime import datetime
data = json.load(sys.stdin)
if not data:
    print('0')
    sys.exit(0)
hours = []
for pr in data:
    created = datetime.fromisoformat(pr['created'].replace('Z','+00:00'))
    merged  = datetime.fromisoformat(pr['merged'].replace('Z','+00:00'))
    hours.append((merged - created).total_seconds() / 3600)
hours.sort()
n = len(hours)
median = hours[n//2] if n % 2 else (hours[n//2-1] + hours[n//2]) / 2
print(f'{median:.2f}')
" 2>/dev/null || echo "0")

# ── 4. Change Failure Rate ────────────────────────────────────────────────────
# (fix/hotfix/revert PRs merged) / (total PRs merged) in last 30 days
TOTAL_PRS=$(gh api \
  "repos/$REPO/pulls?state=closed&base=main&per_page=100" \
  --jq '[.[] | select(.merged_at != null) | select(.merged_at >= "'"$THIRTY_DAYS_AGO"'")] | length' \
  2>/dev/null || echo "1")

FIX_PRS=$(echo "$MTTR_JSON" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

CFR=$(python3 -c "
total=$TOTAL_PRS; fixes=$FIX_PRS
if total == 0:
    print('0.0')
else:
    print(f'{fixes/total*100:.1f}')
" 2>/dev/null || echo "0")

# ── Output ────────────────────────────────────────────────────────────────────
python3 -c "
import json
print(json.dumps({
  'repo': '$REPO',
  'measured_at': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
  'window_days': 30,
  'deployments_last_30d': $DEPLOYMENTS,
  'deployment_frequency_per_day': $DEPLOY_FREQ,
  'lead_time_median_hours': $LEAD_TIME_MEDIAN,
  'mttr_median_hours': $MTTR_MEDIAN,
  'change_failure_rate_pct': $CFR,
  'elite_thresholds': {
    'deployment_frequency': 'multiple/day',
    'lead_time_hours': 24,
    'mttr_hours': 1,
    'cfr_pct': 5
  }
}, indent=2))
"
