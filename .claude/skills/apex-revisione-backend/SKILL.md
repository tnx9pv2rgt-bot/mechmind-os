---
name: apex-revisione-backend
description: Revisione completa backend NestJS. Controlla RLS tenantId, PII, auth, CORS, SQL injection, console.log, TypeScript any, HttpException nei service. Cascade Static→Haiku→Sonnet→Opus. Risparmio token ~97%.
allowed-tools: [Bash, Read, Grep, Glob]
effort: low
argument-hint: "[modulo|resume]"
---

# Apex — Revisione Backend

Esegui lo script di revisione backend:

```bash
bash "$HOME/Desktop/apex-scripts/apex-revisione-backend.sh" "/Users/romanogiovanni1993gmail.com/Desktop/Nexo gestionale"
```

Se è stato passato un argomento (modulo specifico o resume), aggiungilo come terzo parametro.

Al termine leggi il report in `~/.mechmind-audit/audit-summary.md` e presenta i risultati all'utente.
