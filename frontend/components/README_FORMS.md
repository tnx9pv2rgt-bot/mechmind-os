# Form Components - Apple Design 2026

## 📄 FATTURE (Invoices)

### File Creati
- `invoices/invoice-form.tsx` - Form principale per la creazione/modifica fatture
- `invoices/invoice-form-schema.ts` - Validazione Zod e tipi
- `invoices/invoice-dialog.tsx` - Modal/dialog con animazioni
- `invoices/index.ts` - Esportazioni

### Features
- ✅ Autocomplete clienti con filtro
- ✅ Dropdown veicoli filtrati per cliente
- ✅ Numero fattura auto-generato (modificabile)
- ✅ Date picker per emissione e scadenza
- ✅ Select stato (Bozza, Emessa, Pagata, Scaduta, Annullata)
- ✅ **Righe fattura dinamiche** (add/remove con animazioni)
- ✅ Campi per riga: Descrizione, Quantità, Unità misura, Prezzo, Sconto %
- ✅ Calcolo importi in tempo reale
- ✅ Totali automatici (Imponibile, IVA, Totale)
- ✅ Selezione aliquota IVA (4%, 5%, 10%, 22%)
- ✅ Textarea note
- ✅ Select metodo pagamento (Bonifico, Contanti, Carta, Assegno)
- ✅ Validazione completa
- ✅ **Design Apple 2026** (Liquid Glass, blur, animazioni)

### Uso
```tsx
import { InvoiceDialog, useInvoiceDialog } from '@/components/invoices'

// Usa il hook
const { openDialog, InvoiceDialog } = useInvoiceDialog()

// Nel JSX
<InvoiceDialog onSuccess={() => refetchData()} />

// Apri il dialog
<button onClick={openDialog}>Nuova Fattura</button>
```

---

## 📍 LOCATION (Sedi)

### File Creati
- `locations/location-form.tsx` - Form principale per la gestione location
- `locations/location-form-schema.ts` - Validazione Zod, province, servizi
- `locations/location-dialog.tsx` - Modal/dialog con animazioni
- `locations/index.ts` - Esportazioni

### Features
- ✅ Nome location (required)
- ✅ Indirizzo completo (via, città, CAP, provincia)
- ✅ Provincie italiane complete (110 province)
- ✅ Telefono e Email
- ✅ Nome responsabile
- ✅ **Orari apertura interattivi** per ogni giorno
  - Toggle apertura/chiusura con animazione
  - Time picker per orari
  - Lun-Ven, Sabato, Domenica configurabili
- ✅ **Servizi offerti** (multi-select con toggle)
  - Tagliando, Gomme, Elettrica, Freni, Climatizzazione, Diagnostica, Carrozzeria, Revisione
- ✅ Capacità posti
- ✅ Numero box
- ✅ Note (textarea)
- ✅ Validazione completa
- ✅ **Design Apple 2026** (Liquid Glass, blur, animazioni)

### Uso
```tsx
import { LocationDialog, useLocationDialog } from '@/components/locations'

// Usa il hook
const { openDialog, LocationDialog, editingLocation } = useLocationDialog()

// Nel JSX
<LocationDialog onSuccess={() => refetchData()} />

// Crea nuova
<button onClick={() => openDialog()}>Nuova Location</button>

// Modifica esistente
<button onClick={() => openDialog(existingLocation)}>Modifica</button>
```

---

## 🎨 Design Apple 2026

### Caratteristiche Stilistiche
- **Liquid Glass**: Effetti backdrop-blur sui contenitori
- **Gradienti**: Colori Apple con transizioni morbide
- **Bordi arrotondati**: `rounded-[20px]` e `rounded-[28px]`
- **Ombre**: `shadow-apple`, `shadow-apple-lg`, `shadow-apple-hover`
- **Animazioni**: Framer Motion con spring physics
- **Colori Apple**:
  - Blue: `#0071e3`
  - Green: `#34c759`
  - Red: `#ff3b30`
  - Orange: `#ff9500`
  - Purple: `#af52de`
  - Gray: `#86868b`

### Componenti UI Utilizzati
- `AppleCard` - Card con effetto glass
- `AppleButton` - Pulsanti stile Apple
- `Form`, `FormField` - Form con React Hook Form
- `Input`, `Select`, `Textarea` - Input stilizzati
- `Dialog` - Modal da Radix UI

---

## 📁 Struttura File

```
mechmind-os/frontend/components/
├── invoices/
│   ├── index.ts                    # Esportazioni
│   ├── invoice-form.tsx            # Form principale (40KB)
│   ├── invoice-form-schema.ts      # Schema Zod (3KB)
│   ├── invoice-dialog.tsx          # Dialog con animazioni (9KB)
│   ├── financial-dashboard.tsx     # Esistente
│   └── stripe-payment.tsx          # Esistente
├── locations/
│   ├── index.ts                    # Esportazioni
│   ├── location-form.tsx           # Form principale (27KB)
│   ├── location-form-schema.ts     # Schema Zod (8KB)
│   ├── location-dialog.tsx         # Dialog con animazioni (10KB)
│   └── ...altri componenti esistenti
└── ui/
    ├── apple-card.tsx              # Card Apple
    ├── apple-button.tsx            # Button Apple
    ├── form.tsx                    # Form utilities
    ├── input.tsx                   # Input component
    ├── select.tsx                  # Select component
    └── dialog.tsx                  # Dialog component
```

---

## 🚀 Integrazione

I componenti sono pronti per l'uso nelle pagine:

```tsx
// app/dashboard/invoices/page.tsx
import { useInvoiceDialog } from '@/components/invoices'

// app/dashboard/locations/page.tsx
import { useLocationDialog } from '@/components/locations'
```

Entrambi utilizzano:
- React Hook Form per la gestione stato
- Zod per validazione
- Framer Motion per animazioni
- Tailwind CSS con tema Apple
