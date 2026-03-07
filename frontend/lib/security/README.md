# Security Module - Cloudflare-style Enterprise Protection

Questo modulo fornisce protezione enterprise-grade per l'applicazione Next.js, ispirata alle funzionalità di sicurezza di Cloudflare.

## 🛡️ Features

### 1. Rate Limiting Multi-Layer (Redis)
- **Distribuito**: Utilizza Upstash Redis per rate limiting globale
- **Multi-livello**: Diversi limiti per diversi tipi di endpoint
- **Tipi configurati**:
  - `formSubmit`: 5 richieste/ora (form di contatto)
  - `emailValidation`: 10 richieste/minuto
  - `vatVerification`: 10 richieste/minuto
  - `geoLookup`: 100 richieste/giorno
  - `apiGeneral`: 100 richieste/minuto
  - `authAttempt`: 5 tentativi/15 minuti
  - `passwordReset`: 3 richieste/ora

### 2. Bot Detection
- **Multi-layer scoring**: Sistema di punteggio 0-100
- **Analisi User-Agent**: Rilevamento pattern sospetti
- **Analisi Headers**: Controllo header mancanti/sospetti
- **Timing Analysis**: Rilevamento compilazione troppo veloce
- **Honeypot Fields**: Campi nascosti per trappola bot
- **reCAPTCHA v3**: Integrazione invisibile
- **Fingerprinting**: Tracciamento fingerprint noti

### 3. CSRF Protection
- **Double-submit cookie**: Pattern sicuro e standard
- **Origin validation**: Verifica origine richiesta
- **Token-based**: Token crittografici sicuri
- **Timing-safe comparison**: Protezione da timing attacks

### 4. Input Sanitization
- **DOMPurify**: Sanitizzazione HTML completa
- **SQL Injection Detection**: Pattern matching avanzato
- **NoSQL Injection Detection**: Protezione MongoDB/NoSQL
- **XSS Prevention**: Rimozione script pericolosi
- **Path Traversal Detection**: Protezione file system
- **Command Injection Detection**: Protezione da injection

### 5. Security Headers
- **Content Security Policy**: CSP strict
- **X-Frame-Options**: Anti-clickjacking
- **X-Content-Type-Options**: Anti-MIME sniffing
- **HSTS**: HTTPS enforcement
- **Referrer Policy**: Privacy protection
- **Permissions Policy**: Feature policy restriction

### 6. Audit Logging
- **Privacy-preserving**: Hash degli IP (GDPR compliant)
- **Multi-destination**: Console, Database, Slack, Sentry
- **Severity levels**: low, medium, high, critical
- **Alerting automatico**: Notifiche per eventi critici
- **Batching**: Performance-optimized logging

## 📦 Installation

```bash
npm install @upstash/ratelimit @upstash/redis isomorphic-dompurify
```

## 🔧 Configurazione

Aggiungi le seguenti variabili d'ambiente al tuo `.env.local`:

```bash
# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# reCAPTCHA v3
RECAPTCHA_SECRET_KEY=your-secret-key
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key

# Security Admin Token (per API di monitoraggio)
SECURITY_ADMIN_TOKEN=your-secure-random-token

# IP Hash Pepper (cambia in produzione!)
IP_HASH_PEPPER=your-secret-pepper-for-ip-hashing

# Slack Webhook (opzionale)
SECURITY_SLACK_WEBHOOK=https://hooks.slack.com/services/...

# Supabase (già configurato)
NEXT_PUBLIC_SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-key
```

## 🚀 Utilizzo

### 1. Rate Limiting nelle API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/security'

export async function POST(request: NextRequest) {
  // Applica rate limiting
  const rateLimitResult = await rateLimitMiddleware(request, 'formSubmit')
  if (rateLimitResult) return rateLimitResult
  
  // Continua con la logica...
}
```

### 2. Bot Detection

```typescript
import { detectBot } from '@/lib/security'

const result = await detectBot(request, {
  checkRecaptcha: true,
  recaptchaToken: body.recaptchaToken,
  body,
})

if (result.isBot) {
  return new Response('Bot detected', { status: 403 })
}
```

### 3. CSRF Protection

```typescript
import { csrfProtection, createCSRFToken } from '@/lib/security'

// Genera token (GET)
const token = await createCSRFToken()

// Verifica token (POST)
const csrfResult = await csrfProtection(request)
if (csrfResult) return csrfResult
```

### 4. React Hooks

```typescript
import { useCSRF, useFormProtection, HoneypotField } from '@/lib/security/hooks'

function ContactForm() {
  const { token, getHeaders } = useCSRF()
  const { startProtection, getProtectionData } = useFormProtection({
    minFillTime: 3000,
    enableHoneypot: true,
  })
  
  useEffect(() => {
    startProtection()
  }, [])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    const protectionData = getProtectionData()
    
    await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders(),
      },
      body: JSON.stringify({
        ...formData,
        ...protectionData,
      }),
    })
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <HoneypotField name="website_field" />
      {/* form fields */}
    </form>
  )
}
```

### 5. Middleware Integration

```typescript
// middleware.ts
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

### 6. Input Sanitization

```typescript
import { sanitizeInput, sanitizeEmail, securityCheck } from '@/lib/security'

const cleanName = sanitizeInput(rawName, { maxLength: 100 })
const cleanEmail = sanitizeEmail(rawEmail)

// Security check
const check = securityCheck(userInput)
if (!check.isValid) {
  console.error('Threats detected:', check.threats)
}
```

## 📊 Monitoraggio

### Health Check
```bash
curl http://localhost:3000/api/security/health
```

### Audit Logs (Admin)
```bash
curl -H "Authorization: Bearer $SECURITY_ADMIN_TOKEN" \
  "http://localhost:3000/api/security/audit?severity=high&limit=50"
```

## 🧪 Testing

Esempio di test per verificare la protezione:

```typescript
// Test rate limiting
for (let i = 0; i < 10; i++) {
  await fetch('/api/contact', { method: 'POST' })
}
// Dopo 5 richieste dovrebbe restituire 429

// Test bot detection
await fetch('/api/contact', {
  method: 'POST',
  headers: {
    'User-Agent': 'Bot/1.0'
  },
  body: JSON.stringify({ name: 'test' })
})
// Dovrebbe restituire 403
```

## 🔒 Best Practices

1. **Non disabilitare in produzione**: Mantieni sempre tutte le protezioni attive
2. **Monitora gli alert**: Configura notifiche per eventi critici
3. **Aggiorna regolarmente**: Mantieni le dipendenze aggiornate
4. **Testa periodicamente**: Verifica che le protezioni funzionino
5. **Logga tutto**: Mantieni audit log per compliance

## 📝 Database Schema

Crea la tabella per gli audit log in Supabase:

```sql
create table security_audit_log (
  id uuid default gen_random_uuid() primary key,
  type text not null,
  severity text not null,
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

-- Indici per query performanti
create index idx_audit_type on security_audit_log(type);
create index idx_audit_severity on security_audit_log(severity);
create index idx_audit_timestamp on security_audit_log(timestamp);
create index idx_audit_ip on security_audit_log(hashed_ip);
```

## 🔗 Riferimenti

- [Upstash Rate Limit](https://github.com/upstash/ratelimit)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [OWASP Cheat Sheet](https://cheatsheetseries.owasp.org/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
