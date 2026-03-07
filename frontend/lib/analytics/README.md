# Behavioral Analytics

Sistema di tracciamento comportamentale stile Mixpanel/Amplitude per identificare pattern di frustrazione utente e prevenire abbandono form.

## Features

- 🔴 **Rage Click Detection** - Identifica quando un utente clicca ripetutamente sullo stesso elemento (3+ click in 1 secondo)
- ⏱️ **Hesitation Tracking** - Misura il tempo tra focus su un campo e primo carattere digitato
- 📝 **Field Corrections** - Conta quante volte l'utente modifica un campo
- 🖱️ **Mouse Heatmap** - Traccia posizioni mouse per analisi heatmap
- 📜 **Scroll Depth** - Monitora profondità di scroll
- 🎯 **Abandonment Prediction** - Calcola score di rischio abbandono in tempo reale
- 💾 **Offline Backup** - Salva dati in localStorage quando offline
- 🔒 **Privacy Compliant** - Nessun PII nei dati tracciati

## Quick Start

### 1. Setup Base

```tsx
import { useBehavioralTracking } from '@/hooks/useBehavioralTracking';
import { AbandonmentPreventionModal } from '@/components/analytics';

function CheckoutForm() {
  const tracking = useBehavioralTracking({
    formId: 'checkout-form',
    currentStep: 'payment',
    endpoint: '/api/analytics/behavioral',
    enableAbandonmentPrevention: true,
    abandonmentThreshold: 70, // Score 0-100
  });

  return (
    <>
      <form>
        <input
          onFocus={() => tracking.trackFieldFocus('email')}
          onInput={() => tracking.trackFieldFirstInput('email')}
          onChange={(e) => tracking.trackFieldChange('email', e.target.value)}
          onBlur={() => tracking.trackFieldBlur('email')}
        />
      </form>

      {/* Modal prevenzione abbandono */}
      <AbandonmentPreventionModal
        open={tracking.showAbandonmentModal}
        onClose={tracking.closeAbandonmentModal}
        riskLevel={tracking.abandonmentRisk}
        score={tracking.abandonmentScore}
        onOpenChat={() => window.openChat?.()}
      />
    </>
  );
}
```

### 2. Uso con Hook Utility

```tsx
import { useFieldTracking } from '@/hooks/useBehavioralTracking';

function EmailField() {
  const fieldProps = useFieldTracking('email', {
    formId: 'signup-form',
  });

  return (
    <input
      type="email"
      {...fieldProps}
    />
  );
}
```

### 3. Tracciamento Click

```tsx
import { useRageClickTracking } from '@/hooks/useBehavioralTracking';

function Button() {
  const { onClick, hasRageClick } = useRageClickTracking({
    formId: 'checkout-form',
  });

  return (
    <button 
      onClick={onClick}
      data-track-id="submit-button"
    >
      {hasRageClick ? 'Stai bene?' : 'Invia'}
    </button>
  );
}
```

## API Reference

### `BehavioralTracker`

Classe core per il tracciamento.

```typescript
import { behavioralTracker } from '@/lib/analytics';

// Track rage click
behavioralTracker.trackClick('submit-button');

// Track field interactions
behavioralTracker.trackFieldFocus('email');
behavioralTracker.trackFieldFirstInput('email');
behavioralTracker.trackFieldChange('email', 'user@example.com');
behavioralTracker.trackFieldBlur('email');

// Track mouse (throttled automaticamente)
behavioralTracker.trackMouseMove(x, y);

// Track scroll
behavioralTracker.trackScroll(75); // 75% scroll depth

// Get risk assessment
const risk = behavioralTracker.getAbandonmentRisk(); // 'low' | 'medium' | 'high'
const score = behavioralTracker.getAbandonmentScore(); // 0-100

// Export metrics
const metrics = behavioralTracker.exportMetrics();
const summary = behavioralTracker.getSummary();
```

### `useBehavioralTracking`

Hook React completo.

```typescript
const tracking = useBehavioralTracking({
  // Required
  formId: 'form-id',
  
  // Optional
  currentStep: 'step-name',
  endpoint: '/api/analytics/behavioral',
  trackMouse: true,
  trackScroll: true,
  enableAbandonmentPrevention: true,
  abandonmentThreshold: 70,
  config: {
    mouseThrottleMs: 100,
    batchIntervalMs: 10000,
    rageClickThreshold: 3,
    highHesitationMs: 3000,
    correctionThreshold: 3,
    privacyMode: false,
  },
  onHighAbandonmentRisk: (score) => console.log('High risk!', score),
  onFrustrationDetected: (type) => console.log('Frustration:', type),
});

// Returns
{
  // Tracking methods
  trackClick,
  trackFieldFocus,
  trackFieldFirstInput,
  trackFieldChange,
  trackFieldBlur,
  trackScroll,
  
  // Risk assessment
  getAbandonmentRisk,
  getAbandonmentScore,
  abandonmentRisk,      // State: 'low' | 'medium' | 'high'
  abandonmentScore,     // State: 0-100
  
  // Modal control
  showAbandonmentModal,
  closeAbandonmentModal,
  openAbandonmentModal,
  
  // Indicators
  hasRecentRageClick,
  hasRecentHighHesitation,
  
  // Data export
  exportMetrics,
  getSummary,
  reset,
}
```

### `AbandonmentPreventionModal`

Componente modal per offrire aiuto.

```tsx
<AbandonmentPreventionModal
  open={boolean}
  onClose={() => void}
  riskLevel="low" | "medium" | "high"
  score={0-100}
  formId="string"
  currentStep="string"
  
  // Callbacks
  onOpenChat={() => void}
  onRequestCallback={() => void}
  onOpenGuide={() => void}
  onSaveAndContinue={() => void}
  
  // Customization
  title="Custom title"
  message="Custom message"
  variant="default" | "minimal" | "proactive"
  showSaveAndContinue={true}
/>
```

## Metriche Tracciate

### Rage Clicks

```typescript
interface RageClickEvent {
  element: string;      // Selector dell'elemento
  count: number;        // Numero di click
  timestamp: number;    // Timestamp
  xpath?: string;       // XPath (opzionale)
}
```

Trigger: 3+ click sullo stesso elemento in 1 secondo.

### Hesitation Times

```typescript
Record<string, number>  // fieldName -> milliseconds
```

Misura tempo tra `focus` e primo `input` event.

### Field Corrections

```typescript
Record<string, number>  // fieldName -> correctionCount
```

Incrementa quando il valore cambia significativamente (>20% diverso con Levenshtein distance).

### Mouse Positions

```typescript
Array<{
  x: number;
  y: number;
  timestamp: number;
}>
```

Throttled a 100ms per performance. In privacy mode coordinate arrotondate.

### Scroll Data

```typescript
{
  depth: number;        // Percentuale scroll 0-100
  timestamp: number;
}
```

## Algoritmo Abandonment Risk

Score calcolato su 100 punti:

| Fattore | Peso | Max |
|---------|------|-----|
| Rage clicks | 10 pts/click | 30 |
| High hesitation (>5s) | 8 pts/field | 25 |
| Corrections (3+) | 8 pts/field | 25 |
| Error clicks | 5 pts/click | 20 |

**Risk Levels:**
- `low`: score < 30
- `medium`: score 30-60
- `high`: score > 60

## Privacy & Compliance

### Dati NON tracciati

- Nessun contenuto testuale inserito
- Nessun PII (email, nome, telefono, etc.)
- Coordinate mouse arrotondate in privacy mode
- No fingerprinting

### Dati tracciati

- Identificatori elementi (data-track-id, id, class)
- Timing interazioni
- Pattern comportamentali aggregati
- Coordinate mouse (opzionali)

### Configurazione Privacy

```typescript
const tracking = useBehavioralTracking({
  formId: 'my-form',
  config: {
    privacyMode: true,  // Arrotonda coordinate mouse
  },
});
```

## Configurazione

### Opzioni TrackingConfig

```typescript
interface TrackingConfig {
  mouseThrottleMs: number;      // Default: 100
  batchIntervalMs: number;      // Default: 10000
  rageClickThreshold: number;   // Default: 3
  highHesitationMs: number;     // Default: 3000
  correctionThreshold: number;  // Default: 3
  abandonmentCheckMs: number;   // Default: 5000
  storageKey: string;           // Default: 'behavioral_analytics_backup'
  maxOfflineEvents: number;     // Default: 100
  privacyMode: boolean;         // Default: false
}
```

## Eventi Analytics

Eventi tracciati automaticamente:

- `Rage Click Detected` - Quando rilevati 3+ click rapidi
- `High Hesitation Detected` - Quando esitazione > 3s
- `Repeated Field Correction` - Quando correzioni > 3
- `Abandonment Prevention Triggered` - Quando mostrato modal
- `Abandonment Prevention Dismissed` - Quando chiuso modal
- `Support Chat Opened` - Quando aperta chat
- `Callback Requested` - Quando richiamata richiesta
- `Tab Hidden` - Quando utente cambia tab

## Backend API

Endpoint atteso:

```typescript
POST /api/analytics/behavioral
Content-Type: application/json

{
  formId: string;
  metrics: BehavioralMetrics;
  sessionDuration: number;
  timestamp: number;
  isOfflineFlush: boolean;
}
```

## Troubleshooting

### Troppi eventi mouse

```typescript
useBehavioralTracking({
  formId: 'form',
  trackMouse: false,  // Disabilita tracking mouse
});
```

### Performance issues

```typescript
useBehavioralTracking({
  formId: 'form',
  config: {
    mouseThrottleMs: 200,     // Aumenta throttle
    batchIntervalMs: 30000,   // Riduci frequenza batch
  },
});
```

### Debug mode

In development, il tracker è disponibile su `window.behavioralTracker`.

```javascript
// Console
window.behavioralTracker.getSummary()
window.behavioralTracker.exportMetrics()
```
