---
name: deploy
description: Build, test, and deploy MechMind OS to Render (backend + frontend)
user_invocable: true
---

# Deploy MechMind OS

Esegui il deploy completo di MechMind OS su Render. Segui questi step nell'ordine esatto:

## Pre-flight checks

1. Verifica che non ci siano modifiche non committate:
   ```
   git status
   ```
   Se ci sono, chiedi all'utente se vuole committare prima.

2. Type check backend:
   ```
   cd backend && npx tsc --noEmit
   ```

3. Type check frontend:
   ```
   cd frontend && npx tsc --noEmit
   ```

4. Lint backend:
   ```
   cd backend && npm run lint
   ```

5. Run test backend:
   ```
   cd backend && npm run test -- --passWithNoTests
   ```

Se qualsiasi step fallisce, FERMATI e risolvi prima di procedere.

## Build

6. Build backend:
   ```
   cd backend && npm run build
   ```

7. Build frontend:
   ```
   cd frontend && npm run build
   ```

## Deploy

8. Committa con messaggio chiaro:
   ```
   git add -A && git commit -m "deploy: [descrizione breve]"
   ```

9. Push su main:
   ```
   git push origin main
   ```

10. Verifica deploy su Render:
    ```
    render deploys list srv-d6nb5efgi27c73cbk0bg -o json 2>&1 | head -5
    ```

11. Attendi e verifica che il deploy sia live:
    ```
    curl -s https://mechmind-backend.onrender.com/v1/health
    ```

## Post-deploy

12. Comunica all'utente:
    - Stato del deploy
    - URL backend e frontend
    - Eventuali warning
