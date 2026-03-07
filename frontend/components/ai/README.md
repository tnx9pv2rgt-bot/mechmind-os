# AI Proactive Suggestions

Sistema di suggerimenti proattivi AI in stile GitHub Copilot per i form.

## 🎯 Caratteristiche

- **Suggerimenti automatici**: L'AI suggerisce prima che l'utente chieda
- **4 tipi di suggestion**: Autofill, Correction, Optimization, Tip
- **Confidence score visibile**: Barra di confidenza per ogni suggerimento
- **One-click apply**: Applica suggerimenti con un click
- **Dismiss persistente**: Non ripete suggerimenti già ignorati (salvati in localStorage)
- **Design non intrusivo**: Card colorate per tipo

## 📁 Struttura

```
lib/ai/
├── proactiveSuggestions.ts    # Core AI logic
└── index.ts                   # Esportazioni

components/ai/
├── ProactiveSuggestions.tsx   # Componente UI principale
├── ProactiveFormExample.tsx   # Esempio di integrazione
└── index.ts                   # Esportazioni

hooks/
└── useProactiveAI.ts          # Hook React
```

## 🚀 Utilizzo Rapido

```tsx
import { ProactiveSuggestions } from '@/components/ai';
import { useProactiveAI } from '@/hooks/useProactiveAI';

function MyForm() {
  const [formData, setFormData] = useState({});
  const [currentField, setCurrentField] = useState('');

  const { suggestions, dismissSuggestion } = useProactiveAI({
    formData,
    currentField,
    fillField: (field, value) => setFormData(prev => ({ ...prev, [field]: value }))
  });

  return (
    <div>
      <ProactiveSuggestions 
        suggestions={suggestions} 
        onDismiss={dismissSuggestion} 
      />
      
      <input 
        onFocus={() => setCurrentField('email')}
        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
      />
    </div>
  );
}
```

## 🎨 Tipi di Suggerimenti

| Tipo | Colore | Icona | Descrizione |
|------|--------|-------|-------------|
| `autofill` | 🔵 Blu | Wand2 | Autocompletamento dati |
| `correction` | 🟠 Ambra | AlertCircle | Correzione errori |
| `tip` | ⚪ Grigio | Lightbulb | Suggerimenti generici |
| `optimization` | 🟢 Verde | Sparkles | Ottimizzazioni |

## 🧠 Suggerimenti Supportati

1. **Email → PEC**: Suggerisce PEC per email consumer (gmail, libero, etc.)
2. **Partita IVA → Dati Azienda**: Recupera dati da API e autocompila
3. **Password Strength**: Suggerimenti per password più sicure
4. **Correzione Indirizzo**: Capitalizza vie/piazze, formatta civici
5. **Predizione Settore**: Dal nome azienda (auto, tech, food, etc.)
6. **Tipo Azienda**: Dal dominio email (srl, spa, etc.)
7. **Formattazione Telefono**: Aggiunge prefisso +39
8. **Validazione Codice Fiscale**: Controlla formato CF

## ⚙️ Configurazione Hook

```tsx
const {
  suggestions,      // Suggestion[] - lista suggerimenti
  dismissSuggestion, // (id) => void - dismiss singola
  dismissAll,        // () => void - dismiss tutte
  refreshSuggestions, // () => void - refresh manuale
  isLoading,         // boolean
  count,             // number - numero suggestion
  hasSuggestions,    // boolean
  error              // string | null
} = useProactiveAI({
  formData,          // Record<string, any> - dati form
  currentField,      // string - campo attivo
  currentStep,       // number - step wizard (opzionale)
  fillField,         // (field, value) => void - funzione fill
  debounceDelay: 800, // ms - delay generazione
  minConfidence: 0.6, // 0-1 - confidenza minima
  enabled: true,      // boolean - abilita/disabilita
  onSuggestionGenerated: (s) => {}, // callback nuova suggestion
  onAllDismissed: () => {} // callback quando tutte dismissate
});
```

## 📦 API Backend Richiesta

L'AI richiede questi endpoint:

```
GET /api/company/from-vat?vat={vat}
Response: {
  name: string,
  address: string,
  city: string,
  cap: string,
  province: string
}
```

## 🎭 Esempio Completo

Vedi `ProactiveFormExample.tsx` per un esempio completo di form con tutti i campi supportati.

## 🔧 Estensione

Per aggiungere nuovi suggerimenti, modifica `proactiveSuggestions.ts`:

```typescript
private async checkMySuggestion(context: ProactiveContext): Promise<Suggestion | null> {
  if (context.currentField !== 'myField') return null;
  
  // Logica di detection
  
  return {
    id: 'my-suggestion',
    type: 'tip',
    message: 'Messaggio utile',
    action: {
      label: 'Applica',
      handler: () => this.fillField('field', 'value')
    },
    confidence: 0.8,
    field: 'field'
  };
}
```
