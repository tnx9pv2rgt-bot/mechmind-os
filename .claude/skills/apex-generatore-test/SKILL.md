---
name: apex-generatore-test
description: Trova service/controller NestJS senza .spec.ts o con copertura insufficiente. Genera test Jest con mock PrismaService, TenantId, happy path + edge cases + casi di errore. Cascade Static→Haiku→Sonnet→Opus.
allowed-tools: [Bash, Read, Grep, Glob]
---

# Apex — Generatore Test

Esegui lo script di generazione test:

```bash
bash "$HOME/Desktop/apex-scripts/apex-generatore-test.sh" "/Users/romanogiovanni1993gmail.com/Desktop/Nexo gestionale"
```

Se è stato passato un argomento (modulo specifico o resume), aggiungilo come terzo parametro.

Al termine leggi il report in `~/.mechmind-audit/tests/test-summary.md` e presenta i risultati all'utente.
