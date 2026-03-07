# Conditional Form Flow

Sistema di form dinamici con smart branching, animazioni fluide e time estimation.

## 🚀 Quick Start

```tsx
import { ConditionalStepRenderer } from '@/components/formFlow';
import { useConditionalFlow } from '@/hooks/form-flow';

// Usa il componente renderer
function MyForm() {
  return (
    <ConditionalStepRenderer
      answers={{ customerType: 'business' }}
      customComponents={{
        welcome: WelcomeStep,
        businessData: BusinessDataStep,
      }}
      onComplete={(answers) => console.log('Done!', answers)}
    />
  );
}
```

## 📁 Structure

```
components/formFlow/
├── ConditionalStepRenderer.tsx   # Renderer principale
├── DynamicProgress.tsx           # Barra progresso dinamica
├── ConditionalNavigation.tsx     # Navigazione adattiva
├── steps/                        # Esempi di step
│   ├── WelcomeStep.tsx
│   ├── CustomerTypeStep.tsx
│   ├── PersonalDataStep.tsx
│   └── BusinessDataStep.tsx
└── README.md

hooks/form-flow/
├── useConditionalFlow.ts         # Hook principale
└── index.ts

lib/formFlow/
├── conditionalLogic.ts           # Logica di branching
├── types.ts                      # TypeScript types
├── urlSync.ts                    # URL sync utilities
├── utils.ts                      # Helper functions
└── index.ts
```

## 🌳 Branching Logic

### Configurazione Base

```typescript
import { formFlowConfig } from '@/lib/formFlow';

const config = {
  baseSteps: ['welcome', 'credentials'],
  branches: {
    private: {
      steps: ['personalData', 'privacy'],
      skip: ['businessData', 'billingAddress'],
    },
    business: {
      steps: ['businessData', 'billingAddress', 'privacy'],
      skip: ['personalData'],
    },
    international: {
      steps: ['internationalBilling', 'taxId'],
      addAfter: 'businessData',
      condition: (answers) => answers.country !== 'IT',
    },
  },
};
```

### Uso dell'Hook

```typescript
const {
  activeSteps,        // Array di step attivi
  currentStepIndex,   // Indice step corrente
  currentStepId,      // ID step corrente
  estimatedTime,      // Tempo stimato rimanente (min)
  progress,           // Percentuale progresso
  canGoBack,          // Può andare indietro?
  canGoNext,          // Può andare avanti?
  isLastStep,         // È l'ultimo step?
  answers,            // Risposte accumulate
  goToNext,           // Vai avanti
  goToPrevious,       // Vai indietro
  updateAnswers,      // Aggiorna risposte (debounced)
  complete,           // Completa il form
} = useConditionalFlow({
  initialAnswers: { customerType: 'private' },
  config: customConfig,
  onComplete: handleComplete,
});
```

## 🎨 Custom Steps

### Interfaccia Base

```typescript
interface StepProps {
  stepId: string;                    // ID dello step
  answers: Record<string, any>;      // Risposte correnti
  onAnswersChange: (answers) => void; // Callback aggiornamento
  onNext: () => void;                // Vai allo step successivo
  onBack: () => void;                // Torna indietro
  onComplete: () => void;            // Completa il form
  isFirstStep: boolean;              // È il primo step?
  isLastStep: boolean;               // È l'ultimo step?
}
```

### Esempio Step Personalizzato

```tsx
'use client';

export function MyCustomStep({ answers, onAnswersChange, onNext }) {
  const handleSelect = (value: string) => {
    onAnswersChange({ myField: value });
  };

  return (
    <div>
      <h2>Scegli un'opzione</h2>
      <button onClick={() => handleSelect('A')}>Opzione A</button>
      <button onClick={() => handleSelect('B')}>Opzione B</button>
      <button onClick={onNext}>Continua</button>
    </div>
  );
}
```

## 🔄 URL Sync

Il form sincronizza automaticamente lo step corrente con l'URL:

```
/demo/form-flow?step=3
```

Al refresh, il form riparte dallo step salvato.

### Configurazione URL Sync

```typescript
useConditionalFlow({
  urlSync: {
    enabled: true,
    paramName: 'step',    // ?step=3
    useHash: false,       // #step=3
    replace: true,        // replaceState vs pushState
  },
});
```

## ⚡ Smart Skip

### Skip basato su condizioni

```typescript
branches: {
  vatVerified: {
    skip: ['vatConfirmation'],
    condition: (answers) => answers.vatVerified && answers.vatValid,
  },
}
```

Quando la VAT viene verificata automaticamente, lo step di conferma viene saltato.

### Skip mobile

```typescript
mobile: {
  steps: ['businessDataSimplified'],
  skip: ['businessData'],
  condition: () => window.innerWidth < 768,
}
```

## 📊 Time Estimation

Il tempo stimato viene calcolato automaticamente in base agli step rimanenti:

```typescript
// Configurazione timing (in minuti)
stepTiming: {
  welcome: 0.5,
  personalData: 2,
  businessData: 3,
  privacy: 1,
}
```

Viene mostrato nel formato: "2.5 min rimanenti"

## 🎭 Animazioni

Le transizioni tra step usano Framer Motion:

```typescript
const stepVariants = {
  enter: (direction) => ({ x: direction > 0 ? 100 : -100, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction < 0 ? 100 : -100, opacity: 0 }),
};
```

- Slide verso destra quando si va avanti
- Slide verso sinistra quando si torna indietro

## ♿ Accessibilità

- ARIA labels su tutti i pulsanti
- Focus management
- Reduced motion support
- Keyboard navigation

## 🧪 Testing

Esempio di test per uno step:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerTypeStep } from './CustomerTypeStep';

test('selects customer type and calls onAnswersChange', () => {
  const onAnswersChange = jest.fn();
  
  render(
    <CustomerTypeStep
      answers={{}}
      onAnswersChange={onAnswersChange}
      onNext={() => {}}
    />
  );
  
  fireEvent.click(screen.getByText('Privato'));
  
  expect(onAnswersChange).toHaveBeenCalledWith({
    customerType: 'private',
  });
});
```

## 📱 Mobile Optimization

Il sistema rileva automaticamente se l'utente è su mobile e può:
- Mostrare step semplificati
- Saltare step complessi
- Adattare la UI

```typescript
const optimizedStepId = getOptimizedStepId('businessData');
// Su mobile: 'businessDataSimplified'
// Su desktop: 'businessData'
```
