# MechMind OS — PR Workflow Example

Esempio completo di aggiunta feature: **Garanzia su Work Order** — possibilità di associare una garanzia a un ordine di lavoro.

## Step 0: Checklist Pre-Modifica

```
1. Cosa faccio? Aggiungo campo warrantyId opzionale a WorkOrder per collegare garanzie
2. Quali file tocco? schema.prisma, work-order.service.ts, dto-work-order.ts, work-order.service.spec.ts, work-order.controller.ts
3. Cosa rischio di rompere? WorkOrder CRUD, relazioni Prisma, booking → work order flow
4. C'è un modo più sicuro? Sì: campo opzionale, nessun breaking change, backward compatible
5. Rollback plan? Revert migration con migration correttiva forward-only
6. Ho letto i file coinvolti? Sì: cat prisma/schema.prisma | grep -A 20 "model WorkOrder"
```

## Step 1: Test che fallisce (RED)

```typescript
// backend/src/work-order/__tests__/work-order.service.spec.ts

describe('WorkOrderService', () => {
  let service: WorkOrderService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkOrderService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get(WorkOrderService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create work order with warranty', async () => {
      // Arrange
      const tenantId = 'tenant-uuid-123';
      const dto: CreateWorkOrderDto = {
        vehicleId: 'vehicle-uuid',
        customerId: 'customer-uuid',
        warrantyId: 'warranty-uuid',
      };

      const mockWorkOrder = {
        id: 'wo-uuid',
        tenantId,
        ...dto,
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.workOrder.create.mockResolvedValue(mockWorkOrder as any);

      // Act
      const result = await service.create(tenantId, dto, 'user-uuid');

      // Assert
      expect(result.warrantyId).toBe('warranty-uuid');
      expect(prisma.workOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            warrantyId: 'warranty-uuid',
            tenantId,
          }),
        }),
      );
    });

    it('should validate warranty belongs to same tenant', async () => {
      // Arrange
      const tenantId = 'tenant-uuid-123';
      const dto: CreateWorkOrderDto = {
        vehicleId: 'vehicle-uuid',
        customerId: 'customer-uuid',
        warrantyId: 'warranty-from-other-tenant',
      };

      prisma.warranty.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(tenantId, dto, 'user-uuid'))
        .rejects.toThrow('Warranty not found');
    });
  });
});
```

```bash
npm run test -- --testPathPattern=work-order
# FAIL: Property 'warrantyId' does not exist on type 'CreateWorkOrderDto'
```

## Step 2: Migration Prisma

```prisma
// prisma/schema.prisma — aggiunta a model WorkOrder

model WorkOrder {
  // ... campi esistenti ...

  // Warranty (opzionale)
  warrantyId String?   @map("warranty_id")
  warranty   Warranty? @relation(fields: [warrantyId], references: [id])

  // ... relazioni esistenti ...
}
```

```bash
npx prisma migrate dev --name add-warranty-to-work-order
npx prisma generate
```

**Verifica post-migration:**
- [x] Il campo è opzionale (String?) → nessun breaking change
- [x] `@@index([tenantId])` già presente su WorkOrder
- [x] Warranty ha già `tenantId` → isolamento OK
- [x] Nessuna modifica alle RLS policies necessaria (campo su tabella esistente)

## Step 3: DTO (class-validator)

```typescript
// backend/src/work-order/dto/create-work-order.dto.ts

export class CreateWorkOrderDto {
  // ... campi esistenti ...

  @ApiPropertyOptional({
    description: 'Warranty ID to associate with work order',
    example: '550e8400-e29b-41d4-a716-446655440099',
  })
  @IsOptional()
  @IsUUID()
  warrantyId?: string;
}
```

## Step 4: Zod Schema (service-level)

```typescript
// backend/src/work-order/schemas/create-work-order.schema.ts

const CreateWorkOrderSchema = z.object({
  vehicleId: z.string().uuid(),
  customerId: z.string().uuid(),
  technicianId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  warrantyId: z.string().uuid().optional(),
  diagnosis: z.string().max(2000).optional(),
  customerRequest: z.string().max(2000).optional(),
  mileageIn: z.number().int().min(0).optional(),
});
```

## Step 5: Service

```typescript
// backend/src/work-order/services/work-order.service.ts

async create(tenantId: string, dto: CreateWorkOrderDto, userId: string): Promise<WorkOrder> {
  const validated = CreateWorkOrderSchema.parse(dto);

  // Verifica warranty appartiene allo stesso tenant (se fornita)
  if (validated.warrantyId) {
    const warranty = await this.prisma.warranty.findFirst({
      where: { id: validated.warrantyId, tenantId },
    });
    if (!warranty) {
      throw new NotFoundException('Warranty not found');
    }
    if (warranty.expiresAt && warranty.expiresAt < new Date()) {
      throw new BadRequestException('Warranty expired');
    }
  }

  return this.prisma.workOrder.create({
    data: {
      ...validated,
      tenantId,
      createdBy: userId,
      status: 'OPEN',
    },
  });
}
```

**Nota:** La query `warranty.findFirst` usa `{ id, tenantId }` — non solo `id`. Questo è il pattern corretto: anche se RLS filtra già, il check esplicito previene errori se il middleware fallisce.

## Step 6: Controller

Nessuna modifica necessaria: il controller passa il DTO al service, il nuovo campo opzionale è già incluso automaticamente da `@Body() dto: CreateWorkOrderDto`.

## Step 7: Test verde (GREEN)

```bash
npm run test -- --testPathPattern=work-order
# PASS: 2 nuovi test passano

npm run test
# PASS: tutti i test passano (nessuna regressione)
```

## Step 8: Verifica completa

```bash
npx tsc --noEmit          # zero errori TypeScript
npm run lint              # zero warning
npm run test              # tutti i test passano
npm run build             # build OK
```

## Step 9: Commit

```bash
git add .
git commit -m "feat(work-order): add optional warranty association

- Add warrantyId field to WorkOrder model (optional, nullable)
- Validate warranty exists in same tenant before association
- Validate warranty not expired
- Add unit tests for warranty association and cross-tenant validation
- Migration: add-warranty-to-work-order"
```

---

## Checklist Finale PR

- [x] Checklist pre-modifica completata
- [x] Test scritto PRIMA dell'implementazione (TDD)
- [x] Migration Prisma con campo opzionale (backward compatible)
- [x] DTO con class-validator decorators
- [x] Zod schema sincronizzato col DTO
- [x] Service: check cross-tenant esplicito (warrantyId + tenantId)
- [x] Service: domain exceptions (NotFoundException, BadRequestException)
- [x] Controller: nessuna modifica necessaria (campo opzionale nel DTO)
- [x] `npx tsc --noEmit` ✅
- [x] `npm run lint` ✅
- [x] `npm run test` ✅
- [x] `npm run build` ✅
- [x] Commit message con tipo(scope): descrizione

---

## Anti-Pattern: Cosa NON fare

```typescript
// ❌ Query senza tenantId
const warranty = await this.prisma.warranty.findUnique({
  where: { id: dto.warrantyId },  // MANCA tenantId!
});

// ❌ throw new Error() generico
if (!warranty) throw new Error('Not found');

// ❌ PII in log
this.logger.log(`Creating work order for customer ${customer.email}`);

// ❌ Modifica diretta a campo esistente senza migration
// (es. cambiare tipo da String? a String senza default)

// ❌ Skip dei test
git commit -m "feat: add warranty" --no-verify
```
