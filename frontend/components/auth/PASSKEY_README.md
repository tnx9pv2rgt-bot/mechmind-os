# Passkey / WebAuthn Authentication

Implementazione completa di autenticazione Passkey (WebAuthn) con design Apple 2026 Liquid Glass.

## 📁 File Creati

```
frontend/
├── components/auth/
│   ├── passkey-button.tsx          # Componenti UI Passkey
│   ├── client-auth-flow.tsx        # Esempio flusso completo
│   └── index.ts                    # Esportazioni aggiornate
├── hooks/
│   └── usePasskey.ts               # Hook React per WebAuthn
├── lib/auth/
│   └── webauthn.ts                 # Utility WebAuthn
└── app/api/auth/passkey/
    ├── challenge/route.ts          # POST: Genera challenge
    ├── register/route.ts           # POST: Registra passkey
    ├── authenticate/route.ts       # POST: Verifica autenticazione
    ├── list/route.ts               # GET: Lista passkey utente
    └── [id]/route.ts               # DELETE: Rimuovi passkey
```

## 🎨 Design System

### Liquid Glass Components
- Container: 900×900px glassmorphism
- Stile: `bg-white/80`, `backdrop-blur-3xl`
- Bottoni: `rounded-xl`, gradienti sottili
- Animazioni: Framer Motion con spring physics

### Colori Apple 2026
```css
--apple-blue: #007AFF;
--apple-blue-dark: #0051D5;
--glass-bg: rgba(255, 255, 255, 0.1);
--glass-border: rgba(255, 255, 255, 0.2);
```

## 🚀 Utilizzo Rapido

### 1. Bottone Passkey Semplice

```tsx
import { PasskeyButton } from '@/components/auth/passkey-button'

function LoginPage() {
  return (
    <PasskeyButton
      onSuccess={(data) => console.log('Logged in:', data.user)}
      onError={(err) => console.error('Error:', err)}
    />
  )
}
```

### 2. Selezione Metodo di Autenticazione

```tsx
import { AuthMethodSelector } from '@/components/auth/passkey-button'

function AuthPage() {
  return (
    <AuthMethodSelector
      onPasswordSelect={() => setMethod('password')}
      onPasskeySelect={() => setMethod('passkey')}
      onSuccess={(data) => router.push('/dashboard')}
    />
  )
}
```

### 3. Setup Passkey dopo Registrazione

```tsx
import { PasskeyRegistrationButton } from '@/components/auth/passkey-button'

function PostRegistrationPage({ userId, email }) {
  return (
    <PasskeyRegistrationButton
      userId={userId}
      email={email}
      onSkip={() => router.push('/dashboard')}
      onRegisterSuccess={() => router.push('/dashboard')}
    />
  )
}
```

### 4. Hook Personalizzato

```tsx
import { usePasskey } from '@/hooks/usePasskey'

function CustomAuth() {
  const {
    isSupported,
    isPlatformAvailable,
    isLoading,
    register,
    authenticate,
    error,
    clearError,
  } = usePasskey({
    onSuccess: (data) => console.log('Success:', data),
    onError: (err) => console.error('Error:', err),
  })

  return (
    <div>
      {isSupported ? (
        <button onClick={() => authenticate()}>
          Accedi con Passkey
        </button>
      ) : (
        <p>Passkey non supportato</p>
      )}
    </div>
  )
}
```

## 🔧 API Endpoints

### Registrazione

```typescript
// 1. Richiedi challenge
POST /api/auth/passkey/challenge
Body: { type: 'registration' }
Response: { challenge: string }

// 2. Registra passkey
POST /api/auth/passkey/register
Body: {
  credentialId: string,
  clientDataJSON: string,
  attestationObject: string,
  metadata?: { deviceName: string, platform: string }
}
```

### Autenticazione

```typescript
// 1. Richiedi challenge
POST /api/auth/passkey/challenge
Body: { type: 'authentication' }
Response: { challenge: string }

// 2. Verifica passkey
POST /api/auth/passkey/authenticate
Body: {
  credentialId: string,
  clientDataJSON: string,
  authenticatorData: string,
  signature: string,
  userHandle?: string
}
Response: { success: true, token: string, user: User }
```

### Gestione

```typescript
// Lista passkey
GET /api/auth/passkey/list
Response: Array<{ id, credentialId, deviceName, createdAt, lastUsedAt }>

// Rimuovi passkey
DELETE /api/auth/passkey/:credentialId
```

## 🛡️ Sicurezza

### Feature Detection
- Verifica supporto WebAuthn prima di mostrare UI
- Fallback automatico a password se passkey non disponibile

### Protezioni Implementate
- **Challenge**: 32 byte random (256 bit)
- **Scadenza**: 5 minuti per ogni challenge
- **Counter**: Verifica replay attacks
- **Origin validation**: Dominio verificato
- **User verification**: Richiesto (Face ID/Touch ID/PIN)

### Browser Support
- ✅ Safari (iOS 16+, macOS Ventura+)
- ✅ Chrome (Android, Windows, macOS)
- ✅ Edge (Windows)
- ❌ Firefox (supporto parziale)

## 🔄 Flusso Completo

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Metodo    │────▶│  Passkey?   │────▶│   Face ID   │
│  Selezione  │     │             │     │   Auth      │
└─────────────┘     └──────┬──────┘     └─────────────┘
       │                   │
       │ No                │ Fallisce
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│   Password  │◀────│   Fallback  │
│    Form     │     │   Password  │
└─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│   Setup     │
│   Passkey   │ (opzionale)
└─────────────┘
```

## 📱 Piattaforme

### iOS/macOS
- Face ID (iPhone X+, iPad Pro)
- Touch ID (iPhone 8, MacBook Pro, Magic Keyboard)
- Optic ID (Apple Vision Pro)

### Android
- Fingerprint API
- Face Recognition
- StrongBox (hardware security)

### Windows
- Windows Hello
- PIN
- FIDO2 Security Keys

## 🎨 Personalizzazione

### Varianti Bottone

```tsx
<PasskeyButton variant="primary" />   // Gradiente blu (default)
<PasskeyButton variant="secondary" /> // Bianco con bordo
<PasskeyButton variant="glass" />     // Trasparente glass
<PasskeyButton variant="minimal" />   // Solo testo
```

### Dimensioni

```tsx
<PasskeyButton size="sm" />  // h-11, text-sm
<PasskeyButton size="md" />  // h-14, text-base (default)
<PasskeyButton size="lg" />  // h-16, text-lg
```

## 🔧 Configurazione Backend (Produzione)

Per una implementazione completa, installa:

```bash
npm install @simplewebauthn/server
```

E sostituisci i mock con:

```typescript
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
```

## 🧪 Testing

```bash
# Test manuale
1. Apri Safari/Chrome su iOS
2. Vai alla pagina di login
3. Tocca "Accedi con Face ID"
4. Autenticati con Face ID

# Test fallback
1. Disabilita Face ID nelle impostazioni
2. Ricarica la pagina
3. Verifica che appaia il form password
```

## 📚 Risorse

- [WebAuthn Spec](https://www.w3.org/TR/webauthn-2/)
- [Apple Passkeys](https://developer.apple.com/passkeys/)
- [SimpleWebAuthn](https://simplewebauthn.dev/)
- [Can I Use - WebAuthn](https://caniuse.com/webauthn)

## 📝 Note

- I passkey sono sincronizzati via iCloud Keychain (Apple) o Google Password Manager (Android)
- Non memorizzare mai la private key sul server
- Usa sempre HTTPS in produzione
- Implementa rate limiting sugli endpoint
