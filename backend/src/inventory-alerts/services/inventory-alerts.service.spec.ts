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
  });
});
