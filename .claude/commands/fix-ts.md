Trova e fixa TUTTI gli errori TypeScript:

```bash
echo "=== Backend ==="
cd backend && npx tsc --noEmit --pretty false 2>&1 | grep "error TS"
echo "=== Frontend ==="
cd ../frontend && npx tsc --noEmit --pretty false 2>&1 | grep "error TS"
```

Per OGNI errore: leggi file+riga, comprendi il tipo, fixa correttamente.
MAI `@ts-ignore`. MAI `any`. MAI soppressione.
MAI dire "pre-esistente" o "non correlato".

Ripeti finché ENTRAMBI danno 0 errori.

$ARGUMENTS
