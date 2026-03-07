# 🔐 Security Module - Installation Guide

## Quick Start

### 1. Install Dependencies

```bash
cd /Users/romanogiovanni1993gmail.com/Desktop/PROGETTI/Nexo\ gestionale/mechmind-os/frontend
npm install
```

### 2. Configure Environment Variables

Copia il file di esempio e configura le variabili:

```bash
cp .env.security.example .env.local
```

Modifica `.env.local` con i tuoi valori reali:

```bash
# Required
UPSTASH_REDIS_REST_URL=https://your-project.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
SECURITY_ADMIN_TOKEN=$(openssl rand -base64 32)
IP_HASH_PEPPER=$(openssl rand -base64 16)

# Optional but recommended
RECAPTCHA_SECRET_KEY=your-recaptcha-secret
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
SECURITY_SLACK_WEBHOOK=https://hooks.slack.com/services/...
```

### 3. Create Database Table

In Supabase SQL Editor, esegui:

```sql
create table security_audit_log (
  id uuid default gen_random_uuid() primary key,
  type text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  hashed_ip text not null,
  user_agent text,
  user_id uuid references auth.users(id),
  timestamp timestamptz default now(),
  details jsonb default '{}',
  path text,
  method text,
  country text,
  city text,
  session_id text
);

create index idx_audit_type on security_audit_log(type);
create index idx_audit_severity on security_audit_log(severity);
create index idx_audit_timestamp on security_audit_log(timestamp desc);
create index idx_audit_ip on security_audit_log(hashed_ip);
```

### 4. Update Middleware (Optional)

Se vuoi applicare la sicurezza globalmente, aggiorna `middleware.ts`:

```typescript
import { createSecurityMiddleware } from '@/lib/security/middleware'

export const middleware = createSecurityMiddleware({
  rateLimiting: { enabled: true, type: 'apiGeneral' },
  botDetection: { enabled: true, blockThreshold: 70 },
  csrf: { enabled: true, strictOrigin: true },
  ipBlocking: { enabled: true },
})

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*']
}
```

### 5. Test the Installation

```bash
# Start dev server
npm run dev

# Test health endpoint
curl http://localhost:3000/api/security/health

# Test CSRF token generation
curl http://localhost:3000/api/security/csrf/token
```

## File Structure

```
lib/security/
├── index.ts              # Main exports
├── rateLimit.ts          # Redis-based rate limiting
├── botDetection.ts       # Multi-layer bot detection
├── csrf.ts               # CSRF protection
├── sanitization.ts       # Input sanitization
├── audit.ts              # Audit logging
├── middleware.ts         # Next.js middleware integration
├── hooks.ts              # React hooks
└── README.md             # Documentation

app/api/security/
├── csrf/token/route.ts   # CSRF token endpoint
├── health/route.ts       # Security health check
└── audit/route.ts        # Audit log query (admin)

app/api/
├── contact/route.ts      # Example secured endpoint
└── validate/
    └── email/route.ts    # Example with rate limiting

components/security/
├── SecureContactForm.tsx # Example secure form component
└── index.ts              # Component exports

.env.security.example     # Environment template
SECURITY_INSTALL.md       # This file
```

## Features Implemented

| Feature | Status | File |
|---------|--------|------|
| Rate Limiting (Redis) | ✅ | `lib/security/rateLimit.ts` |
| Bot Detection | ✅ | `lib/security/botDetection.ts` |
| CSRF Protection | ✅ | `lib/security/csrf.ts` |
| Input Sanitization | ✅ | `lib/security/sanitization.ts` |
| Security Headers | ✅ | `next.config.js` |
| Audit Logging | ✅ | `lib/security/audit.ts` |
| React Hooks | ✅ | `lib/security/hooks.ts` |
| Middleware Integration | ✅ | `lib/security/middleware.ts` |
| Example Components | ✅ | `components/security/` |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/security/health` | GET | Security status & stats |
| `/api/security/csrf/token` | GET | Generate CSRF token |
| `/api/security/audit` | GET | Query audit logs (admin) |
| `/api/contact` | POST | Example secured form |
| `/api/validate/email` | POST | Rate-limited validation |

## Next Steps

1. **Configura reCAPTCHA** (opzionale ma consigliato)
   - Registra il sito su https://www.google.com/recaptcha/admin
   - Aggiungi le chiavi a `.env.local`

2. **Configura Slack Alerts** (opzionale)
   - Crea webhook su https://api.slack.com/messaging/webhooks
   - Aggiungi URL a `.env.local`

3. **Test di sicurezza**
   ```bash
   # Test rate limiting
   for i in {1..10}; do
     curl -X POST http://localhost:3000/api/contact
   done

   # Test bot detection
   curl -X POST http://localhost:3000/api/contact \
     -H "User-Agent: Bot/1.0" \
     -d '{"name":"test"}'
   ```

4. **Monitoraggio**
   - Controlla `/api/security/health` per lo stato
   - Visualizza audit log in Supabase Dashboard

## Troubleshooting

### Error: "Redis not configured"
- Verifica che `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` siano corretti
- Il modulo funziona anche senza Redis (fallback mode)

### Error: "Invalid CSRF Token"
- Assicurati che il client invii l'header `X-CSRF-Token`
- Usa il hook `useCSRF()` per gestire i token automaticamente

### Rate limiting non funziona
- Verifica la connessione Redis
- Controlla i log per errori di connessione

## Security Best Practices

1. ✅ Mantieni tutte le protezioni attive in produzione
2. ✅ Usa HTTPS (configurato in `next.config.js`)
3. ✅ Ruota regolarmente `SECURITY_ADMIN_TOKEN` e `IP_HASH_PEPPER`
4. ✅ Monitora gli audit log per pattern sospetti
5. ✅ Aggiorna le dipendenze regolarmente
6. ✅ Esegui penetration testing periodico
