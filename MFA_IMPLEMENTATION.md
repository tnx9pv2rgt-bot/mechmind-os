# MechMind OS - MFA/2FA Implementation

Implementazione completa di Multi-Factor Authentication (MFA) con TOTP per MechMind OS.

## 📁 File Creati

### Backend (NestJS)

| File | Descrizione |
|------|-------------|
| `backend/src/auth/mfa/mfa.service.ts` | Servizio TOTP con speakeasy, backup codes, rate limiting |
| `backend/src/auth/mfa/mfa.controller.ts` | Endpoints REST per enroll/verify/disable MFA |
| `backend/src/auth/mfa/dto/mfa.dto.ts` | DTOs per validazione input/output |
| `backend/src/auth/guards/mfa.guard.ts` | Guard per proteggere routes sensibili con MFA |
| `backend/src/auth/services/auth.service.ts` | Modificato per supportare MFA flow |
| `backend/src/auth/auth.module.ts` | Registrato MfaService e MfaController |
| `backend/src/auth/index.ts` | Export dei nuovi moduli MFA |

### Frontend (Next.js)

| File | Descrizione |
|------|-------------|
| `frontend/app/auth/mfa/setup/page.tsx` | Pagina setup 2FA con QR code e backup codes |
| `frontend/app/auth/mfa/verify/page.tsx` | Pagina verifica codice durante login |
| `frontend/components/mfa/QRCodeDisplay.tsx` | Componente display QR code con download/copy |
| `frontend/components/mfa/TOTPInput.tsx` | Input 6 cifre con auto-focus e paste support |
| `frontend/hooks/useMFA.ts` | Hook React per chiamate API MFA |

### Database

| File | Descrizione |
|------|-------------|
| `database/prisma/migrations/add_mfa_fields.sql` | Migration SQL per tabelle MFA |
| `database/prisma/schema.prisma` | Aggiornato con modelli User, UserMFA, MFAAuditLog |

## 🚀 Installazione

### 1. Installare dipendenze

```bash
cd backend
npm install speakeasy qrcode @types/speakeasy @types/qrcode
```

### 2. Eseguire migration database

```bash
cd database
npx prisma migrate dev --name add_mfa_support
# oppure eseguire SQL direttamente:
psql -d mechmind -f prisma/migrations/add_mfa_fields.sql
```

### 3. Generare Prisma Client

```bash
npx prisma generate
```

### 4. Configurare environment variables

Aggiungere al `.env` del backend:

```env
# JWT Secrets per MFA
JWT_2FA_SECRET=your-secure-2fa-secret-min-32-chars
```

## 📡 API Endpoints

### MFA Management (richiede JWT)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/auth/mfa/status` | Stato MFA utente corrente |
| POST | `/auth/mfa/enroll` | Inizia setup MFA (genera secret e QR) |
| POST | `/auth/mfa/verify` | Verifica codice e abilita MFA |
| DELETE | `/auth/mfa/disable` | Disabilita MFA (richiede password + codice) |
| POST | `/auth/mfa/backup-codes` | Genera nuovi backup codes |

### Login con MFA

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/v1/auth/login` | Login con possibile risposta MFA richiesta |
| POST | `/auth/mfa/verify-login` | Completa login con codice MFA |

### Admin (richiede ruolo ADMIN)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/auth/mfa/admin/reset` | Reset MFA per utente (emergency) |
| GET | `/auth/mfa/admin/required-users` | Lista utenti senza MFA |

## 🔐 Flow di Autenticazione

### Login senza MFA
```
POST /v1/auth/login
→ 200 OK + { accessToken, refreshToken, expiresIn }
```

### Login con MFA abilitato
```
POST /v1/auth/login
→ 200 OK + { tempToken, requiresMFA: true, methods: ['totp', 'backup'] }

POST /auth/mfa/verify-login
Body: { tempToken, token: "123456" }
→ 200 OK + { accessToken, refreshToken, expiresIn }
```

### Setup MFA
```
POST /auth/mfa/enroll
→ 201 Created + { secret, qrCode, manualEntryKey, backupCodes }

POST /auth/mfa/verify
Body: { token: "123456" }
→ 200 OK + { message: "MFA enabled" }
```

## 🛡️ Sicurezza

### Rate Limiting
- Max 5 tentativi di verifica MFA ogni 15 minuti
- Blocco account dopo 5 tentativi falliti

### Backup Codes
- 10 codici di backup generati all'enrollment
- Formato: `XXXX-XXXX` (8 caratteri alfanumerici)
- Hashati con bcrypt prima del salvataggio
- Ogni codice funziona una sola volta

### Encryption
- TOTP secret criptato con EncryptionService (AES-256)
- Backup codes hashati con bcrypt

### Time Window
- Window = 1 step (±30 secondi) per time drift
- TOTP step = 30 secondi
- Codice a 6 cifre

## 🧪 Testing

### Test MFA Service
```bash
cd backend
npm test -- mfa.service.spec.ts
```

### Test End-to-End
```bash
# 1. Enroll MFA
curl -X POST http://localhost:3001/auth/mfa/enroll \
  -H "Authorization: Bearer $TOKEN"

# 2. Verify MFA
curl -X POST http://localhost:3001/auth/mfa/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"123456"}'

# 3. Login with MFA
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"xxx","tenantSlug":"garage"}'

# 4. Verify login MFA
curl -X POST http://localhost:3001/auth/mfa/verify-login \
  -H "Content-Type: application/json" \
  -d '{"tempToken":"xxx","token":"123456"}'
```

## 📝 Note

- I backup codes vengono mostrati **solo una volta** durante l'enrollment
- Gli utenti devono salvare i backup codes in un luogo sicuro
- L'admin può resettare MFA in caso di perdita accesso
- MFA è opzionale di default, può essere reso obbligatorio per ruoli specifici
- Compatibile con Google Authenticator, Authy, Microsoft Authenticator, 1Password

## 🔧 Configurazione Auth0 (Opzionale)

Per integrazione con Auth0:
1. Configurare Auth0 MFA nelle settings del tenant
2. Utilizzare il campo `auth0Sub` in TenantUser per collegamento
3. Implementare webhook Auth0 per sincronizzazione MFA status

## 📚 References

- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [speakeasy npm](https://www.npmjs.com/package/speakeasy)
- [Google Authenticator Key URI Format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format)
