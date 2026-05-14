# backend-engineer — memoria persistente

## Convenzioni MechMind
- @TenantId() decorator obbligatorio (NOT @Headers).
- Domain exceptions only: NotFoundException, ConflictException, BadRequestException. MAI HttpException.
- DTO con @ApiProperty + class-validator decorators.
- Service: pubbliche → return type esplicito.

## Pattern Prisma riusabili
- Multi-tenant query: where: { tenantId, ...rest }
- Booking: acquireAdvisoryLock + withSerializableTransaction
- PII: encryptionService.encryptFields(data, ['firstName','lastName','email','phone'])

## Errori TS comuni nel repo
_(append: codice errore + fix)_

## Coverage target: 90/90 sempre
