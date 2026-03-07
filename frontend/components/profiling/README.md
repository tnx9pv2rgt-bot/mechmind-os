# Progressive Profiling System

Sistema di profilazione progressiva per MechMind OS con design Apple 2026 Liquid Glass.

## Caratteristiche

- **Progressive Field Collection**: Raccolta graduale dei dati utente in 4 stage
- **Smart Field Prioritization**: Algoritmo intelligente per ordinare i campi da compilare
- **Email Reminder System**: Scheduler integrato per inviare reminder
- **Design Liquid Glass**: UI coerente con il design system Apple 2026

## Architettura

```
frontend/
├── hooks/
│   └── useProgressiveProfiling.ts    # Hook principale
├── components/profiling/
│   ├── profile-completion-banner.tsx # Banner dashboard
│   ├── profile-completion-modal.tsx  # Modal step-by-step
│   └── example-usage.tsx             # Esempi di utilizzo
└── lib/profiling/
    ├── types.ts                      # TypeScript types
    ├── prioritization.ts             # Algoritmi di priorità
    └── scheduler.ts                  # Scheduler reminder
```

## Stadi di Profilazione

| Stage | Campi | Incentive | Trigger |
|-------|-------|-----------|---------|
| `onboarding` | email, password, firstName, lastName | - | signup |
| `week1` | companyName, vat, fiscalCode | 10% sconto | 7 giorni |
| `week2` | address, phone, pec, sdi | Spedizione gratis | 14 giorni |
| `month1` | marketingPrefs, industry | Ebook esclusivo | 30 giorni |

## Utilizzo

### 1. Banner nella Dashboard

```tsx
import { ProfileCompletionBanner } from '@/components/profiling'

function Dashboard() {
  return (
    <>
      <ProfileCompletionBanner
        customerId="cust_123456"
        onComplete={() => console.log('Profilo completato!')}
        dismissable={true}
      />
      {/* ... */}
    </>
  )
}
```

### 2. Modal Step-by-Step

```tsx
import { ProfileCompletionModal } from '@/components/profiling'

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <ProfileCompletionModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      customerId="cust_123456"
      onComplete={() => setIsOpen(false)}
    />
  )
}
```

### 3. Hook Diretto

```tsx
import { useProgressiveProfiling } from '@/hooks'

function CustomComponent() {
  const {
    profile,
    missingFields,
    currentStage,
    completionPercentage,
    updateProfile,
    getNextField,
  } = useProgressiveProfiling({ 
    customerId: 'cust_123456',
    autoFetch: true,
  })

  return (
    <div>
      <p>Completamento: {completionPercentage}%</p>
      <p>Campi mancanti: {missingFields.length}</p>
      <button onClick={() => updateProfile({ phone: '333...' })}>
        Aggiorna
      </button>
    </div>
  )
}
```

## API

### useProgressiveProfiling

| Proprietà | Tipo | Descrizione |
|-----------|------|-------------|
| `profile` | `CustomerProfile` | Dati profilo corrente |
| `missingFields` | `string[]` | Campi mancanti (prioritizzati) |
| `currentStage` | `ProfilingStageId` | Stage attuale |
| `completionPercentage` | `number` | Percentuale completamento |
| `isLoading` | `boolean` | Stato caricamento |
| `checkMissingFields` | `() => Promise<void>` | Ricarica dati |
| `updateProfile` | `(data) => Promise<boolean>` | Aggiorna profilo |
| `getNextField` | `() => string \| null` | Prossimo campo da compilare |
| `getStageIncentive` | `(stage?) => string \| null` | Incentive dello stage |

### Smart Prioritization

Il sistema ordina automaticamente i campi per priorità:

```typescript
// Alta priorità: necessari per ordini
['phone', 'address.street', 'address.city', 'address.zipCode']

// Media priorità: necessari per fatturazione  
['pec', 'sdi', 'companyName', 'vat']

// Bassa priorità: opzionali
['marketingPrefs', 'industry']
```

### Scheduler

```typescript
import { 
  scheduleProfilingReminders,
  cancelAllReminders 
} from '@/lib/profiling/scheduler'

// Schedula tutti i reminder
const jobIds = scheduleProfilingReminders('cust_123456')

// Cancella reminder
cancelAllReminders('cust_123456')
```

## Design System

- **Container**: 900×900px glassmorphism
- **Sfondo**: `bg-white/80 backdrop-blur-3xl`
- **Bordi**: `border-white/50 rounded-[24px]`
- **Ombre**: `shadow-apple-lg`
- **Gradienti**: `from-blue-500 via-purple-500 to-pink-500`

## Integrazione Backend

Per collegare il sistema a un backend reale, modificare le chiamate API in `useProgressiveProfiling.ts`:

```typescript
// Esempio con fetch
const response = await fetch(`/api/customers/${customerId}/profile`)
const data = await response.json()

// Aggiornamento
await fetch(`/api/customers/${customerId}/profile`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(fieldUpdates),
})
```

## Testing

```bash
# Test unitari
npm test -- useProgressiveProfiling

# Test e2e
npm run test:e2e
```
