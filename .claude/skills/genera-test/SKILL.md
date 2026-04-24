---
name: genera-test
description: Genera file .spec.ts completo per un service NestJS usando Anthropic SDK con prompt caching (-90% token dalla seconda run). Usa quando chiesto di generare test, creare spec, o aumentare coverage per un modulo specifico.
allowed-tools: ["Bash(node *)","Bash(npx jest *)","Bash(ls *)"]
disable-model-invocation: true
argument-hint: "<modulo>"
---

# Genera Test — Anthropic SDK con Prompt Caching

```bash
#!/usr/bin/env bash
set -uo pipefail

PROJECT_DIR="/Users/romanogiovanni1993gmail.com/Desktop/Nexo gestionale"
SCRIPT="$PROJECT_DIR/scripts/generate-tests.mjs"
ARGS="${SKILL_ARGS:-}"

MODULE=""
for arg in $ARGS; do
  MODULE="$arg"
  break
done

if [ -z "$MODULE" ]; then
  echo "Specifica il modulo. Esempio: /genera-test booking"
  echo ""
  echo "Moduli disponibili:"
  ls "$PROJECT_DIR/backend/src" | grep -v '\.' | sort | xargs -I{} echo "  - {}"
  exit 1
fi

MODULE_DIR="$PROJECT_DIR/backend/src/$MODULE"
if [ ! -d "$MODULE_DIR" ]; then
  echo "Modulo non trovato: $MODULE"
  echo "Moduli disponibili:"
  ls "$PROJECT_DIR/backend/src" | grep -v '\.' | sort | xargs -I{} echo "  - {}"
  exit 1
fi

SERVICE_FILE=$(find "$MODULE_DIR" -name "*.service.ts" ! -name "*.spec.ts" | head -1)
if [ -z "$SERVICE_FILE" ]; then
  echo "Nessun .service.ts trovato in $MODULE_DIR"
  exit 1
fi

SERVICE_BASENAME=$(basename "$SERVICE_FILE" .ts)
SPEC_FILE="${SERVICE_FILE%.ts}.spec.ts"

echo "Modulo   : $MODULE"
echo "Service  : $SERVICE_BASENAME"
echo "Output   : $SPEC_FILE"
echo ""

cd "$PROJECT_DIR"
node "$SCRIPT" "$MODULE" "$SERVICE_BASENAME" > "$SPEC_FILE"

echo ""
echo "File scritto: $SPEC_FILE"
echo ""

echo "Eseguo Jest per verificare..."
cd "$PROJECT_DIR/backend"
JEST_OUTPUT=$(npx jest --testPathPattern="$SERVICE_BASENAME" --forceExit --passWithNoTests --coverage 2>&1)
echo "$JEST_OUTPUT" | tail -20

# Estrai coverage statements e branches dall'output Jest
STMT=$(echo "$JEST_OUTPUT" | grep -E "Statements\s*:" | grep -oE '[0-9]+\.[0-9]+%' | head -1)
BRANCH=$(echo "$JEST_OUTPUT" | grep -E "Branches\s*:" | grep -oE '[0-9]+\.[0-9]+%' | head -1)
STMT=${STMT:-"?%"}
BRANCH=${BRANCH:-"?%"}

# Determina esito
if echo "$JEST_OUTPUT" | grep -q "Tests:.*passed"; then
  ESITO="✅ Testato"
else
  ESITO="⏳ Generato"
fi

# Scrivi log in MODULI_NEXO.md
MODULI_FILE="$PROJECT_DIR/MODULI_NEXO.md"
DATA=$(date '+%Y-%m-%d %H:%M')
RIGA="| \`$DATA\` | backend | \`$MODULE\` | \`$SERVICE_BASENAME\` | $STMT / $BRANCH | $ESITO |"

# Aggiorna riga esistente nel backend se presente, altrimenti appendi al log
if grep -q "| $MODULE |" "$MODULI_FILE" 2>/dev/null; then
  sed -i '' "s|.*| $MODULE |.*|$RIGA|" "$MODULI_FILE" 2>/dev/null || true
fi

# Appendi sempre al log automatico in fondo
echo "$RIGA" >> "$MODULI_FILE"
echo ""
echo "Registrato in MODULI_NEXO.md: $MODULE — $STMT stmt / $BRANCH branch — $ESITO"
```
