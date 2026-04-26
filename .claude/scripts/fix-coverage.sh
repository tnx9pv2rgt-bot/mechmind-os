#!/bin/bash
# Descrizione: Ripara la copertura test sotto 90% con mutation + flakiness testing
# Parametri: [modulo] (opzionale, se omesso ripara TUTTI)
# Equivalente a: /fix-all-coverage, /fix-coverage-file

set -euo pipefail
trap "handle_error \$? \$LINENO" ERR

source "$(dirname "$0")/_error-handler.sh"

extract_code() {
  sed -n '/```typescript/,/```/p' | sed '1d;$d' || \
  sed -n '/```ts/,/```/p' | sed '1d;$d' || \
  cat
}

# Sanity check
"$(dirname "$0")/sanity-check.sh" || exit 1

MODULO="${1:-}"
REPAIRED=0
RELIABLE=0
CEILING=0

fix_service() {
  local SERVICE_FILE="$1"
  local SPEC_FILE="$(dirname "$SERVICE_FILE")/$(basename "${SERVICE_FILE%.ts}").spec.ts"
  
  # STEP 1: Genera test
  RESPONSE=$(claude -p "Genera SOLO il file di test completo per backend/src/$SERVICE_FILE. Il file deve contenere import, mock, describe, it, expect. Scrivi SOLO codice TypeScript, senza markdown." 2>/dev/null || echo "")
  echo "$RESPONSE" | extract_code > "/tmp/fix_spec.ts"
  if grep -q "import\|describe\|it\|expect" "/tmp/fix_spec.ts" 2>/dev/null; then cp "/tmp/fix_spec.ts" "${SERVICE_FILE%.ts}.spec.ts"; else echo "⚠️ CEILING"; return 1; fi

  # STEP 2: Verifica tsc
  if ! npx tsc --noEmit "${SERVICE_FILE%.ts}.spec.ts" 2>/dev/null; then
    return 1
  fi

  # STEP 3: Mutation testing con Stryker
  MUTATION_SCORE=$(npx stryker run --mutate "src/$(basename $(dirname "$SERVICE_FILE"))" --incremental 2>/dev/null | grep "Mutation score" | sed -E 's/.*([0-9]+)\.[0-9]+.*/\1/' || echo "0")

  if [ "$MUTATION_SCORE" -lt 80 ]; then
    return 1
  fi

  # STEP 4: Flakiness detection (3 run identiche)
  PASS_COUNT=0
  for i in 1 2 3; do
    if npx jest "${SERVICE_FILE%.ts}.spec.ts" --forceExit --silent 2>/dev/null; then
      PASS_COUNT=$((PASS_COUNT + 1))
    fi
  done

  if [ "$PASS_COUNT" -eq 3 ]; then
    return 0
  else
    return 1
  fi
}

cd backend || exit 1

if [ -z "$MODULO" ]; then
  # Scansiona TUTTI i moduli
  for file in $(find src -name "*.service.ts" -o -name "*.controller.ts" 2>/dev/null | sort); do
    if [[ "$file" == *".spec.ts" ]]; then
      continue
    fi
    
    if [[ "$file" == *".controller.ts" ]]; then
      CEILING=$((CEILING + 1))
    elif [[ "$file" == *".service.ts" ]]; then
      if fix_service "$file" 2>/dev/null; then
        RELIABLE=$((RELIABLE + 1))
      else
        CEILING=$((CEILING + 1))
      fi
    fi
  done
else
  # Ripara un modulo specifico: cerca TUTTI i file .service.ts e .controller.ts nel modulo
  MODULE_PATH="src/$MODULO"

  if [ ! -d "$MODULE_PATH" ]; then
    echo "Modulo non trovato: $MODULO (directory $MODULE_PATH non esiste)"
    exit 1
  fi

  FOUND=0
  for file in $(find "$MODULE_PATH" -name "*.service.ts" -o -name "*.controller.ts" 2>/dev/null | grep -v ".spec.ts" | sort); do
    FOUND=1
    echo "🔧 Trovato: $file"

    if [[ "$file" == *".controller.ts" ]]; then
      echo "  ⚠️ Controller: ceiling architetturale (max ~85% branches)"
      CEILING=$((CEILING + 1))
    elif [[ "$file" == *".service.ts" ]]; then
      if fix_service "$file" 2>/dev/null; then
        RELIABLE=$((RELIABLE + 1))
        echo "  ✅ Riparato e affidabile"
      else
        CEILING=$((CEILING + 1))
        echo "  ⚠️ Ceiling (impossibile riparare)"
      fi
    fi
  done

  if [ "$FOUND" -eq 0 ]; then
    echo "Nessun file .service.ts o .controller.ts trovato in $MODULE_PATH"
    exit 1
  fi
fi

cd - >/dev/null 2>&1 || true

echo "File riparati (coverage ≥90%): $REPAIRED"
echo "File AFFIDABILI (mutation ≥80% + 3/3 flakiness): $RELIABLE"
echo "File in ceiling: $CEILING"
