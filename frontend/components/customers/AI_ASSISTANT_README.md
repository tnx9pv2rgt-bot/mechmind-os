# 🤖 AI Assistant - Form Cliente Premium

Componente AI Assistant integrato nel form cliente con design Apple 2026 Liquid Glass.

## ✨ Feature Implementate

### 1. AI Chat Helper
Pulsante fluttuante in basso a destra che si espande in chat quando cliccato.

**Caratteristiche:**
- 💬 Chat contestuale basata sullo step corrente
- 💡 Suggerimenti intelligenti per ogni step
- 🤖 Risposte AI simulate con delay realistico
- 🎨 Animazioni fluide con Framer Motion
- 🔔 Badge notifica per suggerimenti non letti

**Suggerimenti per Step:**
- **Step 1 (Credenziali)**: Email aziendale, requisiti password, prefisso telefono
- **Step 2 (Dati)**: PEC obbligatoria, codice SDI, verifica P.IVA, parsing indirizzo
- **Step 3 (Privacy)**: Modifica consensi, crittografia dati, consenso marketing
- **Step 4 (Riepilogo)**: Verifica email, indirizzo completo, modifica dati

### 2. Smart Address Parsing
Input singolo "Indirizzo completo" che l'AI parsa automaticamente.

**Parsing automatico:**
```typescript
Input: "Via Roma 123, 20121 Milano (MI)"
Output: {
  street: "Via Roma",
  number: "123",
  zip: "20121",
  city: "Milano",
  province: "MI"
}
```

**Feature:**
- Regex-based parsing con fallback
- Display visualizzato dei campi parsati
- Modifica manuale dei campi estratti
- Badge "AI Powered" indicatore

### 3. Company Intelligence
Rilevamento dominio aziendale dall'email e arricchimento dati.

**Domini supportati:**
- ferrari.com → Ferrari S.p.A.
- apple.com → Apple Italia S.r.l.
- (Estendibile via API Hunter.io, Clearbit)

**Dati arricchiti:**
- Ragione Sociale
- Settore/Industria
- Partita IVA
- Indirizzo completo

### 4. Voice Input 🎤
Microfono accanto a ogni campo per dettatura vocale.

**Implementazione:**
- Web Speech API (SpeechRecognition)
- Fallback se non supportato
- Animazione onda sonora durante registrazione
- Supporto italiano (it-IT)

**Campi con Voice Input:**
- Nome e Cognome (privato)
- Codice Fiscale
- Ragione Sociale (azienda)
- Indirizzo
- Città

### 5. Predictive Field Completion
Suggerimenti mentre l'utente scrive.

**Campi con autocomplete:**
- Città: Milano, Roma, Torino, Bologna, ecc.
- Provincia: MI, RM, TO, BO, ecc.

**Lista città supportate:**
```typescript
const citySuggestions = [
  "Milano", "Roma", "Torino", "Napoli", "Bologna",
  "Firenze", "Venezia", "Verona", "Padova", "Brescia",
  "Modena", "Parma", "Reggio Emilia", "Genova", "Trieste",
  // ... 24+ città
];
```

### 6. AI Validation
Validazione semantica oltre alla regex.

**Esempi:**
```typescript
"Via Roma" → ✅ Valido
"skjhdfk"  → ⚠️ "Questo non sembra un indirizzo valido"

"RSSMRA80A01H501U" → ✅ Valido
"ABC123"             → ⚠️ "Formato codice fiscale non valido"
```

## 🎨 Design System

### Apple 2026 Liquid Glass
- **Container**: `900×900px`, `bg-white/80`, `backdrop-blur-3xl`, `rounded-[40px]`
- **Chat bubble**: `bg-white/90`, `backdrop-blur`, `rounded-2xl`
- **AI Avatar**: Icona Sparkles con animazione rotazione
- **Suggerimenti**: Chip cliccabili con hover effect
- **Voice button**: Microfono con onda sonora animata

### Color Palette
```css
--apple-blue: #0071e3;
--apple-blue-hover: #0077ed;
--apple-dark: #1d1d1f;
--apple-gray: #86868b;
--apple-border: #d2d2d7;
--apple-light-gray: #f5f5f7;
```

## 🚀 Utilizzo

### Integrazione nel Form
```typescript
import { AIFormAssistant } from "./ai-form-assistant";

// Nel componente principale
<AIFormAssistant
  currentStep={step}
  formData={form.getValues()}
  onUpdateField={(field, value) => form.setValue(field, value)}
/>
```

### Componenti Individuali
```typescript
import {
  VoiceInputButton,
  CompanyIntelligence,
  AIValidationMessage,
} from "./ai-form-assistant";

// Voice Input
<VoiceInputButton onTranscript={(text) => setValue(text)} />

// Company Intelligence
<CompanyIntelligence
  email="user@ferrari.com"
  onEnrich={(data) => populateForm(data)}
/>

// AI Validation
<AIValidationMessage field="address" value={address} />
```

## 🔒 Privacy-First

- Dati vocali processati localmente (Web Speech API)
- Nessun dato salvato su server AI
- Fallback sempre presenti se AI non disponibile
- Consenso esplicito richiesto

## 🛠️ API Estendibili

### Smart Address Parsing (API OpenAI/Claude)
```typescript
const parseAddress = async (rawAddress: string) => {
  const response = await fetch('/api/ai/parse-address', {
    method: 'POST',
    body: JSON.stringify({ address: rawAddress })
  });
  return response.json(); // { street, number, zip, city, province }
};
```

### Company Intelligence (Hunter.io/Clearbit)
```typescript
const enrichCompanyData = async (email: string) => {
  const domain = email.split('@')[1];
  // Call external enrichment API
  return { companyName, industry, vat, address };
};
```

### Voice Input (Whisper API fallback)
```typescript
// Web Speech API (default)
// Fallback: OpenAI Whisper API per lingue non supportate
```

## 📱 Responsive

- Desktop: Chat laterale a 380px
- Tablet: Full width chat
- Mobile: Bottom sheet style

## 🎯 Performance

- Lazy loading dei componenti AI
- Memoizzazione delle suggestion
- Debounce su input parsing
- Animazioni GPU-accelerated

## 📚 Dipendenze

```json
{
  "framer-motion": "^11.x",
  "lucide-react": "^0.x",
  "react-hook-form": "^7.x",
  "zod": "^3.x"
}
```

## 🔮 Roadmap

- [ ] Integrazione GPT-4 per chat avanzata
- [ ] Supporto multilingua (DE, FR, EN, ES)
- [ ] OCR per carta d'identità/Patente
- [ ] Geocoding indirizzo su mappa
- [ ] Autocomplete indirizzo Google Maps
