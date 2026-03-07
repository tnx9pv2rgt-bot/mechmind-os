# Sistema di Persistenza Form

Sistema completo di persistenza e UX recovery per form multi-step in React/Next.js.

## Caratteristiche

- ✅ **Auto-save** ogni 30 secondi (configurabile)
- ✅ **Save on blur** quando l'utente lascia un campo
- ✅ **Ripristino dati** all'apertura della pagina
- ✅ **Exit intent detection** quando l'utente sta per abbandonare
- ✅ **Browser crash recovery** (beforeunload, visibilitychange, pagehide)
- ✅ **Supporto offline** con coda delle richieste
- ✅ **Multi-session** (cross-tab e cross-device)
- ✅ **Scadenza dati** configurabile (default: 7 giorni)
- ✅ **TypeScript** pienamente tipizzato

## Installazione

I componenti sono già integrati nel progetto. Importa gli hook e i componenti necessari:

```tsx
import { useFormPersistence, useExitIntent, useOfflineQueue, useFormSession } from '@/hooks/form-persistence';
import { FormPersistenceWrapper } from '@/components/form-persistence';
```

## Utilizzo Rapido

### Metodo 1: Wrapper Completo (Consigliato)

```tsx
import { FormPersistenceWrapper } from '@/components/form-persistence';

function MyForm() {
  const form = useForm<FormData>();
  const [currentStep, setCurrentStep] = useState(1);
  
  return (
    <FormPersistenceWrapper
      form={form}
      formId="my-form-v1"
      totalSteps={5}
      currentStep={currentStep}
      setCurrentStep={setCurrentStep}
      onRestore={(step, data) => {
        console.log('Ripristinato dallo step:', step);
      }}
    >
      {/* Il tuo form qui */}
    </FormPersistenceWrapper>
  );
}
```

### Metodo 2: Hooks Individuali

```tsx
import { useFormPersistence, useExitIntent, useOfflineQueue, useFormSession } from '@/hooks/form-persistence';

function MyForm() {
  const form = useForm<FormData>();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Persistenza
  const persistence = useFormPersistence(form, {
    formId: 'my-form-v1',
    version: 1,
    expirationDays: 7,
    onRestore: (data) => setCurrentStep(data.currentStep),
  });
  
  // Exit intent
  const exitIntent = useExitIntent({
    onExitIntent: () => setShowModal(true),
  });
  
  // Offline queue
  const offline = useOfflineQueue();
  
  // Sessione
  const session = useFormSession({
    formId: 'my-form-v1',
    enableCrossTabSync: true,
  });
  
  return (
    <>
      {/* UI Components */}
      <FormResumeBanner {...persistence} />
      <OfflineIndicator {...offline} />
      <DataRestoreModal {...persistence} />
      <ExitIntentModal 
        exitIntent={exitIntent}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
      <SessionTakeoverModal {...session} />
      
      {/* Form */}
      <form>...</form>
    </>
  );
}
```

## API Reference

### useFormPersistence

Hook principale per la persistenza dei dati del form.

```typescript
const persistence = useFormPersistence(form, {
  formId: 'unique-form-id',      // Richiesto: ID univoco del form
  version: 1,                     // Versione dello schema
  expirationDays: 7,              // Giorni prima della scadenza
  autoSaveInterval: 30000,        // Millisecondi tra auto-save
  saveOnBlur: true,               // Salva quando si lascia un campo
  onRestore: (data) => {},        // Callback al ripristino
  onSave: (data) => {},           // Callback al salvataggio
  onExpire: () => {},             // Callback quando scadono i dati
  encrypt: (data) => '',          // Funzione di crittografia (opzionale)
  decrypt: (data) => '',          // Funzione di decrittografia (opzionale)
});
```

**Return values:**

- `lastSaved`: Date | null - Timestamp ultimo salvataggio
- `lastSavedText`: string - Testo formattato ("Salvato 2 minuti fa")
- `hasRestorableData`: boolean - Se ci sono dati da ripristinare
- `showRestoreModal`: boolean - Se mostrare il modal di ripristino
- `daysSinceSave`: number - Giorni dal salvataggio
- `saveForm()`: void - Salva manualmente
- `restoreForm()`: void - Ripristina i dati
- `clearSavedData()`: void - Cancella i dati salvati
- `forceSave()`: void - Forza un save immediato

### useExitIntent

Rileva quando l'utente sta per abbandonare la pagina.

```typescript
const exitIntent = useExitIntent({
  threshold: 0.1,                 // Soglia Y per trigger (0-1)
  activationDelay: 5000,          // Delay prima di attivare (ms)
  cooldown: 10000,                // Cooldown tra trigger (ms)
  maxTriggers: 1,                 // Numero max di trigger
  enableOnMobile: true,           // Abilita su mobile
  mobileScrollThreshold: 100,     // Soglia scroll mobile (px)
  onExitIntent: () => {},         // Callback quando rilevato
  onTabChange: () => {},          // Callback cambio tab
  onBackGesture: () => {},        // Callback back gesture
});
```

**Return values:**

- `isTriggered`: boolean - Se è stato triggerato
- `triggerCount`: number - Numero di volte triggerato
- `isActive`: boolean - Se il detection è attivo
- `trigger()`: void - Trigger manuale
- `reset()`: void - Resetta lo stato
- `deactivate()`: void - Disattiva temporaneamente
- `activate()`: void - Riattiva

### useOfflineQueue

Gestisce la coda delle richieste quando offline.

```typescript
const offline = useOfflineQueue({
  maxRetries: 3,                  // Max retry per richiesta
  baseRetryDelay: 1000,           // Delay base retry (ms)
  maxQueueSize: 50,               // Dimensione max coda
  persistQueue: true,             // Persiste in localStorage
  onOnlineChange: (online) => {}, // Callback cambio stato
  onRequestSuccess: (req, res) => {},
  onRequestFailed: (req, err) => {},
});
```

**Return values:**

- `isOnline`: boolean - Stato connessione
- `queueLength`: number - Richieste in coda
- `isProcessing`: boolean - Se sta processando
- `completedRequests`: QueuedRequest[] - Richieste completate
- `failedRequests`: QueuedRequest[] - Richieste fallite
- `enqueue(request)`: void - Aggiunge richiesta alla coda
- `processQueue()`: Promise - Processa la coda manualmente
- `clearQueue()`: void - Svuota la coda
- `retryFailed(id?)`: void - Riprova richieste fallite

### useFormSession

Gestisce la sessione del form (cross-tab e cross-device).

```typescript
const session = useFormSession({
  formId: 'unique-form-id',      // Richiesto
  sessionDuration: 60,            // Durata sessione (minuti)
  enableCrossTabSync: true,       // Sync tra tab
  enableCrossDeviceSync: false,   // Sync tra dispositivi
  syncEndpoint: '/api/sessions',  // Endpoint per sync
  onOtherSessionDetected: (sess) => {},
  onTakeover: () => {},
  onKeepOther: () => {},
});
```

**Return values:**

- `sessionId`: string - ID della sessione corrente
- `hasOtherSession`: boolean - Se c'è un'altra sessione
- `otherSession`: SessionData | null - Dati altra sessione
- `showTakeoverModal`: boolean - Se mostrare modal takeover
- `updateActivity()`: void - Aggiorna attività
- `setProgress(step, total)`: void - Imposta progresso
- `takeOverSession()`: void - Prendi controllo
- `keepOtherSession()`: void - Mantieni altra sessione

## Componenti UI

### FormResumeBanner

Banner che appare quando ci sono dati salvati.

```tsx
<FormResumeBanner
  hasRestorableData={persistence.hasRestorableData}
  daysSinceSave={persistence.daysSinceSave}
  lastSavedText={persistence.lastSavedText}
  restoreForm={persistence.restoreForm}
  clearSavedData={persistence.clearSavedData}
  title="Hai una registrazione in sospeso"
/>
```

### ExitIntentModal

Modal che appare quando l'utente sta per uscire.

```tsx
<ExitIntentModal
  exitIntent={exitIntent}
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Aspetta! Stavi completando la registrazione."
  onCompleteNow={() => {}}
  onSaveForLater={() => {}}
/>
```

### OfflineIndicator

Banner che mostra lo stato della connessione.

```tsx
<OfflineIndicator
  isOnline={offline.isOnline}
  queueLength={offline.queueLength}
  isProcessing={offline.isProcessing}
  processQueue={offline.processQueue}
/>
```

### SessionTakeoverModal

Modal per gestire sessioni multiple.

```tsx
<SessionTakeoverModal
  showTakeoverModal={session.showTakeoverModal}
  otherSession={session.otherSession}
  takeOverSession={session.takeOverSession}
  keepOtherSession={session.keepOtherSession}
/>
```

### DataRestoreModal

Modal per il ripristino dati dopo giorni.

```tsx
<DataRestoreModal
  showRestoreModal={persistence.showRestoreModal}
  daysSinceSave={persistence.daysSinceSave}
  restoreForm={persistence.restoreForm}
  clearSavedData={persistence.clearSavedData}
/>
```

## Esempi

### Form Multi-step con Persistenza

Vedi il file `example-usage.tsx` per un esempio completo.

### Gestione Submit con Queue Offline

```tsx
const handleSubmit = async (data: FormData) => {
  // Se offline, metti in coda
  if (!offline.isOnline) {
    offline.enqueue({
      url: '/api/customers',
      method: 'POST',
      body: JSON.stringify(data),
      priority: 'high',
    });
    toast.success('Salvato offline. Verrà sincronizzato quando torni online.');
    return;
  }

  // Altrimenti invia direttamente
  try {
    await fetch('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    persistence.clearSavedData(); // Pulisci dati persistenti
    toast.success('Cliente creato con successo!');
  } catch (error) {
    toast.error('Errore durante il salvataggio');
  }
};
```

### Crittografia Dati

```tsx
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'your-secret-key';

const persistence = useFormPersistence(form, {
  formId: 'sensitive-form',
  encrypt: (data) => CryptoJS.AES.encrypt(data, SECRET_KEY).toString(),
  decrypt: (data) => CryptoJS.AES.decrypt(data, SECRET_KEY).toString(CryptoJS.enc.Utf8),
});
```

## Best Practices

1. **Versioning**: Usa la proprietà `version` per invalidare dati obsoleti quando cambia lo schema
2. **Form ID**: Usa ID univoci e consistenti per ogni form (es: `customer-registration-v1`)
3. **Cleanup**: Chiama `clearSavedData()` dopo un submit di successo
4. **Errori**: Gestisci sempre gli errori nei callback `onError`
5. **Privacy**: Considera la crittografia per dati sensibili
6. **Testing**: Testa sempre il comportamento offline

## Troubleshooting

### I dati non vengono salvati

- Verifica che il `formId` sia univoco
- Controlla che localStorage sia disponibile e non pieno
- Verifica che non ci siano errori JavaScript

### Exit intent non funziona

- Su mobile, assicurati che `enableOnMobile` sia `true`
- Controlla che non ci siano altri event listeners che bloccano

### Sessione non sincronizzata

- Assicurati che `enableCrossTabSync` sia `true`
- Verifica che non ci siano restrizioni CORS

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

## Licenza

Parte del progetto MechMind OS.
