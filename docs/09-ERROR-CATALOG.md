# MechMind OS — Error Catalog

## State Machine Errors

Utility: `common/utils/state-machine.ts` — `validateTransition(currentStatus, newStatus, transitions, entityName)`

### Invoice Module

**Transizioni valide:**
```
DRAFT    → SENT, CANCELLED
SENT     → PAID, OVERDUE, CANCELLED
OVERDUE  → PAID, CANCELLED
PAID     → (nessuna — stato terminale)
CANCELLED → (nessuna — stato terminale)
```

**Errore:** `BadRequestException`
```
Invalid invoice status transition: DRAFT → PAID. Allowed from DRAFT: SENT, CANCELLED
```

### Booking Module

**Transizioni valide:**
```
PENDING     → CONFIRMED, CANCELLED
CONFIRMED   → CHECKED_IN, CANCELLED, NO_SHOW
CHECKED_IN  → IN_PROGRESS
IN_PROGRESS → COMPLETED
COMPLETED   → (nessuna — stato terminale)
CANCELLED   → (nessuna — stato terminale)
NO_SHOW     → (nessuna — stato terminale)
```

**Errore:** `BadRequestException`
```
Invalid booking status transition: COMPLETED → PENDING. Allowed from COMPLETED: none
```

## Invoice Module Errors

| Errore | Tipo | Condizione |
|--------|------|------------|
| `Invoice with id {id} not found` | `NotFoundException` | Invoice non trovata per tenant |
| `Only DRAFT invoices can be fully edited` | `BadRequestException` | Tentativo di modificare campi (non status) su fattura non-DRAFT |
| `Only DRAFT invoices can be deleted` | `BadRequestException` | Tentativo di eliminare fattura non-DRAFT |
| `Only DRAFT invoices can be sent` | `BadRequestException` | Tentativo di inviare fattura non-DRAFT |
| `Invoice is already paid` | `BadRequestException` | Tentativo di marcare come pagata una fattura già PAID |
| `Cannot mark a cancelled invoice as paid` | `BadRequestException` | Tentativo di marcare come pagata una fattura CANCELLED |

## Booking Module Errors

| Errore | Tipo | Condizione |
|--------|------|------------|
| `Slot {slotId} not found` | `NotFoundException` | Slot non trovato per tenant |
| `Slot is not available (status: {status})` | `ConflictException` | Slot non disponibile (già prenotato) |
| `Customer {customerId} not found` | `NotFoundException` | Cliente non trovato per tenant |
| `Booking {bookingId} not found` | `NotFoundException` | Prenotazione non trovata per tenant |
| `Booking conflict detected. Please try again.` | `ConflictException` | Errore Prisma P2034 (serialization failure) |
| `Slot is currently being reserved by another request.` | N/A (JSON response) | Advisory lock non acquisito — queued per retry |

## Customer Module Errors

| Errore | Tipo | Condizione |
|--------|------|------------|
| `Customer with id {id} not found` | `NotFoundException` | Cliente non trovato per tenant |
| `Customer with this phone number already exists` | `ConflictException` | Duplicato phone hash per tenant |

## Common / Infrastructure Errors

| Errore | Tipo | Source |
|--------|------|--------|
| `Encryption key not configured` | `InternalServerErrorException` | EncryptionService — ENCRYPTION_KEY mancante |
| `Decryption failed` | `InternalServerErrorException` | EncryptionService — dati corrotti o key errata |
| `Advisory lock acquisition failed` | `ConflictException` | lock-utils — lock non ottenuto |
| `Queue service unavailable` | `InternalServerErrorException` | QueueService — Redis/BullMQ down |
