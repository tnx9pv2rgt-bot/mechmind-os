# WCAG 2.1 AA Compliance Checklist

## Perceptible

### 1.1 Text Alternatives
- [x] **1.1.1 Non-text Content** - Tutte le immagini hanno alt text appropriato

### 1.2 Time-based Media
- [x] **1.2.1 Audio-only and Video-only (Prerecorded)** - N/A per applicazione gestionale
- [x] **1.2.2 Captions (Prerecorded)** - N/A
- [x] **1.2.3 Audio Description or Media Alternative (Prerecorded)** - N/A

### 1.3 Adaptable
- [x] **1.3.1 Info and Relationships** - Uso di HTML semantico (main, nav, section, form, etc.)
  - Implementato in: `A11yFormField.tsx`, `MainContent.tsx`
- [x] **1.3.2 Meaningful Sequence** - Ordine tab logico gestito da `useKeyboardNavigation`
- [x] **1.3.3 Sensory Characteristics** - Istruzioni non dipendono solo da colore/forma
- [x] **1.3.4 Orientation** - Supporto per portrait e landscape
- [x] **1.3.5 Identify Input Purpose** - Autocomplete sugli input
- [x] **1.3.6 Identify Purpose** - Landmark regions identificate

### 1.4 Distinguishable
- [x] **1.4.1 Use of Color** - Informazioni non trasmesse solo tramite colore
- [x] **1.4.2 Audio Control** - N/A
- [x] **1.4.3 Contrast (Minimum)** - Contrasto 4.5:1 per testo normale
  - Implementato in: `contrast.ts`, `high-contrast.css`
- [x] **1.4.4 Resize text** - Testo ridimensionabile fino al 200%
- [x] **1.4.5 Images of Text** - No immagini come testo
- [x] **1.4.10 Reflow** - Layout responsive senza scroll orizzontale
- [x] **1.4.11 Non-text Contrast** - Contrasto 3:1 per UI components
- [x] **1.4.12 Text Spacing** - Supporta override spaziatura
- [x] **1.4.13 Content on Hover or Focus** - Contenuto hover persistente

## Operable

### 2.1 Keyboard Accessible
- [x] **2.1.1 Keyboard** - Tutta la funzionalità accessibile da tastiera
  - Implementato in: `useKeyboardNavigation.ts`, `useFocusTrap.ts`
- [x] **2.1.2 No Keyboard Trap** - Focus trap gestito correttamente nei modali
- [x] **2.1.4 Character Key Shortcuts** - Shortcuts disabilitabili

### 2.2 Enough Time
- [x] **2.2.1 Timing Adjustable** - Timeout estendibili
- [x] **2.2.2 Pause, Stop, Hide** - Controlli per contenuto in movimento
  - Implementato in: `useReducedMotion.ts`, `reduced-motion.css`

### 2.3 Seizures and Physical Reactions
- [x] **2.3.1 Three Flashes or Below Threshold** - Nessun contenuto che lampeggia
- [x] **2.3.2 Three Flashes** - Rispettato
- [x] **2.3.3 Animation from Interactions** - Motion ridotta rispettata

### 2.4 Navigable
- [x] **2.4.1 Bypass Blocks** - Skip link implementato
  - Implementato in: `SkipLink.tsx`
- [x] **2.4.2 Page Titled** - Titoli pagina descrittivi
- [x] **2.4.3 Focus Order** - Ordine focus sequenziale e significativo
- [x] **2.4.4 Link Purpose (In Context)** - Testo link comprensibile
- [x] **2.4.5 Multiple Ways** - Più modi per trovare pagine
- [x] **2.4.6 Headings and Labels** - Headings descrittivi
- [x] **2.4.7 Focus Visible** - Focus indicator visibile
  - Implementato in: `focus.ts`, `high-contrast.css`

### 2.5 Input Modalities
- [x] **2.5.1 Pointer Gestures** - Gestures semplici
- [x] **2.5.2 Pointer Cancellation** - Azioni su mouse up
- [x] **2.5.3 Label in Name** - Label accessibile include testo visibile
- [x] **2.5.4 Motion Actuation** - Funzionalità disponibili senza motion

## Understandable

### 3.1 Readable
- [x] **3.1.1 Language of Page** - Attributo lang impostato
  - Implementato in: `i18n/index.ts`
- [x] **3.1.2 Language of Parts** - Lang attributi su parti in lingue diverse
  - Implementato in: `LanguageSwitcher.tsx`

### 3.2 Predictable
- [x] **3.2.1 On Focus** - Focus non causa cambio contesto
- [x] **3.2.2 On Input** - Input non causa cambio contesto
- [x] **3.2.3 Consistent Navigation** - Navigazione consistente
- [x] **3.2.4 Consistent Identification** - Componenti identificati consistentemente

### 3.3 Input Assistance
- [x] **3.3.1 Error Identification** - Errori identificati chiaramente
  - Implementato in: `A11yFormField.tsx`, `validation.ts`
- [x] **3.3.2 Labels or Instructions** - Label e istruzioni chiare
- [x] **3.3.3 Error Suggestion** - Suggerimenti per correggere errori
- [x] **3.3.4 Error Prevention (Legal, Financial, Data)** - Conferma per azioni importanti
  - Implementato in: `ConfirmDialog.tsx`

## Robust

### 4.1 Compatible
- [x] **4.1.1 Parsing** - HTML valido
- [x] **4.1.2 Name, Role, Value** - ARIA attributes corretti
  - Implementato in: `aria-utils.ts`, tutti i componenti a11y
- [x] **4.1.3 Status Messages** - Messaggi di stato annunciati
  - Implementato in: `Announcer.tsx`, `useA11yAnnouncer.ts`

## Features Implementate

### 1. ARIA Labels & Semantica
- ✅ Ogni input ha `aria-label` descrittivo
- ✅ `aria-describedby` per errori/suggerimenti
- ✅ `aria-invalid` quando errore
- ✅ `aria-live="polite"` per annunci errori
- ✅ `role="form"`, `role="group"` per sezioni
- ✅ Landmark regions (main, complementary)

### 2. Keyboard Navigation
- ✅ Hook: `useKeyboardNavigation.ts`
- ✅ Tab order logico (sequenziale per step)
- ✅ Esc per chiudere modali
- ✅ Enter per submit quando su campo
- ✅ Arrow keys per navigate select/radio
- ✅ Focus trap in modali
- ✅ Skip link "Salta al contenuto"

### 3. Screen Reader Support
- ✅ Componente: `Announcer.tsx`
- ✅ Cambio step annunciato
- ✅ Errori annunciati
- ✅ Successi annunciati
- ✅ Loading annunciato

### 4. High Contrast Mode
- ✅ CSS: `high-contrast.css`
- ✅ Supporta `prefers-contrast: high`
- ✅ Bordi più visibili
- ✅ Colori adeguati WCAG AAA

### 5. Reduced Motion
- ✅ Hook: `useReducedMotion.ts`
- ✅ Rispetta `prefers-reduced-motion`
- ✅ Disabilita animazioni se utente lo preferisce
- ✅ Transizioni istantanee

### 6. Internationalization (i18n)
- ✅ File: `i18n/` con strutture per IT, EN, DE
- ✅ Componente LanguageSwitcher
- ✅ Dropdown bandiere (🇮🇹 🇬🇧 🇩🇪)
- ✅ Cambio istantaneo
- ✅ Persistenza scelta

### 7. WCAG 2.1 AA Compliance
- ✅ 1.3.1 Info and Relationships
- ✅ 1.3.2 Meaningful Sequence
- ✅ 1.4.3 Contrast (minimum 4.5:1)
- ✅ 1.4.4 Resize text (up to 200%)
- ✅ 2.1.1 Keyboard (all functionality)
- ✅ 2.2.2 Pause, Stop, Hide (animations)
- ✅ 3.3.1 Error Identification (clear errors)
- ✅ 3.3.2 Labels or Instructions (clear labels)
- ✅ 4.1.2 Name, Role, Value (ARIA)

## Test Coverage

### Unit Tests
- ✅ ARIA utilities
- ✅ Validation utilities
- ✅ Contrast utilities
- ✅ Keyboard utilities
- ✅ Focus utilities

### Integration Tests
- ✅ Componenti accessibility
- ✅ Form multi-step
- ✅ Modal/Dialog

### Automated Testing
- ✅ jest-axe per test WCAG automatici
- ✅ Threshold coverage: 70%

## File Structure

```
frontend/
├── i18n/
│   ├── index.ts                 # Config i18n
│   ├── it/                      # Italiano
│   │   ├── common.json
│   │   ├── form.json
│   │   ├── validation.json
│   │   └── a11y.json
│   ├── en/                      # English
│   │   └── ...
│   └── de/                      # Deutsch
│       └── ...
├── lib/accessibility/
│   ├── index.ts                 # Exports
│   ├── aria-utils.ts            # ARIA helpers
│   ├── validation.ts            # Form validation
│   ├── contrast.ts              # Color contrast
│   ├── keyboard.ts              # Keyboard utils
│   └── focus.ts                 # Focus management
├── hooks/
│   ├── useKeyboardNavigation.ts
│   ├── useReducedMotion.ts
│   ├── useFocusTrap.ts
│   └── useA11yAnnouncer.ts
├── components/accessibility/
│   ├── Announcer.tsx
│   ├── SkipLink.tsx
│   ├── LanguageSwitcher.tsx
│   ├── A11yFormField.tsx
│   └── A11yModal.tsx
├── styles/
│   ├── high-contrast.css
│   └── reduced-motion.css
└── __tests__/accessibility/
    ├── setup.ts
    ├── a11y.test.tsx
    ├── validation.test.ts
    └── contrast.test.ts
```

## Come Usare

### Aggiungere un campo form accessibile

```tsx
import { A11yFormField } from '@/components/accessibility';

<A11yFormField
  label="Email"
  name="email"
  type="email"
  required
  hint="Inserisci la tua email aziendale"
  error={errors.email}
  aria-invalid={!!errors.email}
/>
```

### Usare il Language Switcher

```tsx
import { LanguageSwitcher } from '@/components/accessibility';

<LanguageSwitcher variant="dropdown" />
```

### Aggiungere Skip Link

```tsx
import { SkipLink, MainContent } from '@/components/accessibility';

<SkipLink />
<MainContent id="main-content">
  {/* Contenuto */}
</MainContent>
```

### Annunci per screen reader

```tsx
import { useAnnouncer } from '@/components/accessibility';

const { announceSuccess, announceError } = useAnnouncer();

// Dopo operazione
announceSuccess('Cliente salvato');
announceError('Errore di connessione');
```

### Verificare contrasto colori

```typescript
import { checkContrast } from '@/lib/accessibility';

const result = checkContrast('#000000', '#FFFFFF');
console.log(result.passesAA); // true
console.log(result.passesAAA); // true
```

## Licenza

Questo sistema di accessibilità è progettato per essere conforme alle WCAG 2.1 Level AA.
