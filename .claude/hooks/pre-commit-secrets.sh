#!/bin/bash
# Pre-commit: scan staged diff for secrets (gitleaks) + verified live creds (trufflehog)
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"

# Gate 1: gitleaks (fast, pattern-based) — scan staged files
if command -v gitleaks &>/dev/null; then
  gitleaks protect --staged --redact --exit-code 1 2>/dev/null && echo "✅ gitleaks: no secrets" || {
    echo "❌ SECRETS FOUND by gitleaks — commit blocked. Run: gitleaks protect --staged --verbose"
    exit 1
  }
else
  echo "⚠️ gitleaks not installed — skipping fast scan (brew install gitleaks)"
fi

# Gate 2: trufflehog (verified live credentials) — scan uncommitted diff
if command -v trufflehog &>/dev/null; then
  trufflehog git "file://$REPO_ROOT" --since-commit HEAD --only-verified --json 2>/dev/null | \
    python3 -c "import sys,json; data=sys.stdin.read().strip(); lines=[l for l in data.splitlines() if l.strip()]; print(len(lines))" | \
    xargs -I{} bash -c '[ "{}" -eq 0 ] && echo "✅ trufflehog: no verified secrets" || { echo "❌ VERIFIED LIVE SECRETS found — commit blocked"; exit 1; }'
else
  echo "⚠️ trufflehog not installed — skipping verification (brew install trufflehog)"
fi

exit 0
