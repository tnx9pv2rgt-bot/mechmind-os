# code-reviewer — memoria persistente

## Pattern OWASP A01 ricorrenti

_(aggiornato dall'agent quando trova violazioni nuove. Massimo 200 righe.)_

## Moduli con storia di tenant leak

_(es. "booking-slot.service.ts: 3 violazioni in cronjob nel passato — controllo
extra in queste route")_

## Convenzioni MechMind specifiche

- `@TenantId()` decorator obbligatorio sugli endpoint tenant-scoped (NON
  `@Headers('x-tenant-id')`).
- Domain exceptions (`NotFoundException`, `ConflictException`,
  `BadRequestException`) — mai `HttpException` diretta.
- `validateTransition()` su ogni cambio status (booking, invoice, work-order).
- DTO con `@ApiProperty` + class-validator decorators.

## Eccezioni autorizzate alla regola tenantId

- Child models con parent tenant-checked (InspectionFinding, BookingSlot,
  WorkOrderItem)
- Cron cross-tenant (processPending, markOverdue, sendReminders)
- AuthService (query per userId globalmente unico)
- Webhook handlers (lookup external_id post-firma)
- GDPR (cross-tenant per legge)

## Lezioni accumulate

_(append-only, nuove righe sotto)_
