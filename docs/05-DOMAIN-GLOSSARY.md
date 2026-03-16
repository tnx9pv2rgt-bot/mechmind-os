# MechMind OS — Domain Glossary

## Enum Prisma — Modello Dati

### Customer

| Enum | Valori | Descrizione |
|------|--------|-------------|
| `CustomerType` | `PRIVATE`, `COMPANY`, `FLEET` | Tipo di cliente: privato, azienda, flotta |
| `ContactChannel` | `EMAIL`, `SMS`, `WHATSAPP`, `PUSH` | Canale di comunicazione preferito |
| `CustomerSource` | `WEB`, `PHONE`, `WALK_IN`, `REFERRAL`, `SOCIAL` | Come il cliente ha scoperto l'officina |

### Vehicle

| Enum | Valori | Descrizione |
|------|--------|-------------|
| `FuelType` | `PETROL`, `DIESEL`, `LPG`, `CNG`, `ELECTRIC`, `HYBRID_PETROL`, `HYBRID_DIESEL`, `HYDROGEN` | Tipo di alimentazione |
| `TransmissionType` | `MANUAL`, `AUTOMATIC`, `SEMI_AUTOMATIC`, `CVT` | Tipo di cambio |
| `DriveType` | `FWD`, `RWD`, `AWD`, `FOUR_WD` | Tipo di trazione |

### Invoice (Compliance Fiscale IT)

| Enum | Valori | Descrizione |
|------|--------|-------------|
| `InvoiceDocumentType` | `INVOICE`, `CREDIT_NOTE`, `PROFORMA` | Tipo documento fiscale |
| `InvoiceItemType` | `SERVICE`, `PART`, `LABOR`, `DISCOUNT`, `OTHER` | Tipo riga fattura |
| `PaymentMethod` | `BANK_TRANSFER`, `CASH`, `CREDIT_CARD`, `POS`, `SEPA_DD` | Metodo di pagamento (FatturaPA MP) |
| `PaymentTerms` | `IMMEDIATE`, `NET_15`, `NET_30`, `NET_60`, `NET_90` | Termini di pagamento |
| `TaxRegime` | `ORDINARY`, `FORFETTARIO`, `MINIMUM`, `AGRICULTURAL` | Regime fiscale (FatturaPA RF) |
| `SdiStatus` | `NOT_SENT`, `SENT`, `DELIVERED`, `REJECTED`, `ACCEPTED` | Stato trasmissione SDI |

### Booking

| Enum | Valori | Descrizione |
|------|--------|-------------|
| `BookingStatus` | `PENDING`, `CONFIRMED`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW` | Stato prenotazione |

### Invoice

| Enum | Valori | Descrizione |
|------|--------|-------------|
| `InvoiceStatus` | `DRAFT`, `SENT`, `PAID`, `OVERDUE`, `CANCELLED` | Stato fattura |

## Termini Business

| Termine | Definizione |
|---------|-------------|
| **Codice Fiscale** | Codice alfanumerico 16 caratteri, identifica univocamente persona fisica italiana. Pattern: `^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$` |
| **Partita IVA** | Numero 11 cifre, identifica soggetto ai fini IVA. Pattern: `^\d{11}$` |
| **SDI** | Sistema di Interscambio — piattaforma Agenzia delle Entrate per fatturazione elettronica |
| **Codice SDI** | Codice 7 caratteri per indirizzamento fatture elettroniche via SDI |
| **PEC** | Posta Elettronica Certificata — email certificata con valore legale |
| **FatturaPA** | Formato XML standard per fatturazione elettronica verso PA e tra privati |
| **Regime Forfettario** | Regime fiscale agevolato per partite IVA con ricavi < €85.000 |
| **Nota di Credito** | Documento fiscale che annulla/rettifica una fattura precedente |
| **Imposta di Bollo** | Marca da bollo €2 obbligatoria su fatture esenti IVA > €77,47 |

## Termini Tecnici

| Termine | Definizione |
|---------|-------------|
| **RLS** | Row Level Security — PostgreSQL filtra righe per tenant_id automaticamente |
| **Advisory Lock** | Lock PostgreSQL non bloccante usato per prenotazioni concurrent |
| **SERIALIZABLE** | Livello di isolamento transazione più restrittivo, previene phantom reads |
| **State Machine** | Pattern per validare transizioni di stato (es. DRAFT → SENT, mai DRAFT → PAID) |
| **TransitionMap** | `Record<string, string[]>` — mappa stato corrente → stati successivi consentiti |
