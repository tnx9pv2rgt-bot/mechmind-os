#!/bin/bash
# Esegue fix-coverage.sh su tutti i moduli critici in sequenza
# Uso: bash .claude/scripts/fix-critici.sh
# Stima: ~15-25 min totali (Sonnet default)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$SCRIPT_DIR/../telemetry/fix-critici-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$LOG")"

# Moduli critici in ordine di priorità (dal più scoperto al meno)
MODULI=(
  "inventory-alerts"   # 0% / 0%    — non testato
  "accounting"         # 32.5% / 28% — service quasi vuoto
  "reviews"            # 37.5% / 65% — service quasi vuoto
  "portal"             # 65.8% / 66% — grandi blocchi scoperti
  "peppol"             # 75.8% / 61% — controller a 0%
  "customer"           # 71.5% / 68% — controller scoperto
  "common"             # 50% / 0%   — decorators non testati
  "notifications"      # 74-88% / 63-70% — gateways+services+controllers
  "middleware"         # 89.5% / 80% — appena sotto soglia
)

TOTALE=${#MODULI[@]}
PASSATI=0
FALLITI=0
FALLITI_LISTA=()

echo "╔══════════════════════════════════════════════════════╗"
echo "║  FIX CRITICI — $TOTALE moduli — $(date '+%H:%M %d/%m/%Y')        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Log: $LOG"
echo ""

for i in "${!MODULI[@]}"; do
  m="${MODULI[$i]}"
  n=$((i + 1))
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "[$n/$TOTALE] → $m"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if bash "$SCRIPT_DIR/fix-coverage.sh" "$m" 2>&1 | tee -a "$LOG"; then
    echo ""
    echo "✅ [$n/$TOTALE] $m completato"
    ((PASSATI++))
  else
    echo ""
    echo "❌ [$n/$TOTALE] $m fallito (continuo con il prossimo)"
    ((FALLITI++))
    FALLITI_LISTA+=("$m")
  fi
  echo ""
done

echo "╔══════════════════════════════════════════════════════╗"
echo "║  RIEPILOGO FINALE                                    ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  ✅ Passati:  $PASSATI / $TOTALE"
echo "║  ❌ Falliti:  $FALLITI / $TOTALE"
if [ ${#FALLITI_LISTA[@]} -gt 0 ]; then
  echo "║  Falliti:   ${FALLITI_LISTA[*]}"
fi
echo "║  Log:        $LOG"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Per verificare i risultati reali:"
echo "  cd backend && npx jest --coverage --forceExit --silent 2>/dev/null | grep -E '^\s[a-z]|Statements|Branches'"
