---
name: distribuzione
description: Build, test, e deploy MechMind OS. Usa quando chiesto di deployare, rilasciare, o mettere in produzione.
disable-model-invocation: true
allowed-tools: [Read, Grep, "Bash(git *)", "Bash(npx tsc *)", "Bash(npm run *)", "Bash(npx jest *)", "Bash(npx prisma migrate deploy*)", "Bash(docker *)", "Bash(curl *)", "Bash(render *)"]
---

# Deploy MechMind OS — Workflow Sicuro

## Pre-deploy checklist

Esegui TUTTI i check. Se QUALSIASI fallisce → NON deployare.

### 1. TypeScript check
```bash
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

### 2. Lint
```bash
cd backend && npm run lint
```

### 3. Test
```bash
cd backend && npx jest --forceExit
```

### 4. Build
```bash
cd backend && npm run build
cd frontend && npm run build
```

### 5. Security audit
```bash
# Mock data check
grep -rn "DEMO_DATA\|MOCK_DATA\|mockCustomers\|isDemoMode" frontend/ --include="*.ts" --include="*.tsx"
# Secrets check
grep -rn "password.*=.*['"]" backend/src/ --include="*.ts" | grep -v configService | grep -v process.env | grep -v ".spec."
```
Atteso: 0 risultati.

### 6. Migration status
```bash
cd backend && npx prisma migrate status
```

## Deploy

### Commit e push
```bash
git add -A
git commit -m "deploy: <descrizione>"
git push origin <branch>
```

### Verifica health
```bash
# Attendi 2-3 minuti per il deploy
curl -s https://mechmind-backend.onrender.com/v1/health
```

## Post-deploy
- Verifica health endpoint: 200 OK
- Verifica un endpoint critico (bookings, customers)
- Monitora log per 30 minuti

Vedi `references/deploy-steps.md` per comandi dettagliati per ogni ambiente.
