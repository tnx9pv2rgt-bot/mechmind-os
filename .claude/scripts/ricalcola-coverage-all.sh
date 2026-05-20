#!/bin/bash
# Descrizione: Ricalcola coverage per TUTTI i moduli e popola MODULI_NEXO.md da zero
# Uso: bash .claude/scripts/ricalcola-coverage-all.sh
# Output: MODULI_NEXO.md con dati reali (Statements%, Branches%)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
DOC="$PROJECT_ROOT/MODULI_NEXO.md"
TMP_REPORT=$(mktemp)

cd "$BACKEND_DIR"

echo "🔄 Ricalcolo coverage per TUTTI i moduli..."
echo ""

# Intestazione documento
{
  echo "# 📊 STATO MODULI NEXO — Report Completo"
  echo ""
  echo "**Data:** $(date '+%d/%m/%Y ore %H:%M')"
  echo "**Standard:** Google 90% exemplary (Statements ≥90% ∧ Branches ≥90%)"
  echo "**Metodo:** Misurazione reale da terminale, zero stime"
  echo ""
  echo "---"
  echo ""
  echo "## 📈 RIEPILOGO GENERALE"
  echo ""
  echo "| Metrica | Valore | Target | Stato |"
  echo "|---------|--------|--------|-------|"
  echo "| **Statements** | Ricalcolando... | ≥90% | ⏳ |"
  echo "| **Branches** | Ricalcolando... | ≥90% | ⏳ |"
  echo ""
  echo "---"
  echo ""
  echo "## 📋 STATO PER MODULO"
  echo ""
  echo "| File | Statements | Branches | Functions | Lines | Stato |"
  echo "|------|-----------|----------|-----------|-------|-------|"
} > "$TMP_REPORT"

# Itera su ogni modulo in src/
TOTAL_STMT=0
TOTAL_BRCH=0
COUNT=0
ABOVE_90=0

for modulo_dir in "$BACKEND_DIR/src"/*; do
  [ -d "$modulo_dir" ] || continue
  modulo=$(basename "$modulo_dir")

  # Skip directories che non sono moduli
  [[ "$modulo" =~ ^(config|_cov|coverage|instrument) ]] && continue

  echo "  → $modulo..."

  # Esegui jest con coverage per questo modulo
  if OUTPUT=$(npx jest "src/$modulo" --coverage --forceExit 2>&1 || true); then
    # Estrai Statements e Branches da output (formato: "Statements   : XX% ( Y/Z )")
    STMT=$(echo "$OUTPUT" | grep -oP 'Statements\s+:\s+\K[0-9.]+(?=%)' | head -1)
    BRCH=$(echo "$OUTPUT" | grep -oP 'Branches\s+:\s+\K[0-9.]+(?=%)' | head -1)
    FUNC=$(echo "$OUTPUT" | grep -oP 'Functions\s+:\s+\K[0-9.]+(?=%)' | head -1)
    LINE=$(echo "$OUTPUT" | grep -oP 'Lines\s+:\s+\K[0-9.]+(?=%)' | head -1)

    # Default se non trovati
    STMT="${STMT:-0}"
    BRCH="${BRCH:-0}"
    FUNC="${FUNC:-0}"
    LINE="${LINE:-0}"

    # Determina stato (🔴 se uno è 0, 🟡 se uno < 90, ✅ se entrambi ≥ 90)
    if awk "BEGIN {exit !($STMT < 1)}" || awk "BEGIN {exit !($BRCH < 1)}"; then
      STATO="🔴"
    elif awk "BEGIN {exit !($STMT < 90 || $BRCH < 90)}"; then
      STATO="🟡"
    else
      STATO="✅"
      ((ABOVE_90++))
    fi

    # Aggiungi riga al report
    echo "| src/$modulo/* | ${STMT}% | ${BRCH}% | ${FUNC}% | ${LINE}% | $STATO |" >> "$TMP_REPORT"

    # Accumula per media
    TOTAL_STMT=$(awk "BEGIN {printf \"%.6f\", $TOTAL_STMT + $STMT}")
    TOTAL_BRCH=$(awk "BEGIN {printf \"%.6f\", $TOTAL_BRCH + $BRCH}")
    ((COUNT++))
  else
    echo "| src/$modulo/* | N/A | N/A | N/A | N/A | ❌ ERR |" >> "$TMP_REPORT"
  fi
done

# Calcola medie
AVG_STMT=$(awk "BEGIN {printf \"%.1f\", $TOTAL_STMT / $COUNT}" 2>/dev/null || echo "0")
AVG_BRCH=$(awk "BEGIN {printf \"%.1f\", $TOTAL_BRCH / $COUNT}" 2>/dev/null || echo "0")

# Aggiorna riepilogo
STMT_ICON=$(awk "BEGIN {exit !($AVG_STMT >= 90)}" && echo "✅" || echo "🔴")
BRCH_ICON=$(awk "BEGIN {exit !($AVG_BRCH >= 90)}" && echo "✅" || echo "🔴")
sed -i.bak "
  /Statements.*Ricalcolando/s/.*/| **Statements** | **${AVG_STMT}%** | ≥90% | ${STMT_ICON} |/
  /Branches.*Ricalcolando/s/.*/| **Branches** | **${AVG_BRCH}%** | ≥90% | ${BRCH_ICON} |/
" "$TMP_REPORT"
rm -f "$TMP_REPORT.bak"

# Aggiungi footer
{
  echo ""
  echo "**Moduli sopra 90/90:** $ABOVE_90 / $COUNT ✅"
  echo ""
  echo "---"
  echo "*Report generato automaticamente · $(date)*"
} >> "$TMP_REPORT"

# Scrivi il documento finale
cp "$TMP_REPORT" "$DOC"
rm -f "$TMP_REPORT"

echo ""
echo "✅ MODULI_NEXO.md generato con dati reali!"
echo "📄 $DOC"
