# apex-revisione-frontend

Revisione completa di ogni pagina Next.js e API route frontend.
Controlla: loading/error/empty states, UI in italiano, dark mode, touch target 44px,
SWR, react-hook-form+Zod, mock data in route API, proxyToNestJS, auth mancante.
WebSearch verifica completezza contro best practice Next.js 14 aggiornate.

## Utilizzo

```
/apex-revisione-frontend             # revisione completa
/apex-revisione-frontend clienti     # riprendi da una sezione specifica
```

## Esecuzione

<bash>
#!/usr/bin/env bash
set -uo pipefail

SCRIPT="$HOME/Desktop/apex-scripts/apex-revisione-frontend.sh"
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
  echo "Avvio revisione frontend completa..."
  "$SCRIPT" "$PROJECT_DIR"
fi
</bash>

## Output atteso

- `~/.mechmind-audit/frontend/frontend-summary.md` — stato per pagina
- `~/.mechmind-audit/frontend/.done-pages.txt` — pagine completate (resume)
- Fix mirati su pagine e API route (no commit automatico)
