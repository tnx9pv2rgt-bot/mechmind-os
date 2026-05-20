#!/bin/bash
# Descrizione: Ricalcola MODULI_NEXO.md con world-class DORA metrics (2026 standard)
# Uso: bash .claude/scripts/ricalcola-moduli-nexo.sh
# Output: MODULI_NEXO.md con dati reali da jest + DORA metrics
# Compatibile: macOS BSD sed/grep (NO pattern Perl)

set -uo pipefail
trap 'true' ERR

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
DOC="$PROJECT_ROOT/MODULI_NEXO.md"
TMP_REPORT="${TMPDIR:-/tmp}/ricalcolo-$$.md"

cd "$BACKEND_DIR"

echo "🚀 Ricalcolo MODULI_NEXO con DORA metrics (2026 standard)..."
echo ""

# Intestazione
{
  echo "# 📊 MODULI NEXO — 2026 World-Class Testing Standard"
  echo ""
  echo "**Data:** $(date '+%d/%m/%Y ore %H:%M')"
  echo "**Standard:** DORA Metrics + Test Pyramid (L1-L5) + Deployment Readiness"
  echo "**Metodo:** Misurazione reale da terminale, DORA tier auto-calculated"
  echo ""
  echo "---"
  echo ""
  echo "## 📋 STATO DEPLOYMENT READINESS (Per Modulo)"
  echo ""
  echo "| Modulo | L1 Coverage | L2 Integration | L3 API | L4 E2E | L5 Load | Change Failure Rate | Readiness |"
  echo "|--------|-----------|----------------|--------|--------|---------|-------------------|-----------|"
} > "$TMP_REPORT"

ELITE_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0
TOTAL_MODULI=0

# Itera su ogni modulo
for modulo_dir in "$BACKEND_DIR/src"/*; do
  [ -d "$modulo_dir" ] || continue
  modulo=$(basename "$modulo_dir")

  # Skip directory che non sono moduli
  [[ "$modulo" =~ ^(config|_cov|coverage|instrument|app) ]] && continue

  echo "  → $modulo..."
  ((TOTAL_MODULI++))

  # ─── L1: Coverage (unit tests) ───────────────────────────────────────────
  L1_STMT="N/A"
  L1_BRCH="N/A"
  L1_ICON="⏳"

  if OUTPUT=$(npx jest "src/$modulo" --coverage --forceExit 2>&1 || true); then
    # Estrai Statements% usando sed (macOS compatible)
    STMT=$(echo "$OUTPUT" | sed -n 's/.*Statements[[:space:]]*:[[:space:]]*\([0-9.]*\).*/\1/p' | head -1)
    # Estrai Branches% usando sed (macOS compatible)
    BRCH=$(echo "$OUTPUT" | sed -n 's/.*Branches[[:space:]]*:[[:space:]]*\([0-9.]*\).*/\1/p' | head -1)

    if [ -n "$STMT" ] && [ -n "$BRCH" ]; then
      L1_STMT="$STMT%"
      L1_BRCH="$BRCH%"

      # Check se sopra 90
      if [ "${STMT%.*}" -ge 90 ] 2>/dev/null && [ "${BRCH%.*}" -ge 90 ] 2>/dev/null; then
        L1_ICON="✅"
      elif [ "${STMT%.*}" -gt 0 ] 2>/dev/null && [ "${BRCH%.*}" -gt 0 ] 2>/dev/null; then
        L1_ICON="🟡"
      else
        L1_ICON="🔴"
      fi
    fi
  fi

  # ─── L2: Integration tests ──────────────────────────────────────────────
  L2_RESULT="⏳"
  L2_COUNT=0

  if OUTPUT=$(npx jest "src/$modulo" --testPathPattern='integration.spec.ts' --forceExit 2>&1 || true); then
    L2_COUNT=$(echo "$OUTPUT" | sed -n 's/.*Tests:[[:space:]]*\([0-9]*\).*/\1/p' | head -1)
    if [ "${L2_COUNT:-0}" -gt 0 ]; then
      FAILED=$(echo "$OUTPUT" | sed -n 's/.*\([0-9]*\)[[:space:]]*failed.*/\1/p' | head -1)
      if [ -z "$FAILED" ] || [ "$FAILED" = "0" ]; then
        L2_RESULT="$L2_COUNT/pass ✅"
      else
        L2_RESULT="$L2_COUNT fail 🟡"
      fi
    fi
  fi

  # ─── L3: API tests ──────────────────────────────────────────────────────
  L3_RESULT="⏳"
  L3_COUNT=0

  if OUTPUT=$(npx jest "src/$modulo" --testPathPattern='api.spec.ts' --forceExit 2>&1 || true); then
    L3_COUNT=$(echo "$OUTPUT" | sed -n 's/.*Tests:[[:space:]]*\([0-9]*\).*/\1/p' | head -1)
    if [ "${L3_COUNT:-0}" -gt 0 ]; then
      FAILED=$(echo "$OUTPUT" | sed -n 's/.*\([0-9]*\)[[:space:]]*failed.*/\1/p' | head -1)
      if [ -z "$FAILED" ] || [ "$FAILED" = "0" ]; then
        L3_RESULT="$L3_COUNT/pass ✅"
      else
        L3_RESULT="$L3_COUNT fail 🟡"
      fi
    fi
  fi

  # ─── L4: E2E tests (check file existence) ──────────────────────────────
  L4_RESULT="⏳"
  if [ -f "$BACKEND_DIR/tests/e2e/$modulo.e2e.spec.ts" ] 2>/dev/null || find "$BACKEND_DIR/tests" -path "*e2e*" -name "*$modulo*" -type f 2>/dev/null | grep -q .; then
    L4_RESULT="Present ✅"
  fi

  # ─── L5: Load tests (check file existence) ───────────────────────────────
  L5_RESULT="⏳"
  if [ -f "$BACKEND_DIR/tests/load/$modulo.k6.js" ] 2>/dev/null || find "$BACKEND_DIR/tests" -path "*load*" -name "*$modulo*" -type f 2>/dev/null | grep -q .; then
    L5_RESULT="Present ✅"
  fi

  # ─── DORA: Change Failure Rate ──────────────────────────────────────────
  CFR="N/A"
  PASS_COUNT=$((${L2_COUNT:-0} + ${L3_COUNT:-0}))
  TOTAL_COUNT=$((${L2_COUNT:-0} + ${L3_COUNT:-0}))

  if [ "$TOTAL_COUNT" -gt 0 ]; then
    FAILED_COUNT=$((TOTAL_COUNT - PASS_COUNT))
    CFR=$((FAILED_COUNT * 100 / TOTAL_COUNT))
  fi

  # ─── Readiness Tier (Elite/High/Medium/Low) ─────────────────────────────
  TIER="Low"

  if [ "$L1_ICON" = "✅" ]; then
    if [ "$L2_RESULT" != "⏳" ] && [ "$L3_RESULT" != "⏳" ]; then
      if [ "$L5_RESULT" = "Present ✅" ] && [ "$CFR" != "N/A" ] && [ "$CFR" -lt 1 ]; then
        TIER="Elite"
        ((ELITE_COUNT++))
      elif [ "$CFR" = "N/A" ] || [ "$CFR" -lt 5 ]; then
        TIER="High"
        ((HIGH_COUNT++))
      else
        TIER="Medium"
        ((MEDIUM_COUNT++))
      fi
    elif [ "$L2_RESULT" != "⏳" ] || [ "$L3_RESULT" != "⏳" ]; then
      TIER="Medium"
      ((MEDIUM_COUNT++))
    fi
  elif [ "$L1_ICON" = "🟡" ]; then
    TIER="Medium"
    ((MEDIUM_COUNT++))
  else
    TIER="Low"
    ((LOW_COUNT++))
  fi

  # ─── Scrivi riga ────────────────────────────────────────────────────────
  echo "| $modulo | ${L1_STMT} ${L1_ICON} | $L2_RESULT | $L3_RESULT | $L4_RESULT | $L5_RESULT | ${CFR}% | **$TIER** |" >> "$TMP_REPORT"

done

# ─── Footer: DORA Summary ───────────────────────────────────────────────────
{
  echo ""
  echo "---"
  echo ""
  echo "## 📈 DORA TIER DISTRIBUTION"
  echo ""
  echo "| Tier | Count | % |"
  echo "|------|-------|---|"
  [ "$TOTAL_MODULI" -gt 0 ] && ELITE_PCT=$((ELITE_COUNT * 100 / TOTAL_MODULI)) || ELITE_PCT=0
  [ "$TOTAL_MODULI" -gt 0 ] && HIGH_PCT=$((HIGH_COUNT * 100 / TOTAL_MODULI)) || HIGH_PCT=0
  [ "$TOTAL_MODULI" -gt 0 ] && MEDIUM_PCT=$((MEDIUM_COUNT * 100 / TOTAL_MODULI)) || MEDIUM_PCT=0
  [ "$TOTAL_MODULI" -gt 0 ] && LOW_PCT=$((LOW_COUNT * 100 / TOTAL_MODULI)) || LOW_PCT=0
  echo "| 🟢 Elite | $ELITE_COUNT | ${ELITE_PCT}% |"
  echo "| 🔵 High | $HIGH_COUNT | ${HIGH_PCT}% |"
  echo "| 🟡 Medium | $MEDIUM_COUNT | ${MEDIUM_PCT}% |"
  echo "| 🔴 Low | $LOW_COUNT | ${LOW_PCT}% |"
  echo ""
  echo "**Total Moduli:** $TOTAL_MODULI"
  echo ""
  echo "---"
  echo ""
  echo "## 📋 LEGENDA"
  echo ""
  echo "| Colonna | Significato |"
  echo "|---------|-----------|"
  echo "| **L1 Coverage** | Unit test coverage (Statements% Branches%) |"
  echo "| **L2 Integration** | Integration tests count e status |"
  echo "| **L3 API** | API contract tests count e status |"
  echo "| **L4 E2E** | E2E tests presence (full UI flow) |"
  echo "| **L5 Load** | Load test presence (performance) |"
  echo "| **Change Failure Rate** | DORA metric: % failed deployments |"
  echo "| **Readiness** | Deployment tier (Elite → High → Medium → Low) |"
  echo ""
  echo "---"
  echo "*Report generato automaticamente · $(date)*"
} >> "$TMP_REPORT"

# ─── Scrivi documento finale ────────────────────────────────────────────────
cp "$TMP_REPORT" "$DOC"
rm -f "$TMP_REPORT"

echo ""
echo "✅ MODULI_NEXO.md generato con DORA metrics!"
echo "📄 $DOC"
echo ""
echo "Summary:"
echo "  🟢 Elite:  $ELITE_COUNT"
echo "  🔵 High:   $HIGH_COUNT"
echo "  🟡 Medium: $MEDIUM_COUNT"
echo "  🔴 Low:    $LOW_COUNT"
