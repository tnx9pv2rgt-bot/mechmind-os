---
name: apex-qualita-codice
description: Rileva e corregge problemi di qualità nel backend NestJS: N+1 Prisma, HttpException nei service, TypeScript any, tenantId mancante, pagination assente, console.log, process.env diretto. Cascade Static→Haiku→Sonnet→Opus.
allowed-tools: [Bash, Read, Grep, Glob]
effort: low
argument-hint: "[modulo|resume]"
---

# Apex — Qualità Codice

Esegui lo script di revisione qualità codice:

```bash
bash "$HOME/Desktop/apex-scripts/apex-qualita-codice.sh" "/Users/romanogiovanni1993gmail.com/Desktop/Nexo gestionale"
```

Se è stato passato un argomento (modulo specifico o resume), aggiungilo come terzo parametro.

Al termine leggi il report in `~/.mechmind-audit/refactor/refactor-summary.md` e presenta i risultati all'utente.
