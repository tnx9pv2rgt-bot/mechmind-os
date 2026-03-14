## Summary

<!-- Brief description of changes -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Enhancement to existing feature
- [ ] Refactoring (no functional changes)
- [ ] Documentation
- [ ] Infrastructure / CI/CD

## Checklist

### Required

- [ ] Build verde (`npm run build`)
- [ ] Test coverage >= 95% sui service modificati (`npm run test:cov`)
- [ ] Zero errori ESLint (`npm run lint`)
- [ ] Nessun `any` esplicito introdotto
- [ ] Return type espliciti su metodi pubblici

### CLAUDE.md 6 Domande

- [ ] Cosa stai per fare?
- [ ] Quali file modifichi?
- [ ] Cosa rischi di rompere?
- [ ] C'e un modo piu sicuro?
- [ ] Come si torna indietro?
- [ ] Hai tutto il contesto necessario?

### Security (se applicabile)

- [ ] PII crittografata tramite EncryptionService
- [ ] `tenantId` presente su tutte le query
- [ ] Nessun raw SQL (solo Prisma)
- [ ] Input validati con class-validator DTO
- [ ] Nessun PII nei log

### Database (se applicabile)

- [ ] Migrazione Prisma creata e testata
- [ ] RLS policy aggiornata se nuovo modello
- [ ] Soft delete con `deletedAt` per dati personali
- [ ] Audit log su mutazioni

## Test Plan

<!-- Come verificare che le modifiche funzionano -->

- [ ] Unit test aggiunti/aggiornati
- [ ] Test manuali eseguiti
