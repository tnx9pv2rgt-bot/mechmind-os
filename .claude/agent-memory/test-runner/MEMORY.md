# test-runner — memoria persistente

## Suite con flake history

_(append: nome-suite | causa | fix | data)_

## Pattern di failure ricorrenti

- Mock senza `Once` → contaminazione tra test (vedi
  `.claude/rules/test-quality-gates.md` STEP6)
- Assertion <2/test → test "non verifica" (STEP5)
- Mancanza `jest.clearAllMocks()` in beforeEach → mock state leak

## Suite più lente (>5s) note

_(append qui)_

## Comandi standard

```bash
cd backend && npx jest src/<modulo> --coverage --forceExit
cd backend && npx jest --testNamePattern="CRITICAL" --forceExit
```

## Lezioni accumulate

_(append-only)_
