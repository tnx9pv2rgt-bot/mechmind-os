---
name: apex-generatore-endpoint
description: Trova endpoint backend mancanti confrontando API route frontend vs controller NestJS. Crea controller method + DTO + service method per ogni gap trovato. Cascade Static→Haiku→Sonnet→Opus.
allowed-tools: [Bash, Read, Grep, Glob]
---

# Apex — Generatore Endpoint

Esegui lo script di rilevamento endpoint mancanti:

```bash
bash "$HOME/Desktop/apex-scripts/apex-generatore-endpoint.sh" "/Users/romanogiovanni1993gmail.com/Desktop/Nexo gestionale"
```

Se è stato passato un argomento (modulo specifico o resume), aggiungilo come terzo parametro.

Al termine leggi il report in `~/.mechmind-audit/endpoints/endpoint-summary.md` e presenta i risultati all'utente.
