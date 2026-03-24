---
name: commit-review
description: Pre-commit check completo con tsc, lint, jest, security. Usa prima di ogni commit o quando chiesto check qualità.
allowed-tools: [Read, Grep, Glob, "Bash(git *)", "Bash(npx tsc *)", "Bash(npm run lint*)", "Bash(npx jest *)", "Bash(grep *)"]
---

# Commit Review — Check Completo

Esegui TUTTI i check nell'ordine. Se QUALSIASI fallisce → FIXA prima di committare.

## 1. TypeScript check
```bash
cd backend && npx tsc --noEmit 2>&1 | tail -20
cd frontend && npx tsc --noEmit 2>&1 | tail -20
```
Atteso: 0 errori. Se errori → FIXA.

## 2. Lint
```bash
cd backend && npm run lint 2>&1 | tail -20
```
Atteso: 0 errori. Se errori → FIXA.

## 3. Test
```bash
cd backend && npx jest --forceExit 2>&1 | tail -20
```
Atteso: tutti passano. Se falliscono → FIXA.

## 4. Security grep
```bash
# Secrets hardcoded
grep -rn "password.*=.*['\"]" backend/src/ --include="*.ts" | grep -v configService | grep -v process.env | grep -v ".spec."

# console.log
grep -rn "console\.log" backend/src/ --include="*.ts" | grep -v ".spec.ts" | grep -v logger

# Mock data nel frontend
grep -rn "DEMO_DATA\|MOCK_DATA\|mockCustomers\|mockVehicles\|isDemoMode" frontend/ --include="*.ts" --include="*.tsx"
```
Atteso: 0 risultati. Se risultati → FIXA.

## 5. Git diff review
```bash
git diff --stat
git diff --cached --stat
```
Verifica che i file modificati siano coerenti con il task.

## 6. Commit
```bash
git add <file specifici>
git commit -m "<type>(<scope>): <descrizione>"
```

### Formato conventional commits:
- `feat(<scope>)`: nuova funzionalità
- `fix(<scope>)`: bug fix
- `refactor(<scope>)`: refactoring senza cambio comportamento
- `test(<scope>)`: aggiunta/modifica test
- `docs(<scope>)`: documentazione
- `chore(<scope>)`: manutenzione, dipendenze
