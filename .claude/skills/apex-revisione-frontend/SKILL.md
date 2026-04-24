---
name: apex-revisione-frontend
description: Revisione completa frontend Next.js. Controlla loading/error/empty states, UI in italiano, dark mode, SWR, react-hook-form+Zod, mock data nelle API route, auth mancante. Cascade Static→Haiku→Sonnet→Opus.
allowed-tools: [Bash, Read, Grep, Glob]
effort: low
argument-hint: "[sezione|resume]"
---

# Apex — Revisione Frontend

Esegui lo script di revisione frontend:

```bash
bash "$HOME/Desktop/apex-scripts/apex-revisione-frontend.sh" "/Users/romanogiovanni1993gmail.com/Desktop/Nexo gestionale"
```

Se è stato passato un argomento (sezione specifica o resume), aggiungilo come terzo parametro.

Al termine leggi il report in `~/.mechmind-audit/frontend/frontend-summary.md` e presenta i risultati all'utente.
