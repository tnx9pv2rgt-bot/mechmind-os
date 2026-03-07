# External Services Integration

Modulo per l'integrazione con servizi esterni di terze parti.

## Servizi Inclusi

### 1. VIES API - Verifica Partita IVA
**File:** `viesApi.ts`

Verifica partite IVA europee tramite il sistema VIES (VAT Information Exchange System).

```typescript
import { ViesApiService } from './services/external';

// Nel controller o service
constructor(private viesService: ViesApiService) {}

async verifyVat() {
  const result = await this.viesService.verifyVatNumber('IT12345678901');
  // { valid: true, companyName: '...', address: '...', requestDate: Date }
}
```

**Features:**
- Cache risultati 30 giorni (Redis)
- Rate limiting 10 req/min
- Fallback mock in development
- Supporto verifica multipla

---

### 2. Google Places API - Autocomplete Indirizzi
**File:** `googlePlaces.ts`

Autocomplete indirizzi, geocoding e reverse geocoding.

```typescript
import { GooglePlacesService } from './services/external';

// Autocomplete
const { predictions } = await this.placesService.autocompleteAddress('Via Roma 1, Milano');

// Dettagli complessi
const details = await this.placesService.getPlaceDetails('ChIJ...');
// { street: 'Via Roma', number: '1', city: 'Milano', postalCode: '20121', ... }

// Geocoding
const coords = await this.placesService.geocodeAddress('Via Roma 1, Milano');

// Reverse geocoding
const addresses = await this.placesService.reverseGeocode(45.4642, 9.1900);
```

**Features:**
- Ottimizzato per indirizzi italiani
- Cache 7 giorni
- Validazione CAP
- Coordinate GPS

**Env:**
```env
GOOGLE_PLACES_API_KEY=your_api_key
```

---

### 3. ZeroBounce - Verifica Email
**File:** `zerobounce.ts`

Verifica email in tempo reale con multiple check.

```typescript
import { ZeroBounceService } from './services/external';

const result = await this.emailService.verifyEmail('test@example.com');
// {
//   email: 'test@example.com',
//   status: 'valid',
//   isValid: true,
//   isDeliverable: true,
//   isDisposable: false,
//   score: 95,
//   ...
// }
```

**Features:**
- Syntax check
- Domain/MX check
- Disposable email detection
- Catch-all detection
- Score 0-100
- Verifica bulk via file

**Env:**
```env
ZEROBOUNCE_API_KEY=your_api_key
```

---

### 4. Twilio - Verifica Telefono
**File:** `twilio.ts`

Validazione numeri, lookup carrier, SMS OTP.

```typescript
import { TwilioService } from './services/external';

// Validazione numero
const validation = await this.phoneService.validatePhoneNumber('+393331234567');
// { valid: true, isMobile: true, carrier: 'TIM', ... }

// Formattazione E.164
const formatted = this.phoneService.formatE164('333 123 4567', 'IT');
// +393331234567

// Invio OTP
await this.phoneService.sendOtp('+393331234567');

// Verifica OTP
const verified = await this.phoneService.verifyOtp('+393331234567', '123456');
```

**Features:**
- Formattazione E.164
- Lookup carrier
- Verifica mobile/landline/VoIP
- SMS OTP con retry
- Cooldown protezione

**Env:**
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid  # opzionale
```

---

## Configurazione

Aggiungi al `.env`:

```env
# Redis (già configurato per altri servizi)
REDIS_URL=redis://localhost:6379

# Google Places
GOOGLE_PLACES_API_KEY=your_key_here

# ZeroBounce
ZEROBOUNCE_API_KEY=your_key_here

# Twilio (già configurato per SMS)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=VA...  # opzionale per Verify API

# Webhooks
SEGMENT_WEBHOOK_SECRET=your_secret
ZAPIER_WEBHOOK_SECRET=your_secret
SLACK_SIGNING_SECRET=your_secret
SLACK_BOT_TOKEN=xoxb-your-token
```

---

## Rate Limiting Redis

**File:** `middleware/redisRateLimiter.ts`

Rate limiting distribuito usando Redis.

```typescript
import { RedisRateLimiterMiddleware, ApplyRateLimit } from '../middleware';

// Come middleware Express
const limiter = createRateLimiter(redisUrl, {
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'ratelimit:api',
});

// Come decorator NestJS
@Controller('api')
@ApplyRateLimit(RedisRateLimiterMiddleware.REGISTRATION_LIMIT)
export class MyController {}
```

**Preset disponibili:**
- `REGISTRATION_LIMIT`: 5 registrazioni/ora per IP
- `VAT_VERIFICATION_LIMIT`: 10 verifiche P.IVA/minuto
- `EMAIL_CHECK_LIMIT`: 20 check email/minuto
- `PHONE_CHECK_LIMIT`: 10 check telefono/minuto
- `LOGIN_LIMIT`: 5 login/15 minuti
- `API_GENERAL_LIMIT`: 100 richieste/minuto

---

## Webhooks

**File:** `webhooks/index.ts`

Endpoint webhook per integrazioni:

### Segment (Analytics)
```typescript
POST /webhooks/segment
X-Signature: sha1=...
```

### Zapier (Automation)
```typescript
POST /webhooks/zapier
X-Zapier-Secret: ...
```

### Slack
```typescript
POST /webhooks/slack/events    # Event subscriptions
POST /webhooks/slack/commands  # Slash commands
```

### CRM (Salesforce/HubSpot/Pipedrive)
```typescript
POST /webhooks/crm/salesforce
POST /webhooks/crm/hubspot
POST /webhooks/crm/pipedrive
```

---

## Installazione Dipendenze

```bash
# Aggiungi dipendenza mancante per VIES
npm install fast-xml-parser

# Le altre dipendenze sono già installate:
# - twilio (già presente)
# - ioredis (già presente)
```

---

## Usage Example

```typescript
import { Module, Controller, Post, Body } from '@nestjs/common';
import { 
  ExternalServicesModule,
  ViesApiService,
  GooglePlacesService,
  ZeroBounceService,
  TwilioService,
} from './services/external';

@Module({
  imports: [ExternalServicesModule],
})
export class AppModule {}

@Controller('verification')
export class VerificationController {
  constructor(
    private viesService: ViesApiService,
    private placesService: GooglePlacesService,
    private emailService: ZeroBounceService,
    private phoneService: TwilioService,
  ) {}

  @Post('vat')
  async verifyVat(@Body('vatNumber') vatNumber: string) {
    return this.viesService.verifyVatNumber(vatNumber);
  }

  @Post('address')
  async searchAddress(@Body('query') query: string) {
    return this.placesService.autocompleteAddress(query);
  }

  @Post('email')
  async verifyEmail(@Body('email') email: string) {
    return this.emailService.verifyEmail(email);
  }

  @Post('phone')
  async verifyPhone(@Body('phone') phone: string) {
    return this.phoneService.validatePhoneNumber(phone);
  }
}
```
