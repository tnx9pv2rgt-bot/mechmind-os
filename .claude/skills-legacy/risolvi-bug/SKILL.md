---
name: ripara-bug
description: Risolve bug con metodo RED-GREEN: riproduci, testa, fixa, verifica.
allowed-tools: [Read, Write, Edit, Grep, Glob, "Bash(npx jest *)", "Bash(npx tsc *)", "Bash(npm run lint*)", "Bash(curl *)", "Bash(cat *)", "Bash(tail *)"]
---

# Fix Bug — Workflow OBBLIGATORIO

## 1. Raccogli evidenze
- MAI indovinare la causa. Leggi il codice, i log, riproduci l'errore.
- Se backend: `curl` l'endpoint e leggi la risposta/stack trace.
- Se frontend: apri la pagina e leggi la console del browser.
- Se test: `npx jest --testPathPattern=<file> --verbose`

## 2. Scrivi test RED
- File: accanto al sorgente (`foo.service.spec.ts`)
- Il test DEVE riprodurre il bug e FALLIRE
- `npx jest --testPathPattern=<file>` → DEVE fallire

## 3. Identifica causa root
- Leggi il codice sorgente coinvolto (Read tool)
- Cerca pattern simili nel codebase (Grep tool)
- Non fixare il sintomo. Fixa la CAUSA.

## 4. Applica fix — Test GREEN
- Modifica minimale. Non refactorare codice non correlato.
- `npx jest --testPathPattern=<file>` → DEVE passare
- TUTTI i test esistenti devono continuare a passare

## 5. Verifica completa
```bash
cd backend && npx tsc --noEmit    # Zero errori TS
cd backend && npm run lint         # Zero errori lint
cd backend && npx jest --forceExit # Tutti i test passano
```

Se backend in esecuzione:
```bash
curl -s http://localhost:3000/v1/<endpoint> -H "Authorization: Bearer $TOKEN"
# DEVE rispondere 200, NON 500
```

## 6. Commit
Formato: `fix(<scope>): descrizione breve del fix`
Esempio: `fix(booking): prevent double-booking on concurrent requests`

## Regole
- MAI fixare il sintomo senza capire la causa
- MAI disabilitare un test che fallisce
- MAI usare `@ts-ignore` per nascondere un errore
- MAI lasciare `console.log` di debug
- Se il fix introduce nuove dipendenze, verificare che siano necessarie
