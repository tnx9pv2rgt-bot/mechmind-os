# apex-qualita-codice

Rileva e corregge problemi di qualità nel backend NestJS:
N+1 Prisma, HttpException nei service, TypeScript any, tenantId mancante, pagination assente,
@ApiProperty mancante sui DTO, console.log, process.env diretto, try/catch assente.
NON tocca frontend. NON crea endpoint. NON modifica test esistenti.

## Utilizzo

```
/apex-qualita-codice                 # scansione completa
/apex-qualita-codice clienti         # riprendi da un modulo specifico
```

## Esecuzione

<bash>
#!/usr/bin/env bash
set -uo pipefail

SCRIPT="$HOME/Desktop/apex-scripts/apex-qualita-codice.sh"
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
  echo "Avvio revisione qualità codice..."
  "$SCRIPT" "$PROJECT_DIR"
fi
</bash>

## Output atteso

- `~/.mechmind-audit/refactor/refactor-summary.md` — problemi per modulo
- `~/.mechmind-audit/refactor/.done-modules.txt` — moduli completati (resume)
- Fix mirati su service e DTO (non riscrittura intera)
