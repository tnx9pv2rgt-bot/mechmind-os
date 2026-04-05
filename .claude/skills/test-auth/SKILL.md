---
name: test-auth
description: Testa il flusso completo di autenticazione (login, register, logout, me, demo, MFA, passkey)
disable-model-invocation: true
user_invocable: true
---

# Test Auth Flow Completo

Testa OGNI endpoint e flusso auth. Usa file JSON per evitare problemi con caratteri speciali nella shell.

## Setup

Verifica che backend e frontend siano running:
```
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/v1/auth/login
```

## Test da eseguire

### 1. Pagine (tutte devono dare 200)
- GET /auth
- GET /auth/register
- GET /auth/forgot-password
- GET /auth/mfa/verify
- GET /auth/mfa/setup
- GET /auth/magic-link/verify
- GET /demo

### 2. Login corretto
Scrivi il JSON in un file temp per evitare problemi shell:
```
cat > /tmp/test-login.json << 'EOF'
{"email":"admin@demo.mechmind.it","password":"Demo2026!","tenantSlug":"demo"}
EOF
curl -s -c /tmp/test-cookies.txt -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d @/tmp/test-login.json
```
Verifica: `success: true`, cookie `auth_token` presente.

### 3. /api/auth/me con cookie
```
curl -s -b /tmp/test-cookies.txt http://localhost:3000/api/auth/me
```
Verifica: user non null, email corretta.

### 4. Dashboard con cookie
```
curl -s -b /tmp/test-cookies.txt -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard
```

### 5. /api/dashboard con cookie
```
curl -s -b /tmp/test-cookies.txt http://localhost:3000/api/dashboard
```
Verifica: nessun errore "Tenant identifier is required".

### 6. Login sbagliato (atteso 401)
### 7. Tenant inesistente (atteso 401)
### 8. Demo session
```
curl -s -c /tmp/demo-cookies.txt -X POST http://localhost:3000/api/auth/demo-session
curl -s -b /tmp/demo-cookies.txt http://localhost:3000/api/auth/me
```

### 9. Logout
```
curl -s -X POST http://localhost:3000/api/auth/logout -b /tmp/test-cookies.txt
```

### 10. Registrazione (se non in rate limit)
### 11. Passkey register-options
### 12. MFA status

## Output

Presenta i risultati in una tabella:
| # | Test | Atteso | Risultato | Status |
