---
name: analizza-bug
description: Analizza log e stack trace per trovare la causa di un bug.
allowed-tools: [Read, Grep, Glob, "Bash(curl *)", "Bash(npx jest *)", "Bash(cat *)", "Bash(tail *)"]
---

# Debug — Metodo Logs-First

## 1. Riproduci
Prima di tutto, RIPRODUCI l'errore.

### Backend
```bash
curl -s http://localhost:3000/v1/<endpoint> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
```

### Frontend
Apri la pagina → Console browser → Network tab

### Test
```bash
npx jest --testPathPattern=<file> --verbose 2>&1
```

## 2. Leggi i log
- Stack trace → punta alla riga esatta
- Error message → descrive il problema
- Status code → categoria errore

## 3. Classifica
| Status | Significato | Dove guardare |
|--------|------------|---------------|
| 500 | Errore server | Stack trace nel log, service code |
| 404 | Endpoint mancante | Controller routes, app.module imports |
| 400 | Validazione fallita | DTO validators, Zod schema |
| 401 | Token invalido | JWT strategy, token expiration |
| 403 | Permessi insufficienti | RolesGuard, tenant isolation |
| 409 | Conflitto | Unique constraints, state machine |

## 4. Isola la causa
- Leggi il codice sorgente della riga indicata nello stack trace
- Cerca pattern simili nel codebase che funzionano
- Verifica input/output di ogni step

## 5. Fixa la CAUSA, non il sintomo
- Un try/catch che nasconde l'errore NON è un fix
- Un `@ts-ignore` NON è un fix
- Un `|| defaultValue` senza capire perché è null NON è un fix

## 6. Verifica
```bash
# Riproduci lo stesso scenario → DEVE funzionare
curl -s http://localhost:3000/v1/<endpoint> ... | jq .status
# DEVE essere 200, NON 500

# Test
npx jest --testPathPattern=<file> --verbose
# DEVE passare
```

## Regole
- MAI indovinare la causa. Leggi i log.
- MAI fixare senza riprodurre prima.
- MAI lasciare `console.log` di debug nel codice.
- Se il fix è nel posto sbagliato (sintomo vs causa) → troveremo lo stesso bug domani.
