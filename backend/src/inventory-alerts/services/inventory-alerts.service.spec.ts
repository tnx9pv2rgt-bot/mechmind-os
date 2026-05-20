import { Test, TestingModule } from '@nestjs/testing';
import { InventoryAlertsService } from './inventory-alerts.service';
import { PrismaService } from '../../common/services/prisma.service';

// ---------------------------------------------------------------------------
// Type helpers for Prisma mock delegates
// ---------------------------------------------------------------------------

interface MockPartDelegate {
  findMany: jest.Mock;
}

interface MockTenantDelegate {
  findMany: jest.Mock;
}

interface MockAiDecisionLogDelegate {
  create: jest.Mock;
}

interface MockPrisma {
  part: MockPartDelegate;
  tenant: MockTenantDelegate;
  aiDecisionLog: MockAiDecisionLogDelegate;
}

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TENANT_ID_1 = 'tenant-001';
const TENANT_ID_2 = 'tenant-002';
const PART_ID = 'part-001';
const INVENTORY_ITEM_ID = 'inv-item-001';

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

function makeMockPart(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: PART_ID,
    tenantId: TENANT_ID_1,
    sku: 'BRK-001',
    name: 'Brake Pad Set',
    description: 'Front brake pads',
    category: 'BRAKES',
    minStockLevel: 5,
    reorderPoint: 10,
    isActive: true,
    inventory: [
      {
        id: INVENTORY_ITEM_ID,
        quantity: 3, // Below minStockLevel (5)
        reserved: 0,
        available: 3,
      },
    ],
    ...overrides,
  };
}

function makeMockTenant(id: string, name: string): Record<string, unknown> {
  return { id, name, isActive: true };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('InventoryAlertsService', () => {
  let service: InventoryAlertsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    // Mock PrismaService delegates
    const mockPrisma = {
      part: {
        findMany: jest.fn(),
      },
      tenant: {
        findMany: jest.fn(),
      },
      aiDecisionLog: {
        create: jest.fn(),
      },
    } as unknown as MockPrisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryAlertsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<InventoryAlertsService>(InventoryAlertsService);
    prisma = module.get<MockPrisma>(PrismaService);
  });

  describe('sendLowStockAlerts', () => {
    it('should find parts below minStockLevel and create notifications', async () => {
      // Arrange
      const lowStockPart = makeMockPart();
      const normalStockPart = makeMockPart({
        id: 'part-002',
        sku: 'ENG-001',
        name: 'Engine Oil Filter',
        inventory: [{ id: 'inv-item-002', quantity: 50, reserved: 0, available: 50 }],
      });

      prisma.part.findMany.mockResolvedValue([lowStockPart, normalStockPart]);
      prisma.aiDecisionLog.create.mockResolvedValue({ id: 'log-001' });

      // Act
      const result = await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      expect(result).toBe(1); // Only 1 low-stock part
      expect(prisma.part.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID_1,
            isActive: true,
          },
        }),
      );
      expect(prisma.aiDecisionLog.create).toHaveBeenCalledTimes(1);
      const createCall = (prisma.aiDecisionLog.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.tenantId).toBe(TENANT_ID_1);
      expect(createCall.data.inputSummary).toContain('BRK-001');
      expect(createCall.data.featureName).toBe('inventory-alerts');
    });

    it('should skip parts with quantity > minStockLevel', async () => {
      // Arrange
      const normalStockPart = makeMockPart({
        inventory: [{ id: INVENTORY_ITEM_ID, quantity: 10, reserved: 0, available: 10 }],
      });

      prisma.part.findMany.mockResolvedValue([normalStockPart]);

      // Act
      const result = await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      expect(result).toBe(0);
      expect(prisma.aiDecisionLog.create).not.toHaveBeenCalled();
    });

    it('should return 0 when no parts found', async () => {
      // Arrange
      prisma.part.findMany.mockResolvedValue([]);

      // Act
      const result = await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      expect(result).toBe(0);
      expect(prisma.aiDecisionLog.create).not.toHaveBeenCalled();
    });

    it('should handle notification creation errors gracefully', async () => {
      // Arrange
      const lowStockPart = makeMockPart();
      prisma.part.findMany.mockResolvedValue([lowStockPart]);
      prisma.aiDecisionLog.create.mockRejectedValue(new Error('DB error'));

      // Act
      const result = await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      expect(result).toBe(0); // Failed to log alert
      expect(prisma.aiDecisionLog.create).toHaveBeenCalled();
    });

    it('should enforce tenant isolation with tenantId filter', async () => {
      // Arrange
      const part = makeMockPart({ tenantId: TENANT_ID_1 });
      prisma.part.findMany.mockResolvedValue([part]);
      prisma.aiDecisionLog.create.mockResolvedValue({ id: 'log-001' });

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      expect(prisma.part.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID_1,
          }),
        }),
      );
      expect(prisma.aiDecisionLog.create).toHaveBeenCalled();
      const createCall = (prisma.aiDecisionLog.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.tenantId).toBe(TENANT_ID_1);
    });
  });

  describe('runForAllTenants', () => {
    it('should process alerts for all active tenants', async () => {
      // Arrange
      const tenants = [
        makeMockTenant(TENANT_ID_1, 'Workshop 1'),
        makeMockTenant(TENANT_ID_2, 'Workshop 2'),
      ];
      prisma.tenant.findMany.mockResolvedValue(tenants);
      prisma.part.findMany.mockResolvedValue([]);

      // Act
      const result = await service.runForAllTenants();

      // Assert
      expect(result.tenantsProcessed).toBe(2);
      expect(result.alertsCreated).toBe(0);
      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { id: true, name: true },
      });
      expect(prisma.part.findMany).toHaveBeenCalledTimes(2);
    });

    it('should accumulate alerts across multiple tenants', async () => {
      // Arrange
      const tenants = [
        makeMockTenant(TENANT_ID_1, 'Workshop 1'),
        makeMockTenant(TENANT_ID_2, 'Workshop 2'),
      ];
      const lowStockPart1 = makeMockPart({ tenantId: TENANT_ID_1 });
      const lowStockPart2 = makeMockPart({ tenantId: TENANT_ID_2 });

      prisma.tenant.findMany.mockResolvedValue(tenants);
      prisma.part.findMany
        .mockResolvedValueOnce([lowStockPart1])
        .mockResolvedValueOnce([lowStockPart2]);
      prisma.aiDecisionLog.create.mockResolvedValue({ id: 'log-001' });

      // Act
      const result = await service.runForAllTenants();

      // Assert
      expect(result.tenantsProcessed).toBe(2);
      expect(result.alertsCreated).toBe(2);
    });

    it('should handle tenant processing errors gracefully', async () => {
      // Arrange
      const tenants = [makeMockTenant(TENANT_ID_1, 'Workshop 1')];
      prisma.tenant.findMany.mockResolvedValue(tenants);
      prisma.part.findMany.mockRejectedValue(new Error('DB error'));

      // Act
      const result = await service.runForAllTenants();

      // Assert
      expect(result.tenantsProcessed).toBe(1);
      expect(result.alertsCreated).toBe(0);
    });

    it('should only process active tenants', async () => {
      // Arrange
      const activeTenant = makeMockTenant(TENANT_ID_1, 'Active Workshop');
      const _inactiveTenant = {
        ...makeMockTenant(TENANT_ID_2, 'Inactive Workshop'),
        isActive: false,
      };
      prisma.tenant.findMany.mockResolvedValue([activeTenant]);
      prisma.part.findMany.mockResolvedValue([]);

      // Act
      await service.runForAllTenants();

      // Assert
      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { id: true, name: true },
      });
      expect(prisma.part.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('alert logging', () => {
    it('should include part details in audit log', async () => {
      // Arrange
      const lowStockPart = makeMockPart({
        sku: 'OIL-100',
        name: 'Synthetic Engine Oil',
        minStockLevel: 5,
        inventory: [{ id: INVENTORY_ITEM_ID, quantity: 2, reserved: 0, available: 2 }],
      });
      prisma.part.findMany.mockResolvedValue([lowStockPart]);
      prisma.aiDecisionLog.create.mockResolvedValue({ id: 'log-001' });

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      expect(prisma.aiDecisionLog.create).toHaveBeenCalled();
      const createCall = (prisma.aiDecisionLog.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.outputSummary).toContain('Synthetic Engine Oil');
      expect(createCall.data.inputSummary).toContain('OIL-100');
      expect(createCall.data.entityType).toBe('Part');
    });

    it('should handle parts with missing inventory array gracefully', async () => {
      // Arrange: test the filter logic when inventory[0] doesn't exist
      const partWithoutInventory = makeMockPart({
        inventory: [], // Empty array — inventory[0] will be undefined
      });
      const partWithInventory = makeMockPart({
        id: 'part-002',
        sku: 'PAD-002',
        inventory: [{ id: 'inv-002', quantity: 3, reserved: 0, available: 3 }],
      });
      prisma.part.findMany.mockResolvedValueOnce([partWithoutInventory, partWithInventory]);
      prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-001' });

      // Act
      const result = await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      expect(result).toBe(1); // Only the part WITH inventory creates alert
      expect(prisma.aiDecisionLog.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle error that is not an Error instance in sendLowStockAlerts', async () => {
      // Arrange: force a string error (not Error instance)
      const lowStockPart = makeMockPart();
      prisma.part.findMany.mockResolvedValueOnce([lowStockPart]);
      prisma.aiDecisionLog.create.mockRejectedValueOnce('String error, not Error instance');

      // Act
      const result = await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert: should catch and log the error, return 0
      expect(result).toBe(0);
      expect(prisma.aiDecisionLog.create).toHaveBeenCalledTimes(1);
    });

    it('should handle error that is not an Error instance in runForAllTenants', async () => {
      // Arrange: force a string error in tenant discovery
      prisma.tenant.findMany.mockRejectedValueOnce('String error, not Error instance');

      // Act
      const result = await service.runForAllTenants();

      // Assert
      expect(result.tenantsProcessed).toBe(0);
      expect(result.alertsCreated).toBe(0);
      expect(prisma.tenant.findMany).toHaveBeenCalledTimes(1);
    });

    it('should handle outer error boundary in sendLowStockAlerts (findMany throws)', async () => {
      // Arrange: make findMany throw an error
      prisma.part.findMany.mockRejectedValueOnce(new Error('DB connection lost'));

      // Act
      const result = await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert: should catch and return 0
      expect(result).toBe(0);
    });

    it('should handle outer error boundary in runForAllTenants (findMany throws)', async () => {
      // Arrange
      const tenants = [makeMockTenant(TENANT_ID_1, 'Workshop 1')];
      prisma.tenant.findMany.mockResolvedValueOnce(tenants);
      prisma.part.findMany.mockRejectedValueOnce(new Error('DB connection lost'));

      // Act
      const result = await service.runForAllTenants();

      // Assert
      expect(result.tenantsProcessed).toBe(1); // Tenant was found
      expect(result.alertsCreated).toBe(0); // But alert processing failed
    });
  });

  describe('boundary conditions', () => {
    it('should handle empty tenants array in runForAllTenants', async () => {
      // Arrange
      prisma.tenant.findMany.mockResolvedValueOnce([]);

      // Act
      const result = await service.runForAllTenants();

      // Assert
      expect(result.tenantsProcessed).toBe(0);
      expect(result.alertsCreated).toBe(0);
      expect(prisma.part.findMany).not.toHaveBeenCalled();
    });

    it('should process multiple low-stock parts in single tenant correctly', async () => {
      // Arrange: 3 low-stock parts, 2 normal stock parts
      const lowStock1 = makeMockPart({ id: 'part-1', sku: 'P1' });
      const lowStock2 = makeMockPart({ id: 'part-2', sku: 'P2' });
      const lowStock3 = makeMockPart({ id: 'part-3', sku: 'P3' });
      const normalStock1 = makeMockPart({
        id: 'part-4',
        sku: 'P4',
        inventory: [{ id: 'inv-4', quantity: 100, reserved: 0, available: 100 }],
      });
      const normalStock2 = makeMockPart({
        id: 'part-5',
        sku: 'P5',
        inventory: [{ id: 'inv-5', quantity: 50, reserved: 0, available: 50 }],
      });

      prisma.part.findMany.mockResolvedValueOnce([
        lowStock1,
        normalStock1,
        lowStock2,
        normalStock2,
        lowStock3,
      ]);
      prisma.aiDecisionLog.create
        .mockResolvedValueOnce({ id: 'log-1' })
        .mockResolvedValueOnce({ id: 'log-2' })
        .mockResolvedValueOnce({ id: 'log-3' });

      // Act
      const result = await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert: should create exactly 3 alerts for 3 low-stock parts
      expect(result).toBe(3);
      expect(prisma.aiDecisionLog.create).toHaveBeenCalledTimes(3);
    });

    it('should correctly filter parts with stock exactly at minStockLevel', async () => {
      // Arrange: part with quantity === minStockLevel should trigger alert
      const atThreshold = makeMockPart({
        minStockLevel: 5,
        inventory: [{ id: INVENTORY_ITEM_ID, quantity: 5, reserved: 0, available: 5 }], // 5 <= 5 = true
      });
      const aboveThreshold = makeMockPart({
        id: 'part-2',
        minStockLevel: 5,
        inventory: [{ id: 'inv-2', quantity: 6, reserved: 0, available: 6 }], // 6 <= 5 = false
      });

      prisma.part.findMany.mockResolvedValueOnce([atThreshold, aboveThreshold]);
      prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

      // Act
      const result = await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert: should alert for quantity === minStockLevel
      expect(result).toBe(1);
      expect(prisma.aiDecisionLog.create).toHaveBeenCalledTimes(1);
    });

    it('should call findMany with correct pagination bounds (take: 500)', async () => {
      // Arrange
      prisma.part.findMany.mockResolvedValueOnce([]);

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert: verify that findMany includes take: 500 for bounded query
      expect(prisma.part.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 500,
        }),
      );
    });

    it('should verify inventory include clause with tenantId filter', async () => {
      // Arrange
      const part = makeMockPart();
      prisma.part.findMany.mockResolvedValueOnce([part]);

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert: verify include clause filters inventory by tenantId
      const call = (prisma.part.findMany as jest.Mock).mock.calls[0][0];
      expect(call.include.inventory).toEqual(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID_1,
          },
          take: 1,
        }),
      );
    });

    it('should have confidence set to 1.0 for all alerts', async () => {
      // Arrange
      const part = makeMockPart({
        sku: 'TEST-SKU',
        inventory: [{ id: INVENTORY_ITEM_ID, quantity: 1, reserved: 0, available: 1 }],
      });
      prisma.part.findMany.mockResolvedValueOnce([part]);
      prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert: verify confidence is always 1.0 (deterministic threshold check)
      const createCall = (prisma.aiDecisionLog.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.confidence.toString()).toBe('1'); // Decimal(1.0)
    });

    it('should mark all alerts as not human reviewed', async () => {
      // Arrange
      const part = makeMockPart();
      prisma.part.findMany.mockResolvedValueOnce([part]);
      prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert: humanReviewed should be false for all
      const createCall = (prisma.aiDecisionLog.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.humanReviewed).toBe(false);
    });
  });

  describe('logging audit data accurately', () => {
    it('should pass correct featureName to aiDecisionLog', async () => {
      // Arrange
      const part = makeMockPart();
      prisma.part.findMany.mockResolvedValueOnce([part]);
      prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      const call = (prisma.aiDecisionLog.create as jest.Mock).mock.calls[0][0];
      expect(call.data.featureName).toBe('inventory-alerts');
    });

    it('should pass modelUsed as threshold-check to aiDecisionLog', async () => {
      // Arrange
      const part = makeMockPart();
      prisma.part.findMany.mockResolvedValueOnce([part]);
      prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      const call = (prisma.aiDecisionLog.create as jest.Mock).mock.calls[0][0];
      expect(call.data.modelUsed).toBe('threshold-check');
    });

    it('should pass entityType as Part to aiDecisionLog', async () => {
      // Arrange
      const part = makeMockPart();
      prisma.part.findMany.mockResolvedValueOnce([part]);
      prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      const call = (prisma.aiDecisionLog.create as jest.Mock).mock.calls[0][0];
      expect(call.data.entityType).toBe('Part');
    });

    it('should populate inputSummary with SKU', async () => {
      // Arrange
      const part = makeMockPart({ sku: 'UNIQUE-SKU' });
      prisma.part.findMany.mockResolvedValueOnce([part]);
      prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      const call = (prisma.aiDecisionLog.create as jest.Mock).mock.calls[0][0];
      expect(call.data.inputSummary).toContain('UNIQUE-SKU');
    });

    it('should populate outputSummary with stock level details', async () => {
      // Arrange
      const part = makeMockPart({
        name: 'Brake Pads',
        minStockLevel: 10,
        inventory: [{ id: INVENTORY_ITEM_ID, quantity: 3, reserved: 0, available: 3 }],
      });
      prisma.part.findMany.mockResolvedValueOnce([part]);
      prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      const call = (prisma.aiDecisionLog.create as jest.Mock).mock.calls[0][0];
      expect(call.data.outputSummary).toContain('3 units');
      expect(call.data.outputSummary).toContain('10');
      expect(call.data.outputSummary).toContain('Brake Pads');
    });

    it('should store partId as entityId', async () => {
      // Arrange
      const part = makeMockPart({ id: 'part-xyz-123' });
      prisma.part.findMany.mockResolvedValueOnce([part]);
      prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      const call = (prisma.aiDecisionLog.create as jest.Mock).mock.calls[0][0];
      expect(call.data.entityId).toBe('part-xyz-123');
    });
  });

  describe('isolation and domain rules', () => {
    it('should maintain tenantId consistency across all operations', async () => {
      // Arrange: ensure tenantId is passed through all service calls
      const part = makeMockPart({ tenantId: TENANT_ID_1 });
      prisma.part.findMany.mockResolvedValueOnce([part]);
      prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert: verify tenantId used in findMany
      const findManyCall = (prisma.part.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.tenantId).toBe(TENANT_ID_1);
      // And in aiDecisionLog.create
      const createCall = (prisma.aiDecisionLog.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.tenantId).toBe(TENANT_ID_1);
    });

    it('should only process active parts', async () => {
      // Arrange
      prisma.part.findMany.mockResolvedValueOnce([]);

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      const call = (prisma.part.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.isActive).toBe(true);
    });

    it('should order results by part name for consistency', async () => {
      // Arrange
      prisma.part.findMany.mockResolvedValueOnce([]);

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      const call = (prisma.part.findMany as jest.Mock).mock.calls[0][0];
      expect(call.orderBy).toEqual({ name: 'asc' });
    });

    it('should log only audit trail, not real-time notifications', async () => {
      // Arrange: verify the service logs to AiDecisionLog, not a notification table
      const part = makeMockPart();
      prisma.part.findMany.mockResolvedValueOnce([part]);
      prisma.aiDecisionLog.create.mockResolvedValueOnce({ id: 'log-1' });

      // Act
      await service.sendLowStockAlerts(TENANT_ID_1);

      // Assert
      expect(prisma.aiDecisionLog.create).toHaveBeenCalled();
      const call = (prisma.aiDecisionLog.create as jest.Mock).mock.calls[0][0];
      expect(call.data.featureName).toBe('inventory-alerts');
      expect(call.data.modelUsed).toBe('threshold-check');
    });
  });
});
