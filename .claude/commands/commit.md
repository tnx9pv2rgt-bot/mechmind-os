Pre-commit check + commit. Esegui in ordine:

1. `cd backend && npx tsc --noEmit` — 0 errori
2. `cd frontend && npx tsc --noEmit` — 0 errori
3. `cd backend && npm run lint` — 0 errori
4. `cd backend && npx jest --forceExit` — tutti passati

Se QUALSIASI fallisce → fixa, non chiedere.

Se tutti OK:
```bash
git add -A
git diff --cached --stat
```

Poi chiedi conferma messaggio. Formato: `type(scope): descrizione`
Esempi: `feat(booking): add slot check`, `fix(customer): decrypt fallback`

$ARGUMENTS
