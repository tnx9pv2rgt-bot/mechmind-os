---
name: revisione
description: Review unificato — code quality, commit check, security OWASP 2025. Usa /revisione --type code|commit|security|all.
allowed-tools: [Read, Grep, Glob, "Bash(git *)", "Bash(npx tsc *)", "Bash(npm run lint*)", "Bash(npx jest *)", "Bash(grep *)"]
disable-model-invocation: true
user-invocable: true
argument-hint: "[--type code|commit|security|all]"
---

# Revisione — Code + Commit + Security (Unificata)

```bash
/revisione --type all       # completo
/revisione --type code      # solo qualità codice
/revisione --type commit    # pre-commit check
/revisione --type security  # OWASP 2025 + GDPR + PCI
```

---

## --type code (Qualità Codice)

### Audit automatico
```bash
git diff --stat && git diff --cached --stat
```

### Sicurezza
- [ ] `tenantId` in ogni query Prisma
- [ ] Webhook con verifica firma
- [ ] PII cifrati con EncryptionService
- [ ] Nessun secret hardcoded
- [ ] JWT con `jti`

### Qualità codice
- [ ] No `any`, no `@ts-ignore`
- [ ] Return type espliciti su funzioni pubbliche
- [ ] Domain exceptions (no HttpException nei service)
- [ ] Nessun `console.log` (usa Logger)
- [ ] Nessun TODO lasciato

### Convenzioni
- [ ] File: `kebab-case`, Classi: `PascalCase`, Metodi: `camelCase`
- [ ] Controller: DTO con `@ApiProperty`, `@ApiTags`, `@ApiBearerAuth`
- [ ] Test: Arrange/Act/Assert, mock PrismaService

### Frontend
- [ ] Testi in italiano
- [ ] Dark mode (`dark:` classes)
- [ ] Toast dopo CRUD (sonner)
- [ ] ConfirmDialog su eliminazioni (Radix AlertDialog)
- [ ] Loading/error/empty states
- [ ] ZERO mock data

---

## --type commit (Pre-Commit Check)

Esegui TUTTI i check nell'ordine. Se QUALSIASI fallisce → FIXA prima di committare.

### 1. TypeScript
```bash
cd backend && npx tsc --noEmit 2>&1 | tail -20
cd frontend && npx tsc --noEmit 2>&1 | tail -20
```

### 2. Lint
```bash
cd backend && npm run lint 2>&1 | tail -20
```

### 3. Test
```bash
cd backend && npx jest --forceExit 2>&1 | tail -20
```

### 4. Security grep
```bash
grep -rn "password.*=.*['\"]" backend/src/ --include="*.ts" | grep -v configService | grep -v process.env | grep -v ".spec."
grep -rn "console\.log" backend/src/ --include="*.ts" | grep -v ".spec.ts" | grep -v logger
grep -rn "DEMO_DATA\|MOCK_DATA\|mockCustomers\|mockVehicles\|isDemoMode" frontend/ --include="*.ts" --include="*.tsx"
```

### 5. Formato commit
```
feat(<scope>): nuova funzionalità
fix(<scope>): bug fix
refactor(<scope>): refactoring senza cambio comportamento
test(<scope>): aggiunta/modifica test
docs(<scope>): documentazione
chore(<scope>): manutenzione, dipendenze
```

---

## --type security (OWASP 2025 + GDPR 2026 + PCI DSS 4.0.1)

### A01 — Broken Access Control
```bash
grep -rn "findMany\|findFirst\|findUnique" backend/src/ --include="*.ts" | grep -v "tenantId" | grep -v ".spec." | grep -v "//.*find"
```
Ogni risultato senza `tenantId` = potenziale data leak. Verifica se child model.

### A02 — Cryptographic Failures
- PII (phone, email, firstName, lastName) → solo via EncryptionService
- JWT → `jti` per revocabilità, token blacklist attiva
- Password → bcrypt (cost ≥12)

### A03 — Injection
- Prisma only (no raw SQL)
- DTOs con class-validator su ogni endpoint
- No template injection, no command injection

### A08 — Data Integrity (Webhook)
```bash
grep -rn "constructEvent\|validateRequest\|verifySignature" backend/src/ --include="*.ts"
```
OGNI handler webhook DEVE verificare firma. Stripe: `constructEvent()`. Twilio: `validateRequest()`.

### A09 — Logging & Monitoring
```bash
grep -rn "console\.log\|console\.error" backend/src/ --include="*.ts" | grep -v ".spec."
```
Solo structured logger. Zero PII nei log.

### A10 — Exception Handling
```bash
grep -rn "catch.*{" backend/src/ --include="*.ts" | grep -v "spec" | grep -v "logger" | head -20
```
Nessun `catch` vuoto. Nessun stack trace esposto in risposta HTTP.

### GDPR 2026
- Data export API: `GET /v1/user/export` implementato?
- Soft deletes attivi (non hard delete su PII)
- Audit log su ogni mutazione

### PCI DSS 4.0.1
- Webhook Stripe: firma verificata (HMAC SHA-256)
- Idempotency key su endpoint pagamento
- Nessun dato carta in log o error message

---

## --type all

Esegue `--type code`, poi `--type commit`, poi `--type security` in sequenza.

---

## Report Finale

```
## BLOCCANTI (0 tolleranza — no merge)
❌ tenantId mancante in X query
❌ webhook senza firma in Y handler

## WARNING (fix consigliato)
⚠️  console.log in 3 file (non spec)
⚠️  ENCRYPTION_KEY non verificato all'avvio

## OK
✅ TypeScript: 0 errori
✅ ESLint: 0 warning
✅ Jest: tutti i test passano
✅ Nessun secret hardcoded
✅ PII cifrati correttamente
```

---

**Last Updated:** 2026-04-25
