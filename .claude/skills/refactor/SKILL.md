---
name: refactor
description: Refactoring sicuro con test. Usa quando chiesto di refactorare, pulire, riorganizzare codice, estrarre funzioni, o ridurre duplicazione.
disable-model-invocation: true
allowed-tools: [Read, Write, Edit, Grep, Glob, "Bash(npx jest *)", "Bash(npx tsc *)", "Bash(npm run lint*)", "Bash(git diff *)"]
---

# Refactor — Workflow Sicuro

## Principio fondamentale
Il refactoring NON cambia il comportamento esterno. Stessi input → stessi output.

## 1. Salva stato test
```bash
cd backend && npx jest --forceExit 2>&1 | tail -5
```
Annota quanti test passano. DEVONO essere gli STESSI dopo il refactoring.

## 2. Identifica pattern da refactorare

### Funzione >50 righe → split
Estrai sotto-funzioni con nomi descrittivi.

### Codice duplicato → utility
Se lo stesso blocco appare 3+ volte, crea una funzione condivisa.

### Switch lungo → mappa
```typescript
// ❌ switch (status) { case 'A': ... case 'B': ... }
// ✅ const handlers: Record<Status, () => void> = { A: ..., B: ... }
```

### Nested if >3 livelli → early return
```typescript
// ❌ if (a) { if (b) { if (c) { ... } } }
// ✅ if (!a) return; if (!b) return; if (!c) return; ...
```

## 3. Applica refactoring
- Modifica minimale e incrementale
- Un commit per tipo di refactoring
- MAI cambiare: endpoint, colonne DB, firme API, comportamento esterno

## 4. Verifica
```bash
cd backend && npx tsc --noEmit     # Zero errori TS
cd backend && npm run lint          # Zero errori lint
cd backend && npx jest --forceExit  # STESSI test passano
```

## 5. Review diff
```bash
git diff --stat
```
Verifica che le modifiche siano coerenti col refactoring richiesto.

## Regole
- MAI aggiungere funzionalità durante un refactoring
- MAI rimuovere test durante un refactoring
- MAI cambiare endpoint o firme API
- Se un test fallisce dopo il refactoring → hai cambiato il comportamento → annulla
- Commit: `refactor(<scope>): descrizione`
