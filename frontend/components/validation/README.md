# Validation Engine - Multi-Layer Validation System

Sistema di validazione real-time in stile Stripe per email, Partita IVA e indirizzi.

## Features

### Email Validation (ZeroBounce API)
- ✅ Validazione sintassi locale
- ✅ Verifica deliverability via API
- ✅ Rilevazione email temporanee (disposable)
- ✅ Rilevazione email role-based (info@, admin@, etc.)
- ✅ Suggerimento correzioni typo (gmal.com → gmail.com)
- ✅ Cache Redis 1 ora
- ✅ Rate limiting 10 req/min

### VAT Validation (VIES API)
- ✅ Validazione formato per paese UE
- ✅ Algoritmo Luhn per Partite IVA italiane
- ✅ Verifica real-time via VIES (Agenzia Entrate)
- ✅ Recupero dati azienda (nome, indirizzo)
- ✅ Cache Redis 24 ore
- ✅ Rate limiting 10 req/min

### Address Validation (Google Places)
- ✅ Autocomplete indirizzi
- ✅ Geocoding e reverse geocoding
- ✅ Estrazione componenti (CAP, città, provincia)
- ✅ Cross-validazione CAP-Città
- ✅ Cache Redis 24h (autocomplete) / 30 giorni (dettagli)

## Installation

```bash
# Le dipendenze sono già incluse nel progetto
# - framer-motion (animazioni)
# - lucide-react (icone)
```

## Quick Start

### Email Field

```tsx
import { EmailFieldWithValidation } from '@/components/validation';

function MyForm() {
  const [email, setEmail] = useState('');
  const [validation, setValidation] = useState(null);

  return (
    <EmailFieldWithValidation
      value={email}
      onChange={(value, validation) => {
        setEmail(value);
        setValidation(validation);
      }}
      label="Email"
      required
      allowDisposable={false}  // Blocca email temporanee
      allowRoleBased={false}   // Blocca email di reparto
      debounceMs={300}
    />
  );
}
```

### VAT Field

```tsx
import { VatFieldWithValidation } from '@/components/validation';

function MyForm() {
  const [vat, setVat] = useState('');
  const [companyData, setCompanyData] = useState(null);

  return (
    <VatFieldWithValidation
      value={vat}
      onChange={(value, validation) => setVat(value)}
      onCompanyData={setCompanyData}
      label="Partita IVA"
      countryCode="IT"
      showCompanyData
      required
    />
  );
}
```

### Address Field

```tsx
import { AddressAutocompleteField } from '@/components/validation';

function MyForm() {
  const [address, setAddress] = useState('');
  const [details, setDetails] = useState(null);

  return (
    <AddressAutocompleteField
      value={address}
      onChange={(value, details) => {
        setAddress(value);
        setDetails(details);
      }}
      label="Indirizzo"
      required
      showMapLink
    />
  );
}
```

## API Routes

Le API routes sono disponibili in `/app/api/validate/*`:

- `GET /api/validate/email?email=test@example.com`
- `POST /api/validate/vat` - body: `{ vat: "IT12345678901" }`
- `GET /api/validate/address?input=Via Roma`
- `GET /api/validate/address?placeId=ChIJ...`
- `POST /api/validate/address` - body: `{ postalCode: "00100" }`

## React Hooks

### useEmailValidation

```tsx
import { useEmailValidation } from '@/lib/validation/useValidation';

function MyComponent() {
  const email = useEmailValidation('', {
    debounceMs: 300,
    allowDisposable: false,
    allowRoleBased: false,
    onValidationChange: (result) => console.log(result),
  });

  return (
    <input
      value={email.value}
      onChange={(e) => email.setValue(e.target.value)}
      onBlur={email.validate}
    />
  );
}
```

### useVatValidation

```tsx
import { useVatValidation } from '@/lib/validation/useValidation';

function MyComponent() {
  const vat = useVatValidation('', {
    countryCode: 'IT',
    onCompanyData: (data) => console.log(data),
  });

  return (
    <input
      value={vat.value}
      onChange={(e) => vat.setValue(e.target.value)}
    />
  );
}
```

### useFormValidation (combined)

```tsx
import { useFormValidation } from '@/lib/validation/useValidation';

function MyForm() {
  const form = useFormValidation({
    email: { allowDisposable: false },
    vat: { countryCode: 'IT' },
  });

  const handleSubmit = async () => {
    const isValid = await form.validateAll();
    if (isValid) {
      // Submit form
    }
  };

  return (
    <form>
      <input {...form.email} />
      <input {...form.vat} />
      <button disabled={!form.isValid}>Submit</button>
    </form>
  );
}
```

## Types

```typescript
interface SimplifiedEmailValidation {
  valid: boolean;
  deliverable: 'deliverable' | 'undeliverable' | 'risky' | 'unknown';
  disposable: boolean;
  catch_all: boolean;
  role_based: boolean;
  free: boolean;
  score: number;
  suggestion?: string;
}

interface VATValidationResult {
  valid: boolean;
  companyName?: string;
  address?: string;
  countryCode: string;
  vatNumber: string;
  isValidFormat: boolean;
  luhnValid: boolean;
}

interface AddressDetails {
  street: string;
  number: string;
  city: string;
  postalCode: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}
```

## Environment Variables

Aggiungi al `.env.local`:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend (già configurati)
ZEROBOUNCE_API_KEY=your_key
GOOGLE_PLACES_API_KEY=your_key
REDIS_URL=redis://localhost:6379
```

## Rate Limiting

- **Frontend**: 10 richieste/minuto per IP (in-memory)
- **Backend**: 10 richieste/minuto per IP (condiviso tra tutti i tipi)
- **API esterne**: rispettati i limiti dei provider

## Cache Strategy

| Endpoint | Durata | Storage |
|----------|--------|---------|
| Email validation | 1 ora | Redis |
| VAT validation | 24 ore | Redis |
| Address autocomplete | 24 ore | Redis |
| Address details | 30 giorni | Redis |

## Error Handling

Tutti i componenti implementano fallback graceful:
- Se l'API fallisce, si affida alla validazione locale
- Se il rate limit è superato, mostra errore user-friendly
- In sviluppo senza API key, usa mock data

## Styling

I componenti usano Tailwind CSS con:
- Animazioni Framer Motion per transizioni smooth
- Colori semantici (verde = valido, rosso = errore, giallo = warning)
- Supporto dark mode
- Responsive design

## Component Props

### EmailFieldWithValidation

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | string | - | Valore controllato |
| onChange | (value, validation) => void | - | Callback con risultato validazione |
| label | string | 'Email' | Etichetta campo |
| placeholder | string | 'nome@esempio.com' | Placeholder |
| required | boolean | false | Campo obbligatorio |
| allowDisposable | boolean | false | Permetti email temporanee |
| allowRoleBased | boolean | true | Permetti email di reparto |
| debounceMs | number | 300 | Debounce validation |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Dimensione input |

### VatFieldWithValidation

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | string | - | Valore controllato |
| onChange | (value, validation) => void | - | Callback |
| onCompanyData | (data) => void | - | Callback con dati azienda |
| countryCode | string | 'IT' | Codice paese |
| showCompanyData | boolean | true | Mostra card dati azienda |

### AddressAutocompleteField

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | string | - | Valore controllato |
| onChange | (value, details) => void | - | Callback con dettagli |
| showMapLink | boolean | true | Link a Google Maps |
| country | string | 'it' | Filtro paese |

## Testing

```tsx
// Test email validation
import { validateEmailSyntax, isDisposableDomain } from '@/lib/validation';

test('validates email syntax', () => {
  expect(validateEmailSyntax('test@gmail.com').valid).toBe(true);
  expect(validateEmailSyntax('invalid').valid).toBe(false);
});

// Test VAT validation
import { validateItalianLuhn, isValidVatFormat } from '@/lib/validation';

test('validates Italian VAT', () => {
  expect(validateItalianLuhn('12345678901')).toBe(false);
  expect(validateItalianLuhn('02541230420')).toBe(true);
});
```

## License

MIT - Parte del progetto MechMind OS
