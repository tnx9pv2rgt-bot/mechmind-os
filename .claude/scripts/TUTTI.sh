#!/bin/bash
# INVENTARIO: Lista tutti gli script disponibili con descrizione e parametri
# Uso: bash TUTTI.sh

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          NEXO SCRIPTS INVENTORY — $(date +%Y-%m-%d)           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Leggi tutti gli script e estrai descrizione + parametri
for script in "$SCRIPT_DIR"/*.sh; do
  if [ "$(basename "$script")" != "TUTTI.sh" ]; then
    name=$(basename "$script" .sh)
    desc=$(grep "^# Descrizione:" "$script" | head -1 | sed 's/# Descrizione: //')
    params=$(grep "^# Parametri:" "$script" | head -1 | sed 's/# Parametri: //')
    
    printf "📌 %-25s %s\n" "$name" "$desc"
    [ -n "$params" ] && printf "   Parametri: %s\n" "$params"
    echo ""
  fi
done

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ CATEGORIE                                                      ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "│ PURE_BASH (10): deploy, fix-coverage, migra-db, ristruttura,  │"
echo "│                 controlla-dipendenze, emergenza, test-auth,    │"
echo "│                 test-veloci, valuta-modulo, controlla-skill    │"
echo "│                                                                │"
echo "│ HYBRID (14): analizza-bug, verifica-stati, test-caos,          │"
echo "│             verifica-gdpr, genera-test-ui, genera-test,        │"
echo "│             controlla-db, metriche, crea-pagina, crea-endpoint,│"
echo "│             crea-modulo, revisione (unificato), ripara-bug,    │"
echo "│             test-carico                                        │"
echo "│                                                                │"
echo "│ REFERENCE (8): docs/reference/*                                │"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Uso: bash <nome>.sh [parametri]"
echo "Esempio: bash deploy.sh"
echo "         bash revisione.sh --type security"
echo ""
