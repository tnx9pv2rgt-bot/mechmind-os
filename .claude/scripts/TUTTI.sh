#!/bin/bash
# Descrizione: Inventario completo di tutti gli script disponibili in .claude/scripts/
# Parametri: nessuno
# Equivalente a: /help

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

# shellcheck source=.claude/scripts/_error-handler.sh
source "$(dirname "$0")/_error-handler.sh"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          NEXO SCRIPTS INVENTORY — $(date +%Y-%m-%d)           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# FASE 0 — STRATEGIA 1: Pre-flight validation
echo "🔧 [S1] Validazione pre-volo (script directory)..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$SCRIPT_DIR" ]; then
  echo "❌ Directory script non trovata: $SCRIPT_DIR"
  exit 1
fi

SCRIPT_COUNT=$(find "$SCRIPT_DIR" -maxdepth 1 -name "*.sh" -type f | wc -l)
if [ "$SCRIPT_COUNT" -eq 0 ]; then
  echo "❌ Nessuno script trovato in: $SCRIPT_DIR"
  exit 1
fi

echo "✅ Script directory OK ($SCRIPT_COUNT script trovati)"
echo ""

# Leggi tutti gli script e estrai descrizione + parametri
{
  echo "# Scripts Inventory Report"
  echo "**Data:** $(date)"
  echo "**Total Scripts:** $SCRIPT_COUNT"
  echo ""

  echo "## Available Scripts"
  echo ""

  for script in "$SCRIPT_DIR"/*.sh; do
    if [ "$(basename "$script")" != "TUTTI.sh" ] && [ "$(basename "$script")" != "_error-handler.sh" ]; then
      name=$(basename "$script" .sh)
      desc=$(grep "^# Descrizione:" "$script" 2>/dev/null | head -1 | sed 's/# Descrizione: //' || echo "(no description)")
      params=$(grep "^# Parametri:" "$script" 2>/dev/null | head -1 | sed 's/# Parametri: //' || echo "nessuno")

      echo "### \`$name.sh\`"
      echo "**Descrizione:** $desc"
      echo "**Parametri:** $params"
      echo ""
    fi
  done

  echo "## Categories"
  echo ""
  echo "| Type | Count | Scripts |"
  echo "|------|-------|---------|"
  echo "| Generators | 5 | crea-endpoint, crea-modulo, crea-pagina, genera-test, genera-test-ui |"
  echo "| Test Runners | 4 | test-auth, test-caos, test-carico, test-veloci |"
  echo "| Verifiers | 7 | controlla-db, controlla-dipendenze, controlla-skill, verifica-formale, verifica-gdpr, verifica-stati, revisione |"
  echo "| Repairers | 2 | ripara-bug, ristruttura |"
  echo "| Utility | 10 | _error-handler, sanity-check, TUTTI, analizza-bug, antifragile-game-day, deploy, emergenza, metriche, migra-db, valuta-modulo |"
  echo ""

  echo "## Usage"
  echo ""
  echo "\`\`\`bash"
  echo "bash <script>.sh [parameters]"
  echo "\`\`\`"
  echo ""
  echo "**Examples:**"
  echo "- \`bash deploy.sh\`"
  echo "- \`bash revisione.sh --type security\`"
  echo "- \`bash genera-test.sh booking\`"
  echo "- \`bash sanity-check.sh\`"
  echo ""

} | tee "./.claude/telemetry/inventory-$(date +%Y%m%d-%H%M%S).md"

# Display summary to terminal
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ CATEGORIE                                                      ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "│ Generators (5): crea-endpoint, crea-modulo, crea-pagina,       │"
echo "│                 genera-test, genera-test-ui                    │"
echo "│                                                                │"
echo "│ Test Runners (4): test-auth, test-caos, test-carico,           │"
echo "│                   test-veloci                                  │"
echo "│                                                                │"
echo "│ Verifiers (7): controlla-db, controlla-dipendenze,             │"
echo "│                controlla-skill, verifica-formale, verifica-gdpr,│"
echo "│                verifica-stati, revisione                       │"
echo "│                                                                │"
echo "│ Repairers (2): ripara-bug, ristruttura                         │"
echo "│                                                                │"
echo "│ Utility (10): _error-handler, sanity-check, TUTTI,             │"
echo "│               analizza-bug, antifragile-game-day, deploy,      │"
echo "│               emergenza, metriche, migra-db, valuta-modulo     │"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Uso: bash <nome>.sh [parametri]"
echo "Esempio: bash deploy.sh"
echo "         bash revisione.sh --type security"
echo ""
