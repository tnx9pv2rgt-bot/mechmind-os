---
name: pattern-test
description: Pattern di testing NestJS per MechMind. Consulta quando scrivi test unitari, mock PrismaService, o test controller/service.
allowed-tools: [Read, Write, Grep, "Bash(npx jest *)"]
user-invocable: false
paths: ["backend/src/**/*.spec.ts"]
---

# Testing Patterns — MechMind OS

## Setup base

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';

describe('ExampleService', () => {
  let service: ExampleService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExampleService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get(ExampleService);
    prisma = module.get(PrismaService);
  });
```

## Mock EncryptionService
```typescript
const mockEncryption = {
  encrypt: jest.fn((val: string) => `encrypted_${val}`),
  decrypt: jest.fn((val: string) => val.replace('encrypted_', '')),
};
// In providers:
{ provide: EncryptionService, useValue: mockEncryption },
```

## Pattern test
```typescript
// Arrange/Act/Assert — 1 test happy + 1 error per metodo
it('should find all items for tenant', async () => {
  // Arrange
  const tenantId = 'tenant-123';
  const mockItems = [{ id: '1', tenantId, name: 'Test' }];
  prisma.example.findMany.mockResolvedValue(mockItems);
  prisma.example.count.mockResolvedValue(1);

  // Act
  const result = await service.findAll(tenantId, { page: 1, limit: 20 });

  // Assert
  expect(result.data).toEqual(mockItems);
  expect(result.meta.total).toBe(1);
  expect(prisma.example.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { tenantId } }),
  );
});

it('should throw NotFoundException when item not found', async () => {
  prisma.example.findFirst.mockResolvedValue(null);
  await expect(service.findOne('bad-id', 'tenant-123'))
    .rejects.toThrow(NotFoundException);
});
```

## Regole
- **TDD**: test RED prima, poi implementa fino a GREEN
- **Naming**: `should <azione> when <condizione>`
- **tenantId**: SEMPRE presente nei mock e nelle assertion
- **1:1**: minimo 1 test happy + 1 test error per metodo pubblico
- **Isolamento**: ogni test indipendente, `beforeEach` per setup
- **No network**: mock TUTTI i servizi esterni
- **No sleep**: mai `setTimeout` nei test, usa mock timer se necessario

## Controller test
```typescript
describe('ExampleController', () => {
  let controller: ExampleController;
  let service: DeepMockProxy<ExampleService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ExampleController],
      providers: [
        { provide: ExampleService, useValue: mockDeep<ExampleService>() },
      ],
    }).compile();

    controller = module.get(ExampleController);
    service = module.get(ExampleService);
  });

  it('should return paginated list', async () => {
    const tenantId = 'tenant-123';
    const expected = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    service.findAll.mockResolvedValue(expected);

    const result = await controller.findAll(tenantId, 1, 20);
    expect(result).toEqual(expected);
    expect(service.findAll).toHaveBeenCalledWith(tenantId, { page: 1, limit: 20 });
  });
});
```

## Comando
```bash
# Singolo modulo
npx jest --testPathPattern=<modulo> --verbose

# Tutti i test
cd backend && npx jest --forceExit

# Con coverage
npx jest --coverage --testPathPattern=<modulo>
```
