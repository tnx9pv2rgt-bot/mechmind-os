# Test Setup Guide — MechMind OS

## Jest Configuration
- Config: `backend/jest.config.ts`
- Test runner: Jest 29 con ts-jest
- Timeout: 10s per test
- Comando: `npx jest --forceExit` (MAI in parallelo)

## Mock Library
- `jest-mock-extended` per mock tipizzati
- `mockDeep<PrismaClient>()` per PrismaService
- `mockDeep<ServiceName>()` per altri servizi

## Test Database
- MAI usare database reale nei test unitari
- Mock PrismaService con `mockDeep`
- Per integration test: Docker PostgreSQL separato

## File Organization
```
backend/src/<module>/
├── controllers/
│   ├── <module>.controller.ts
│   └── <module>.controller.spec.ts  ← test controller
├── services/
│   ├── <module>.service.ts
│   └── <module>.service.spec.ts     ← test service
└── dto/
    ├── create-<module>.dto.ts
    └── update-<module>.dto.ts
```

## Mock Data Factories
```typescript
// Usa factory functions per dati consistenti
const createMockBooking = (overrides = {}) => ({
  id: 'booking-uuid-1',
  tenantId: 'tenant-uuid-1',
  customerId: 'customer-uuid-1',
  status: 'PENDING',
  scheduledDate: new Date('2026-03-20T10:00:00Z'),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
```

## Common Pitfalls
1. **Dimenticare tenantId nei mock** → test passa ma codice ha bug di sicurezza
2. **Usare `any` nei mock** → perde type safety
3. **Test che dipendono dall'ordine** → usa `beforeEach` per reset
4. **Mock troppo specifici** → fragili, si rompono a ogni refactoring
5. **Nessun test error path** → copri anche NotFoundException, ConflictException
