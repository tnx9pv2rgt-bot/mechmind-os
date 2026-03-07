# MechMind OS - Animation Components

Componenti di animazione riutilizzabili per creare effetti fluidi Apple-style.

## Installazione

```bash
npm install framer-motion
```

## Componenti Disponibili

### 1. StaggerContainer + StaggerItem

Per animare una griglia di card una dopo l'altra:

```tsx
import { StaggerContainer, StaggerItem } from '@/components/animations'

<StaggerContainer className="grid grid-cols-3 gap-4">
  <StaggerItem>
    <Card>Contenuto 1</Card>
  </StaggerItem>
  <StaggerItem>
    <Card>Contenuto 2</Card>
  </StaggerItem>
  <StaggerItem>
    <Card>Contenuto 3</Card>
  </StaggerItem>
</StaggerContainer>
```

**Props:**
- `delay`: Ritardo iniziale (default: 0.05s)
- `staggerDelay`: Ritardo tra ogni elemento (default: 0.1s)

### 2. AnimatedPage

Pagina completa con header animato:

```tsx
import { AnimatedPage } from '@/components/animations'

<AnimatedPage title="Clienti" subtitle="Gestione clienti">
  {/* Contenuto pagina */}
</AnimatedPage>
```

### 3. AnimatedCard

Singola card con animazione:

```tsx
import { AnimatedCard } from '@/components/animations'

<AnimatedCard delay={0.2} hover={true}>
  <Card>Contenuto</Card>
</AnimatedCard>
```

### 4. AnimatedList

Lista con animazione stagger:

```tsx
import { AnimatedList } from '@/components/animations'

<AnimatedList 
  items={bookings}
  renderItem={(booking, index) => <BookingRow key={index} {...booking} />}
  staggerDelay={0.05}
/>
```

### 5. AnimatedSkeleton

Loading placeholder animato:

```tsx
import { AnimatedSkeleton } from '@/components/animations'

{isLoading && <AnimatedSkeleton count={5} />}
```

## Variants Predefiniti

Puoi usarli direttamente con motion:

```tsx
import { motion } from 'framer-motion'
import { staggerItemVariants } from '@/components/animations'

<motion.div variants={staggerItemVariants}>
  Contenuto
</motion.div>
```

## Esempio Completo: Pagina Bookings

```tsx
'use client'

import { motion } from 'framer-motion'
import { StaggerContainer, StaggerItem, AnimatedPage } from '@/components/animations'

export default function BookingsPage() {
  return (
    <AnimatedPage title="Prenotazioni" subtitle="Gestisci gli appuntamenti">
      {/* KPI Cards */}
      <StaggerContainer className="grid grid-cols-4 gap-4 mb-8">
        <StaggerItem><KpiCard /></StaggerItem>
        <StaggerItem><KpiCard /></StaggerItem>
        <StaggerItem><KpiCard /></StaggerItem>
        <StaggerItem><KpiCard /></StaggerItem>
      </StaggerContainer>
      
      {/* Lista prenotazioni */}
      <StaggerContainer className="space-y-3">
        {bookings.map((booking, i) => (
          <StaggerItem key={i}>
            <BookingRow {...booking} />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </AnimatedPage>
  )
}
```

## Timing Recommendations

| Elemento | staggerDelay | delay |
|----------|--------------|-------|
| KPI Cards | 0.1s | 0.05s |
| Lista items | 0.05s | 0.1s |
| Feature Cards | 0.15s | 0.2s |
| Alert Cards | 0.1s | 0.3s |

## Easing Functions

- **Apple-style**: `[0.25, 0.1, 0.25, 1]` (cubic-bezier)
- **Ease Out**: `'easeOut'`
- **Spring**: Usare `type: 'spring', stiffness: 300, damping: 20`
