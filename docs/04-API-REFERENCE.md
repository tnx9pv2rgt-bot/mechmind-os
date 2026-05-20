# MechMind OS — API Reference (DTO Fields)

## Customer DTOs

### CreateCustomerDto

| Campo | Tipo | Validazione | Obbligatorio |
|-------|------|-------------|--------------|
| `firstName` | string | `@IsString` | Si |
| `lastName` | string | `@IsString` | Si |
| `phone` | string | `@IsString` | Si |
| `email` | string | `@IsEmail` | No |
| `customerType` | enum | `CustomerType: PRIVATE, COMPANY, FLEET` | No |
| `codiceFiscale` | string | `@Matches(/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/)` | No |
| `partitaIva` | string | `@Matches(/^\d{11}$/)` | No |
| `sdiCode` | string | `@Length(7,7)` | No |
| `pecEmail` | string | `@IsEmail` | No |
| `address` | string | `@IsString` | No |
| `city` | string | `@IsString` | No |
| `postalCode` | string | `@Matches(/^\d{5}$/)` | No |
| `province` | string | `@Length(2,2)` | No |
| `country` | string | `@IsString` default `'IT'` | No |
| `preferredChannel` | enum | `ContactChannel: EMAIL, SMS, WHATSAPP, PUSH` | No |
| `source` | enum | `CustomerSource: WEB, PHONE, WALK_IN, REFERRAL, SOCIAL` | No |

### UpdateCustomerDto

Tutti i campi di `CreateCustomerDto` come opzionali.

---

## Vehicle DTOs

### CreateVehicleDto

| Campo | Tipo | Validazione | Obbligatorio |
|-------|------|-------------|--------------|
| `customerId` | string | `@IsUUID` | Si |
| `licensePlate` | string | `@IsString` | Si |
| `make` | string | `@IsString` | Si |
| `model` | string | `@IsString` | Si |
| `year` | number | `@IsInt` | No |
| `vin` | string | `@IsString` | No |
| `fuelType` | enum | `FuelType: PETROL, DIESEL, LPG, CNG, ELECTRIC, HYBRID_PETROL, HYBRID_DIESEL, HYDROGEN` | No |
| `engineDisplacement` | number | `@IsInt @Min(50) @Max(10000)` cc | No |
| `power` | number | `@IsInt @Min(1) @Max(2000)` kW | No |
| `transmissionType` | enum | `TransmissionType: MANUAL, AUTOMATIC, SEMI_AUTOMATIC, CVT` | No |
| `color` | string | `@IsString` | No |
| `driveType` | enum | `DriveType: FWD, RWD, AWD, FOUR_WD` | No |
| `registrationDate` | string | `@IsDateString` ISO date | No |
| `insuranceExpiry` | string | `@IsDateString` ISO date | No |
| `taxExpiry` | string | `@IsDateString` ISO date | No |

### UpdateVehicleDto

Tutti i campi di `CreateVehicleDto` come opzionali.

---

## Invoice DTOs

### CreateInvoiceItemDto

| Campo | Tipo | Validazione | Obbligatorio |
|-------|------|-------------|--------------|
| `description` | string | `@IsString @IsNotEmpty` | Si |
| `itemType` | enum | `InvoiceItemType: SERVICE, PART, LABOR, DISCOUNT, OTHER` | Si |
| `quantity` | number | `@IsNumber @Min(0.001)` | Si |
| `unitPrice` | number | `@IsNumber @Min(0)` | Si |
| `vatRate` | number | `@IsNumber @Min(0) @Max(100)` default `22` | Si |
| `discount` | number | `@IsNumber @Min(0) @Max(100)` | No |
| `partId` | string | `@IsUUID` | No |

### CreateInvoiceDto

| Campo | Tipo | Validazione | Obbligatorio |
|-------|------|-------------|--------------|
| `customerId` | string | `@IsUUID` | Si |
| `items` | array | `CreateInvoiceItemDto[]` | Si |
| `taxRate` | number | `@IsNumber` | No |
| `notes` | string | `@IsString` | No |
| `dueDate` | string | `@IsDateString` | No |
| `bookingId` | string | `@IsUUID` | No |
| `workOrderId` | string | `@IsUUID` | No |
| `documentType` | enum | `InvoiceDocumentType: INVOICE, CREDIT_NOTE, PROFORMA` | No |
| `paymentMethod` | enum | `PaymentMethod: BANK_TRANSFER, CASH, CREDIT_CARD, POS, SEPA_DD` | No |
| `paymentTerms` | enum | `PaymentTerms: IMMEDIATE, NET_15, NET_30, NET_60, NET_90` | No |
| `taxRegime` | enum | `TaxRegime: ORDINARY, FORFETTARIO, MINIMUM, AGRICULTURAL` | No |

### UpdateInvoiceDto

| Campo | Tipo | Validazione | Obbligatorio |
|-------|------|-------------|--------------|
| `status` | enum | `InvoiceStatus: DRAFT, SENT, PAID, OVERDUE, CANCELLED` — validato da state machine | No |
| Altri campi | — | Come `CreateInvoiceDto`, tutti opzionali | No |

**Nota:** Le transizioni di stato sono validate dalla state machine. Vedere `docs/09-ERROR-CATALOG.md` per le transizioni valide.

---

## WorkOrder DTOs

### CreateWorkOrderDto

| Campo | Tipo | Validazione | Note |
|-------|------|-------------|------|
| `vehicleId` | string | `@IsUUID` | Cambiato da `@IsString` a `@IsUUID` |
| `customerId` | string | `@IsUUID` | Cambiato da `@IsString` a `@IsUUID` |

---

## Endpoints

### Work Orders

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/work-orders/:id/check-in` | Registra il check-in del veicolo in officina |
| `POST` | `/work-orders/:id/check-out` | Registra il check-out del veicolo dall'officina |
| `POST` | `/work-orders/:id/timer/start` | Avvia il timer del tecnico per tracciare le ore lavorate |
| `POST` | `/work-orders/:id/timer/stop` | Ferma il timer del tecnico |
| `GET` | `/work-orders/:id/timer` | Restituisce lo stato corrente del timer (attivo/fermo, durata) |

### Estimates

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/estimates/:id/convert-to-work-order` | Converte un preventivo approvato in ordine di lavoro |
| `GET` | `/estimates/:id/pdf` | Scarica il preventivo in formato PDF |

### Inspections (DVI)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/inspections/:id/create-estimate` | Crea un preventivo a partire dai risultati dell'ispezione |
| `GET` | `/inspections/:id/pdf` | Scarica il report dell'ispezione in formato PDF |

### Vehicles

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/vehicles/decode-vin/:vin` | Decodifica un VIN tramite NHTSA API e restituisce marca, modello, anno e specifiche |

### Customers

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/customers/import` | Importa clienti da file CSV |
| `GET` | `/customers/export` | Esporta l'elenco clienti in formato CSV |

### Invoices

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/invoices/:id/fatturapa` | Genera il file XML FatturaPA per fatturazione elettronica SDI |
| `GET` | `/invoices/:id/pdf` | Scarica la fattura in formato PDF |
| `POST` | `/invoices/:id/refund` | Emette un rimborso totale o parziale per la fattura |

### Accounting

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/accounting/export/quickbooks` | Esporta le fatture nel formato compatibile QuickBooks |

### Analytics

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/analytics/kpi` | Restituisce il riepilogo KPI per la dashboard (fatturato, ordini, tempi medi) |

### Search

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/search?q=` | Ricerca globale tra clienti, veicoli, ordini di lavoro e fatture |

### Settings

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/settings` | Restituisce le impostazioni del tenant corrente |
| `PATCH` | `/settings` | Aggiorna le impostazioni del tenant (nome officina, orari, valuta, ecc.) |
| `POST` | `/settings/logo` | Carica il logo dell'officina (multipart/form-data) |
