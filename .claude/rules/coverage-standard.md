---
globs:
  - '**/*.spec.ts'
  - '**/*.test.ts'
  - '**/*.spec.tsx'
  - '**/*.test.tsx'
---

# Coverage Standard

Soglia: Statements ≥90% AND Branches ≥90%. Nessuna eccezione.

Misura SOLO con:

```bash
cd backend && npx c8 --include 'src/<MOD>/**/*.ts' --exclude 'src/<MOD>/**/*.spec.ts' npx jest src/<MOD> --no-coverage --forceExit
```

Log su MODULI_NEXO.md:
`| YYYY-MM-DD HH:MM | backend | <mod> | audit-modulo | X% / Y% | ✅ |`

Mai stime. Solo output terminale. Mai `jest --coverage`.

Ceiling NestJS: max 8pp tollerati per @UseGuards/@Roles IIFE. Gap branches >8pp
= branch logiche non testate, NON ceiling architetturale. Dettagli + esempi:
`docs/test-quality-gates.md`
