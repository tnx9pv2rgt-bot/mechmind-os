# apex-generatore-endpoint

Trova endpoint backend mancanti confrontando le API route frontend vs i controller NestJS.
Crea controller method + DTO + service method per ogni gap trovato.
NON tocca frontend. NON refactora logica esistente. NON modifica test.

## Utilizzo

```
/apex-generatore-endpoint            # scansione completa
/apex-generatore-endpoint auth       # riprendi da un modulo specifico
```

## Esecuzione

<bash>
#!/usr/bin/env bash
set -uo pipefail

SCRIPT="$HOME/Desktop/apex-scripts/apex-generatore-endpoint.sh"
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
  echo "Avvio rilevamento endpoint mancanti..."
  "$SCRIPT" "$PROJECT_DIR"
fi
</bash>

## Output atteso

- `~/.mechmind-audit/endpoints/endpoint-summary.md` — gap per route
- `~/.mechmind-audit/endpoints/.done-endpoints.txt` — route completate (resume)
- Nuovi file backend: controller method + DTO + service method
