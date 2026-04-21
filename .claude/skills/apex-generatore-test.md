# apex-generatore-test

Trova service/controller NestJS senza .spec.ts o con copertura insufficiente.
Genera test Jest con mock PrismaService, TenantId, happy path + edge cases + casi di errore.
NON modifica test esistenti. NON tocca frontend. NON crea endpoint.

## Utilizzo

```
/apex-generatore-test                # scansione completa
/apex-generatore-test auth           # riprendi da un modulo specifico
```

## Esecuzione

<bash>
#!/usr/bin/env bash
set -uo pipefail

SCRIPT="$HOME/Desktop/apex-scripts/apex-generatore-test.sh"
PROJECT_DIR="/Users/romanogiovanni1993gmail.com/Desktop/Nexo gestionale"
ARGS="${SKILL_ARGS:-}"

if [ ! -f "$SCRIPT" ]; then
  echo "ERRORE: Script non trovato: $SCRIPT"
  exit 1
fi

chmod +x "$SCRIPT"

RESUME_FROM=""
for arg in $ARGS; do
  RESUME_FROM="$arg"
done

if [ -n "$RESUME_FROM" ]; then
  echo "Riprendo da: $RESUME_FROM"
  "$SCRIPT" "$PROJECT_DIR" "$RESUME_FROM"
else
  echo "Avvio generazione test..."
  "$SCRIPT" "$PROJECT_DIR"
fi
</bash>

## Output atteso

- `~/.mechmind-audit/tests/test-summary.md` — copertura per file
- `~/.mechmind-audit/tests/.done-tests.txt` — file completati (resume)
- Nuovi file `.spec.ts` accanto ai source file
