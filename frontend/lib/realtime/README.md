# Real-Time Save System

Sistema di salvataggio real-time per form, ispirato a Notion e Linear.

## Features

- ✅ **Debounced Auto-Save** - Salva ad ogni battitura con debounce 500ms
- ✅ **Optimistic UI** - Feedback immediato all'utente
- ✅ **Conflict Resolution** - Gestione conflitti multi-device
- ✅ **Offline Queue** - Coda modifiche offline con sync automatico
- ✅ **Retry Automatico** - Backoff esponenziale fino a 3 tentativi
- ✅ **Supabase Realtime** - WebSocket per sync istantaneo
- ✅ **Versioning** - Optimistic locking per prevenire sovrascritture
- ✅ **TypeScript** - Fully typed

## Installazione

### 1. Installa dipendenze

```bash
npm install @supabase/supabase-js
```

### 2. Configura variabili d'ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Esegui migrazione database

```bash
# SQL in: database/prisma/migrations/000000000006_form_drafts_realtime/migration.sql
# Oppure esegui direttamente in Supabase SQL Editor
```

## Quick Start

### Uso base con hook

```tsx
import { useRealtimeSave } from '@/hooks/realtime'
import { SaveStatusIndicator } from '@/components/realtime'

function MyForm() {
  const [data, setData] = useState({ name: '' })
  
  const { saveStatus, lastSaved, lastSavedText } = useRealtimeSave({
    formId: 'customer-new-uuid',
    formType: 'customer',
    data,
    debounceMs: 500,
  })
  
  return (
    <div>
      <SaveStatusIndicator 
        status={saveStatus} 
        lastSaved={lastSaved}
        lastSavedText={lastSavedText}
      />
      <input 
        value={data.name}
        onChange={e => setData({ name: e.target.value })}
      />
    </div>
  )
}
```

### Uso con wrapper (consigliato)

```tsx
import { RealtimeFormWrapper } from '@/components/realtime'

function CustomerForm() {
  const [formData, setFormData] = useState({ name: '', email: '' })
  
  return (
    <RealtimeFormWrapper
      formId="customer-new-uuid"
      formType="customer"
      data={formData}
      onDraftLoaded={(draft) => setFormData(draft.data)}
    >
      {({ saveStatus, forceSave }) => (
        <form>
          {/* Form fields */}
          <button onClick={() => forceSave()}>
            Salva ora
          </button>
        </form>
      )}
    </RealtimeFormWrapper>
  )
}
```

## API Reference

### useRealtimeSave

Hook principale per il salvataggio real-time.

```typescript
const {
  saveStatus,        // 'idle' | 'saving' | 'saved' | 'error' | 'offline' | 'conflict'
  lastSaved,         // Date | null
  lastSavedText,     // string (es: "2 secondi fa")
  pendingChanges,    // number (modifiche in coda offline)
  isOnline,          // boolean
  version,           // number
  hasConflict,       // boolean
  conflictData,      // ConflictData | null
  forceSave,         // () => Promise<void>
  resolveConflict,   // (useRemote: boolean) => Promise<void>
  loadDraft,         // () => Promise<FormDraft | null>
  deleteDraft,       // () => Promise<void>
  retry,             // () => Promise<void>
} = useRealtimeSave(options)
```

### Options

| Opzione | Tipo | Default | Descrizione |
|---------|------|---------|-------------|
| `formId` | `string` | required | ID univoco del form |
| `formType` | `string` | required | Tipo di form (customer, booking, etc) |
| `data` | `Record<string, unknown>` | required | Dati del form |
| `debounceMs` | `number` | `500` | Millisecondi di debounce |
| `maxRetries` | `number` | `3` | Numero massimo di retry |
| `enableRealtime` | `boolean` | `true` | Abilita realtime subscription |
| `onConflict` | `(conflict) => void` | - | Callback conflitto |
| `onSave` | `(draft) => void` | - | Callback salvataggio |
| `onError` | `(error) => void` | - | Callback errore |
| `deviceInfo` | `string` | auto | Info dispositivo |

### SaveStatusIndicator

Componente per mostrare lo stato di salvataggio.

```tsx
<SaveStatusIndicator
  status="saving"
  lastSaved={new Date()}
  lastSavedText="2 secondi fa"
  pendingChanges={0}
  showIcon={true}
  compact={false}
  onRetry={() => {}}
  onResolve={() => {}}
/>
```

### RealtimeFormWrapper

Wrapper completo con gestione automatica UI.

```tsx
<RealtimeFormWrapper
  formId="unique-id"
  formType="customer"
  data={formData}
  showFixedIndicator={true}
  showConflictDialog={true}
  onDraftLoaded={(draft) => {}}
>
  {({ saveStatus, forceSave }) => (
    <form>...</form>
  )}
</RealtimeFormWrapper>
```

## Conflict Resolution

Quando lo stesso form viene modificato su più dispositivi:

1. Il sistema rileva il conflitto tramite versione
2. Mostra dialog con entrambe le versioni
3. L'utente sceglie quale mantenere
4. I dati vengono uniti o sovrascritti

```tsx
const { hasConflict, conflictData, resolveConflict } = useRealtimeSave({
  formId: 'my-form',
  formType: 'customer',
  data: formData,
  onConflict: (conflict) => {
    console.log('Conflitto rilevato!')
    console.log('Locale:', conflict.local)
    console.log('Remoto:', conflict.remote.data)
  }
})

// Risolvi mantenendo la versione remota
await resolveConflict(true)

// Risolvi mantenendo la versione locale
await resolveConflict(false)
```

## Offline Support

Quando l'utente è offline:

1. Le modifiche vengono salvate in `localStorage`
2. L'indicatore mostra "Offline · X in attesa"
3. Al ritorno online, i dati vengono sincronizzati
4. Retry automatico con backoff esponenziale

```tsx
const { isOnline, pendingChanges, retry } = useRealtimeSave({
  formId: 'my-form',
  formType: 'customer',
  data: formData,
  onConnectionChange: (online) => {
    console.log('Online:', online)
  }
})
```

## Database Schema

```sql
create table form_drafts (
  id text primary key,
  user_id uuid references auth.users not null,
  form_type text not null,
  form_id text not null,
  data jsonb not null default '{}',
  version integer not null default 1,
  device_info text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  unique(user_id, form_type, form_id)
);

-- Indexes
CREATE INDEX idx_form_drafts_user_id ON form_drafts(user_id);
CREATE INDEX idx_form_drafts_updated_at ON form_drafts(updated_at);
CREATE INDEX idx_form_drafts_data_gin ON form_drafts USING GIN(data);

-- RLS
alter table form_drafts enable row level security;

create policy "Users can only access their own drafts"
  on form_drafts for all
  using (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table form_drafts;
```

## Performance

- **Debounce**: 500ms previene troppi salvataggi
- **Batch**: Offline queue raggruppa modifiche
- **Caching**: Draft locale per caricamento istantaneo
- **Indexes**: Ottimizzati per query frequenti

## Errori Comuni

### "User not authenticated"
L'utente deve essere loggato per salvare draft.

### "Conflict detected"
Due dispositivi hanno modificato lo stesso form. Usa `resolveConflict()`.

### Version mismatch
La versione del draft non corrisponde. Ricarica il draft.

## Esempi

Vedi `components/customers/customer-form-with-realtime.tsx` per un esempio completo.

## Troubleshooting

### Debug mode
```tsx
useRealtimeSave({
  ...options,
  // Logga tutto in console
  onSave: (d) => console.log('[Save]', d),
  onError: (e) => console.error('[Error]', e),
})
```

### Clear all drafts
```typescript
await supabase.from('form_drafts').delete().eq('user_id', userId)
```
