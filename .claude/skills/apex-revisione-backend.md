# apex-revisione-backend

Esegui la revisione completa del backend NestJS (46 moduli).
Controlla: RLS tenantId, PII non cifrati, auth mancante, CORS wildcard, SQL injection,
console.log, process.env diretto, @ApiTags mancante, TypeScript any, HttpException nei service.
Architettura cascade: Static → Haiku → Sonnet → Opus. Risparmio token: ~97%.

## Utilizzo

```
/apex-revisione-backend              # revisione completa
/apex-revisione-backend booking      # riprendi da un modulo specifico
/apex-revisione-backend --modulo=auth # revisione singolo modulo
```

## Esecuzione

<bash>
#!/usr/bin/env bash
set -uo pipefail

SCRIPT="$HOME/Desktop/apex-scripts/apex-revisione-backend.sh"
PROJECT_DIR="/Users/romanogiovanni1993gmail.com/Desktop/Nexo gestionale"
ARGS="${SKILL_ARGS:-}"

if [ ! -f "$SCRIPT" ]; then
  echo "ERRORE: Script non trovato: $SCRIPT"
  exit 1
fi

chmod +x "$SCRIPT"

RESUME_FROM=""
SINGLE_MODULE=""

for arg in $ARGS; do
  case "$arg" in
    --modulo=*) SINGLE_MODULE="${arg#--modulo=}" ;;
    *) RESUME_FROM="$arg" ;;
  esac
done

if [ -n "$SINGLE_MODULE" ]; then
  echo "Revisione singolo modulo: $SINGLE_MODULE"
  "$SCRIPT" "$PROJECT_DIR" "$SINGLE_MODULE"
elif [ -n "$RESUME_FROM" ]; then
  echo "Riprendo da: $RESUME_FROM"
  "$SCRIPT" "$PROJECT_DIR" "$RESUME_FROM"
else
  echo "Avvio revisione backend completa (46 moduli)..."
  "$SCRIPT" "$PROJECT_DIR"
fi
</bash>

## Output atteso

- `~/.mechmind-audit/audit-summary.md` — riepilogo per modulo
- `~/.mechmind-audit/token-savings.log` — costi reali per modello
- `~/.mechmind-audit/.done-modules.txt` — moduli completati (resume)
- Commit automatici per ogni modulo fixato

## Dipendenze

- bash 5.3+, jq, python3, tiktoken
- gitleaks, semgrep, trivy (SAST opzionali ma attivi)
