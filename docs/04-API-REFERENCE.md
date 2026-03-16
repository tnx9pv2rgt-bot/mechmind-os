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
