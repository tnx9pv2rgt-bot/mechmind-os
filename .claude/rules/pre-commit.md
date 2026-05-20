---
description: Checklist obbligatoria prima di ogni git commit
globs:
  - "**/*"
---
# Pre-Commit Checklist

Prima di ogni commit, verifica:

1. `cd backend && npx tsc --noEmit` — 0 errori TypeScript backend
2. `cd frontend && npx tsc --noEmit` — 0 errori TypeScript frontend
3. `cd backend && npm run lint` — 0 errori ESLint
4. `cd backend && npx jest --forceExit` — tutti i test passano
5. Se backend modificato: `curl` l'endpoint, verifica 200
6. Se frontend modificato: pagina carica senza errori console
7. Se query Prisma aggiunte: `tenantId` presente in ogni `where`
8. Se UI modificata: testi in italiano, dark mode funziona, responsive
9. Se PII toccati: via EncryptionService, mai in chiaro
10. Test per la modifica esiste e passa
