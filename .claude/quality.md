# Qualità NASA

paths: "backend/src/**"
Complessità ciclomatica ≤10. Funzioni ≤50 righe. Annidamento ≤3.
Assertion density ≥2 per test. Branch coverage target ≥90%.
Zero `any`, `@ts-ignore`, `@ts-expect-error`. Tutti gli error path espliciti.
Pre-commit: tsc --noEmit, eslint --max-warnings 0, jest --forceExit.
