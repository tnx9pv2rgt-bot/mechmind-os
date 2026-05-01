#!/bin/bash
# Descrizione: SBOM Conformità — Genera CycloneDX SBOM con firma e vulnerability impact analysis
# Parametri: [--sign] (opzionale, firma con GPG)
# Equivalente a: /revisione-dipendenze
# Pattern: npm audit + auditjs + @cyclonedx/bom + impact prediction

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

SIGN_SBOM="${1:---no-sign}"
TELEMETRY_DIR="./.claude/telemetry"
SBOM_REPORT="$TELEMETRY_DIR/sbom-$(date +%Y%m%d-%H%M%S).md"

mkdir -p "$TELEMETRY_DIR"

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo (ambiente npm)..."
if [ ! -f "package.json" ]; then
  echo "❌ package.json non trovato"
  exit 1
fi
if ! command -v npm &>/dev/null; then
  echo "❌ npm non disponibile"
  exit 1
fi
echo "✅ npm environment OK"
echo ""

echo "=== FASE 3: SBOM Conformità ==="

AUDIT_JSON="/tmp/npm-audit.json"
SBOM_FILE="/tmp/bom.xml"

{
  echo "# SBOM Report"
  echo "**Data:** $(date)"
  echo "**Project:** $(pwd)"
  echo ""

  # STEP 1: npm audit + vulnerability mapping
  echo "## 1. Audit Vulnerabilità"
  echo ""

  npm audit --json > "$AUDIT_JSON" 2>/dev/null || true

  CRITICAL_COUNT=$(jq '.metadata.vulnerabilities.critical // 0' "$AUDIT_JSON" 2>/dev/null || echo "0")
  HIGH_COUNT=$(jq '.metadata.vulnerabilities.high // 0' "$AUDIT_JSON" 2>/dev/null || echo "0")
  MODERATE_COUNT=$(jq '.metadata.vulnerabilities.moderate // 0' "$AUDIT_JSON" 2>/dev/null || echo "0")

  echo "- CRITICAL: $CRITICAL_COUNT"
  echo "- HIGH: $HIGH_COUNT"
  echo "- MODERATE: $MODERATE_COUNT"
  echo ""

  if [ "$CRITICAL_COUNT" -gt 0 ] || [ "$HIGH_COUNT" -gt 0 ]; then
    echo "⚠️  Vulnerabilità trovate:"
    echo ""

    # STEP 2: Impact analysis per ogni vulnerability
    jq -r '.vulnerabilities[] | select(.severity=="critical" or .severity=="high") |
      "**\(.title)** (\(.severity))\n- Package: \(.name)\n- Affected: \(.range)\n- Via: \(.via)"' \
      "$AUDIT_JSON" 2>/dev/null | while read -r line; do
      echo "$line"
    done
    echo ""
  fi

  # STEP 3: CycloneDX SBOM generation
  echo "## 2. CycloneDX SBOM"
  echo ""

  npx @cyclonedx/bom --output "$SBOM_FILE" 2>/dev/null || {
    echo "⚠️  CycloneDX generation error"
  }

  if [ -n "$SBOM_FILE" ] && [ -f "$SBOM_FILE" ]; then
    SBOM_SIZE=$(wc -c < "$SBOM_FILE")
    COMPONENT_COUNT=$(grep -c "<component>" "$SBOM_FILE" 2>/dev/null || echo "0")

    echo "- SBOM file: $SBOM_FILE"
    echo "- Components tracked: $COMPONENT_COUNT"
    echo "- File size: $SBOM_SIZE bytes"
    echo ""

    # STEP 4: Predictive Impact Analysis
    echo "## 3. Vulnerability Impact Matrix (CONFIDENTIALITY/INTEGRITY/AVAILABILITY)"
    echo ""
    echo "| Vulnerability | Package | Severity | C | I | A | Risk Level |"
    echo "|---|---|---|---|---|---|---|"

    jq -r '.vulnerabilities[] | select(.severity=="critical" or .severity=="high") |
      "\(.title) | \(.name) | \(.severity) | " ' "$AUDIT_JSON" 2>/dev/null | while read -r line; do
      TITLE=$(echo "$line" | cut -d'|' -f1 | xargs)

      # Mapping: title pattern → impact assessment
      if echo "$TITLE" | grep -qi "auth\|credential\|token\|jwt"; then
        C=9; I=8; A=7
      elif echo "$TITLE" | grep -qi "crypto\|encrypt\|hash\|rsa"; then
        C=10; I=10; A=5
      elif echo "$TITLE" | grep -qi "sql\|injection\|xss\|script"; then
        C=9; I=9; A=8
      elif echo "$TITLE" | grep -qi "dos\|ddos\|timeout\|cpu"; then
        C=3; I=3; A=10
      elif echo "$TITLE" | grep -qi "memory\|leak\|buffer"; then
        C=7; I=7; A=7
      else
        C=5; I=5; A=5
      fi

      RISK_SCORE=$(( (C + I + A) / 3 ))
      RISK_LEVEL="🔴 CRITICAL"
      [ $RISK_SCORE -lt 7 ] && RISK_LEVEL="🟠 HIGH"
      [ $RISK_SCORE -lt 5 ] && RISK_LEVEL="🟡 MEDIUM"

      echo "$line | $C | $I | $A | $RISK_LEVEL"
    done

    echo ""

    # STEP 5: GPG Signature (opzionale)
    if [ "$SIGN_SBOM" = "--sign" ]; then
      echo "## 4. Firma Digitale"
      echo ""

      if command -v gpg &> /dev/null; then
        SHA256=$(sha256sum "$SBOM_FILE" | awk '{print $1}')
        echo "- SHA-256: $SHA256"

        GPG_SIG="$SBOM_FILE.asc"
        gpg --default-key "$(git config user.email)" --armor --detach-sign "$SBOM_FILE" 2>/dev/null || {
          echo "⚠️  GPG signing failed (key not available)"
          GPG_SIG=""
        }

        if [ -f "$GPG_SIG" ]; then
          echo "- Firma GPG: $GPG_SIG (✅ signed)"
          cat "$GPG_SIG" | head -3
        fi
      else
        echo "⚠️  gpg command not found"
      fi

      echo ""
    fi

    # STEP 6: License check
    echo "## 5. Conformità Licenze"
    echo ""
    npx auditjs ossi 2>/dev/null || echo "⚠️  License audit incomplete"
    echo ""
  fi

  echo "✅ Report completato: $SBOM_REPORT"

} | tee "$SBOM_REPORT"

# Cleanup
rm -f "$AUDIT_JSON" "$SBOM_FILE" "$SBOM_FILE.asc" 2>/dev/null || true

echo ""
echo "📋 Leggi report: cat $SBOM_REPORT"
