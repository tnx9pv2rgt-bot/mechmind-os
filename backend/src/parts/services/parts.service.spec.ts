import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PartsService } from './parts.service';
import { PrismaService } from '@common/services/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { MovementType, OrderStatus, Prisma } from '@prisma/client';
import {
  CreatePartDto,
  UpdatePartDto,
  CreateSupplierDto,
  AdjustStockDto,
  CreatePurchaseOrderDto,
  ReceiveOrderDto,
} from '../dto/parts.dto';

// ---------------------------------------------------------------------------
// Type helpers for Prisma mock delegates
// ---------------------------------------------------------------------------

interface MockPartDelegate {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
}

interface MockInventoryItemDelegate {
  create: jest.Mock;
  update: jest.Mock;
}

interface MockInventoryMovementDelegate {
  findMany: jest.Mock;
  create: jest.Mock;
}

interface MockSupplierDelegate {
  create: jest.Mock;
  findMany: jest.Mock;
}

interface MockPurchaseOrderDelegate {
  count: jest.Mock;
  create: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
}

interface MockPurchaseOrderItemDelegate {
  findMany: jest.Mock;
  update: jest.Mock;
}

interface MockPrisma {
  part: MockPartDelegate;
  inventoryItem: MockInventoryItemDelegate;
  inventoryMovement: MockInventoryMovementDelegate;
  supplier: MockSupplierDelegate;
  purchaseOrder: MockPurchaseOrderDelegate;
  purchaseOrderItem: MockPurchaseOrderItemDelegate;
  $transaction: jest.Mock;
}

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const PART_ID = 'part-001';
const SUPPLIER_ID = 'supplier-001';
const USER_ID = 'user-001';
const ORDER_ID = 'order-001';
const INVENTORY_ITEM_ID = 'inv-item-001';

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

function makeMockPart(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: PART_ID,
    tenantId: TENANT_ID,
    sku: 'BRK-001',
    name: 'Brake Pad Set',
    description: 'Front brake pads',
    category: 'BRAKES',
    subcategory: 'PADS',
    brand: 'Brembo',
    manufacturer: 'Brembo SpA',
    partNumber: 'P85020',
    compatibleMakes: ['BMW', 'Audi'],
    compatibleModels: ['3 Series', 'A4'],
    yearFrom: 2018,
    yearTo: 2024,
    costPrice: new Prisma.Decimal(35.0),
    retailPrice: new Prisma.Decimal(75.0),
    vatRate: new Prisma.Decimal(22.0),
    minStockLevel: 5,
    maxStockLevel: 100,
    reorderPoint: 10,
    supplierId: SUPPLIER_ID,
    isActive: true,
    supplier: {
      id: SUPPLIER_ID,
      name: 'Brembo Parts',
    },
    inventory: [
      {
        id: INVENTORY_ITEM_ID,
        quantity: 20,
        reserved: 3,
        available: 17,
      },
    ],
    ...overrides,
  };
}

function makeMockSupplier(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: SUPPLIER_ID,
    tenantId: TENANT_ID,
    name: 'Brembo Parts',
    code: 'BRM-001',
    contactName: 'Mario Rossi',
    email: 'mario@brembo.com',
    phone: '+39 012 345 6789',
    address: 'Via Roma 1',
    city: 'Bergamo',
    paymentTerms: 'NET_30',
    isActive: true,
    ...overrides,
  };
}

function makeMockPurchaseOrder(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: ORDER_ID,
    tenantId: TENANT_ID,
    orderNumber: 'PO-2024-0001',
    supplierId: SUPPLIER_ID,
    status: OrderStatus.DRAFT,
    subtotal: new Prisma.Decimal(350),
    vatAmount: new Prisma.Decimal(77),
    total: new Prisma.Decimal(427),
    orderDate: new Date('2024-06-01'),
    expectedDate: new Date('2024-06-15'),
    notes: 'Urgent order',
    createdBy: USER_ID,
    supplier: { id: SUPPLIER_ID, name: 'Brembo Parts' },
    items: [
      {
        id: 'poi-001',
        partId: PART_ID,
        quantity: 10,
        receivedQty: 0,
        unitPrice: new Prisma.Decimal(35),
        vatRate: new Prisma.Decimal(22),
        total: new Prisma.Decimal(350),
        part: { id: PART_ID, name: 'Brake Pad Set' },
      },
    ],
    ...overrides,
  };
}

function makeMockMovement(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mov-001',
    tenantId: TENANT_ID,
    partId: PART_ID,
    type: MovementType.ADJUSTMENT,
    quantity: 5,
    notes: 'Manual adjustment',
    performedBy: USER_ID,
    createdAt: new Date('2024-06-01T10:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('PartsService', () => {
  let service: PartsService;
  let prisma: MockPrisma;
  let notifications: { sendNotification: jest.Mock };

  beforeEach(async () => {
    prisma = {
      part: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      inventoryItem: {
        create: jest.fn(),
        update: jest.fn(),
      },
      inventoryMovement: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      supplier: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      purchaseOrder: {
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      purchaseOrderItem: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((args: unknown) => {
        if (Array.isArray(args)) {
          return Promise.resolve(args);
        }
        return Promise.resolve(undefined);
      }),
    };

    notifications = {
      sendNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<PartsService>(PartsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // PART CRUD
  // =========================================================================

  describe('createPart', () => {
    const dto: CreatePartDto = {
      sku: 'BRK-001',
      name: 'Brake Pad Set',
      description: 'Front brake pads',
      category: 'BRAKES',
      subcategory: 'PADS',
      brand: 'Brembo',
      manufacturer: 'Brembo SpA',
      partNumber: 'P85020',
      compatibleMakes: ['BMW', 'Audi'],
      compatibleModels: ['3 Series', 'A4'],
      yearFrom: 2018,
      yearTo: 2024,
      costPrice: 35.0,
      retailPrice: 75.0,
      minStockLevel: 5,
      reorderPoint: 10,
      supplierId: SUPPLIER_ID,
    };

    it('should create a part and initial inventory record', async () => {
      // Arrange
      const createdPart = makeMockPart();
      prisma.part.findUnique.mockResolvedValue(null);
      prisma.part.create.mockResolvedValue(createdPart);
      prisma.inventoryItem.create.mockResolvedValue({ id: INVENTORY_ITEM_ID });

      // Act
      const result = await service.createPart(TENANT_ID, dto);

      // Assert
      expect(prisma.part.findUnique).toHaveBeenCalledWith({
        where: { sku: dto.sku },
      });
      expect(prisma.part.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          sku: dto.sku,
          name: dto.name,
          category: dto.category,
        }),
        include: { supplier: true, inventory: true },
      });
      expect(prisma.inventoryItem.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          partId: PART_ID,
          quantity: 0,
          reserved: 0,
          available: 0,
        },
      });
      expect(result.id).toBe(PART_ID);
      expect(result.sku).toBe('BRK-001');
      expect(result.name).toBe('Brake Pad Set');
    });

    it('should include tenantId in the created part data', async () => {
      // Arrange
      prisma.part.findUnique.mockResolvedValue(null);
      prisma.part.create.mockResolvedValue(makeMockPart());
      prisma.inventoryItem.create.mockResolvedValue({ id: INVENTORY_ITEM_ID });

      // Act
      await service.createPart(TENANT_ID, dto);

      // Assert
      const createCall = prisma.part.create.mock.calls[0][0];
      expect(createCall.data.tenantId).toBe(TENANT_ID);
    });

    it('should convert costPrice and retailPrice to Prisma.Decimal', async () => {
      // Arrange
      prisma.part.findUnique.mockResolvedValue(null);
      prisma.part.create.mockResolvedValue(makeMockPart());
      prisma.inventoryItem.create.mockResolvedValue({ id: INVENTORY_ITEM_ID });

      // Act
      await service.createPart(TENANT_ID, dto);

      // Assert
      const createCall = prisma.part.create.mock.calls[0][0];
      expect(createCall.data.costPrice).toBeInstanceOf(Prisma.Decimal);
      expect(createCall.data.retailPrice).toBeInstanceOf(Prisma.Decimal);
    });

    it('should default minStockLevel to 5 when not provided', async () => {
      // Arrange
      const dtoWithoutMin: CreatePartDto = {
        sku: 'ENG-001',
        name: 'Oil Filter',
        category: 'ENGINE',
        costPrice: 8.0,
        retailPrice: 18.0,
      };
      prisma.part.findUnique.mockResolvedValue(null);
      prisma.part.create.mockResolvedValue(makeMockPart({ sku: 'ENG-001' }));
      prisma.inventoryItem.create.mockResolvedValue({ id: 'inv-002' });

      // Act
      await service.createPart(TENANT_ID, dtoWithoutMin);

      // Assert
      const createCall = prisma.part.create.mock.calls[0][0];
      expect(createCall.data.minStockLevel).toBe(5);
    });

    it('should default reorderPoint to 10 when not provided', async () => {
      // Arrange
      const dtoWithoutReorder: CreatePartDto = {
        sku: 'ENG-002',
        name: 'Air Filter',
        category: 'ENGINE',
        costPrice: 12.0,
        retailPrice: 25.0,
      };
      prisma.part.findUnique.mockResolvedValue(null);
      prisma.part.create.mockResolvedValue(makeMockPart({ sku: 'ENG-002' }));
      prisma.inventoryItem.create.mockResolvedValue({ id: 'inv-003' });

      // Act
      await service.createPart(TENANT_ID, dtoWithoutReorder);

      // Assert
      const createCall = prisma.part.create.mock.calls[0][0];
      expect(createCall.data.reorderPoint).toBe(10);
    });

    it('should default compatibleMakes and compatibleModels to empty arrays', async () => {
      // Arrange
      const dtoNoCompat: CreatePartDto = {
        sku: 'UNI-001',
        name: 'Universal Bolt',
        category: 'HARDWARE',
        costPrice: 0.5,
        retailPrice: 1.5,
      };
      prisma.part.findUnique.mockResolvedValue(null);
      prisma.part.create.mockResolvedValue(makeMockPart({ sku: 'UNI-001' }));
      prisma.inventoryItem.create.mockResolvedValue({ id: 'inv-004' });

      // Act
      await service.createPart(TENANT_ID, dtoNoCompat);

      // Assert
      const createCall = prisma.part.create.mock.calls[0][0];
      expect(createCall.data.compatibleMakes).toEqual([]);
      expect(createCall.data.compatibleModels).toEqual([]);
    });

    it('should throw BadRequestException when SKU already exists (composite unique violation)', async () => {
      // Arrange
      prisma.part.findUnique.mockResolvedValue(makeMockPart());

      // Act & Assert
      await expect(service.createPart(TENANT_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createPart(TENANT_ID, dto)).rejects.toThrow(
        `Part with SKU ${dto.sku} already exists`,
      );
    });

    it('should not create inventory record when part creation fails', async () => {
      // Arrange
      prisma.part.findUnique.mockResolvedValue(makeMockPart());

      // Act
      await expect(service.createPart(TENANT_ID, dto)).rejects.toThrow();

      // Assert
      expect(prisma.inventoryItem.create).not.toHaveBeenCalled();
    });

    it('should map the response with stock quantities from inventory', async () => {
      // Arrange
      prisma.part.findUnique.mockResolvedValue(null);
      prisma.part.create.mockResolvedValue(makeMockPart());
      prisma.inventoryItem.create.mockResolvedValue({ id: INVENTORY_ITEM_ID });

      // Act
      const result = await service.createPart(TENANT_ID, dto);

      // Assert
      expect(result.stockQuantity).toBe(20);
      expect(result.reservedQuantity).toBe(3);
      expect(result.availableQuantity).toBe(17);
      expect(result.supplierName).toBe('Brembo Parts');
    });
  });

  // =========================================================================
  // GET PARTS (list with filters)
  // =========================================================================

  describe('getParts', () => {
    it('should return all active parts for a tenant', async () => {
      // Arrange
      const parts = [makeMockPart(), makeMockPart({ id: 'part-002', sku: 'ENG-001', name: 'Oil Filter' })];
      prisma.part.findMany.mockResolvedValue(parts);

      // Act
      const result = await service.getParts(TENANT_ID, {});

      // Assert
      expect(prisma.part.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, isActive: true },
        include: { supplier: true, inventory: true },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(2);
    });

    it('should always filter by tenantId for tenant isolation', async () => {
      // Arrange
      prisma.part.findMany.mockResolvedValue([]);

      // Act
      await service.getParts(TENANT_ID, {});

      // Assert
      const whereArg = prisma.part.findMany.mock.calls[0][0].where;
      expect(whereArg.tenantId).toBe(TENANT_ID);
    });

    it('should filter by category when provided', async () => {
      // Arrange
      prisma.part.findMany.mockResolvedValue([makeMockPart()]);

      // Act
      await service.getParts(TENANT_ID, { category: 'BRAKES' });

      // Assert
      const whereArg = prisma.part.findMany.mock.calls[0][0].where;
      expect(whereArg.category).toBe('BRAKES');
    });

    it('should filter by supplierId when provided', async () => {
      // Arrange
      prisma.part.findMany.mockResolvedValue([makeMockPart()]);

      // Act
      await service.getParts(TENANT_ID, { supplierId: SUPPLIER_ID });

      // Assert
      const whereArg = prisma.part.findMany.mock.calls[0][0].where;
      expect(whereArg.supplierId).toBe(SUPPLIER_ID);
    });

    it('should apply search filter across name, sku, and description', async () => {
      // Arrange
      prisma.part.findMany.mockResolvedValue([makeMockPart()]);

      // Act
      await service.getParts(TENANT_ID, { search: 'brake' });

      // Assert
      const whereArg = prisma.part.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toEqual([
        { name: { contains: 'brake', mode: 'insensitive' } },
        { sku: { contains: 'brake', mode: 'insensitive' } },
        { description: { contains: 'brake', mode: 'insensitive' } },
      ]);
    });

    it('should filter low stock items when lowStock is true', async () => {
      // Arrange
      const highStockPart = makeMockPart({
        id: 'part-high',
        inventory: [{ id: 'inv-high', quantity: 100, reserved: 0, available: 100 }],
        minStockLevel: 5,
      });
      const lowStockPart = makeMockPart({
        id: 'part-low',
        inventory: [{ id: 'inv-low', quantity: 3, reserved: 0, available: 3 }],
        minStockLevel: 5,
      });
      prisma.part.findMany.mockResolvedValue([highStockPart, lowStockPart]);

      // Act
      const result = await service.getParts(TENANT_ID, { lowStock: true });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isLowStock).toBe(true);
    });

    it('should return empty array when no parts match', async () => {
      // Arrange
      prisma.part.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getParts(TENANT_ID, {});

      // Assert
      expect(result).toEqual([]);
    });

    it('should combine multiple filters simultaneously', async () => {
      // Arrange
      prisma.part.findMany.mockResolvedValue([]);

      // Act
      await service.getParts(TENANT_ID, { category: 'BRAKES', supplierId: SUPPLIER_ID, search: 'pad' });

      // Assert
      const whereArg = prisma.part.findMany.mock.calls[0][0].where;
      expect(whereArg.tenantId).toBe(TENANT_ID);
      expect(whereArg.category).toBe('BRAKES');
      expect(whereArg.supplierId).toBe(SUPPLIER_ID);
      expect(whereArg.OR).toBeDefined();
    });
  });

  // =========================================================================
  // GET PART (single)
  // =========================================================================

  describe('getPart', () => {
    it('should return a part by id and tenantId', async () => {
      // Arrange
      prisma.part.findFirst.mockResolvedValue(makeMockPart());

      // Act
      const result = await service.getPart(TENANT_ID, PART_ID);

      // Assert
      expect(prisma.part.findFirst).toHaveBeenCalledWith({
        where: { id: PART_ID, tenantId: TENANT_ID },
        include: { supplier: true, inventory: true },
      });
      expect(result.id).toBe(PART_ID);
      expect(result.sku).toBe('BRK-001');
    });

    it('should enforce tenant isolation by including tenantId in query', async () => {
      // Arrange
      prisma.part.findFirst.mockResolvedValue(makeMockPart());

      // Act
      await service.getPart('other-tenant', PART_ID);

      // Assert
      expect(prisma.part.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PART_ID, tenantId: 'other-tenant' },
        }),
      );
    });

    it('should throw NotFoundException when part does not exist', async () => {
      // Arrange
      prisma.part.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getPart(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getPart(TENANT_ID, 'nonexistent')).rejects.toThrow(
        'Part not found',
      );
    });

    it('should map costPrice and retailPrice to numbers in response', async () => {
      // Arrange
      prisma.part.findFirst.mockResolvedValue(makeMockPart());

      // Act
      const result = await service.getPart(TENANT_ID, PART_ID);

      // Assert
      expect(typeof result.costPrice).toBe('number');
      expect(typeof result.retailPrice).toBe('number');
      expect(result.costPrice).toBe(35);
      expect(result.retailPrice).toBe(75);
    });

    it('should compute isLowStock based on stockQuantity vs minStockLevel', async () => {
      // Arrange - stock equals minStockLevel (should be low)
      const lowPart = makeMockPart({
        minStockLevel: 20,
        inventory: [{ id: INVENTORY_ITEM_ID, quantity: 20, reserved: 0, available: 20 }],
      });
      prisma.part.findFirst.mockResolvedValue(lowPart);

      // Act
      const result = await service.getPart(TENANT_ID, PART_ID);

      // Assert
      expect(result.isLowStock).toBe(true);
    });

    it('should return isLowStock false when stock is above minStockLevel', async () => {
      // Arrange
      const healthyPart = makeMockPart({
        minStockLevel: 5,
        inventory: [{ id: INVENTORY_ITEM_ID, quantity: 50, reserved: 0, available: 50 }],
      });
      prisma.part.findFirst.mockResolvedValue(healthyPart);

      // Act
      const result = await service.getPart(TENANT_ID, PART_ID);

      // Assert
      expect(result.isLowStock).toBe(false);
    });

    it('should handle part with no inventory records gracefully', async () => {
      // Arrange
      prisma.part.findFirst.mockResolvedValue(makeMockPart({ inventory: [] }));

      // Act
      const result = await service.getPart(TENANT_ID, PART_ID);

      // Assert
      expect(result.stockQuantity).toBe(0);
      expect(result.reservedQuantity).toBe(0);
      expect(result.availableQuantity).toBe(0);
    });
  });

  // =========================================================================
  // UPDATE PART
  // =========================================================================

  describe('updatePart', () => {
    it('should update part name', async () => {
      // Arrange
      const dto: UpdatePartDto = { name: 'Premium Brake Pad Set' };
      prisma.part.update.mockResolvedValue(
        makeMockPart({ name: 'Premium Brake Pad Set' }),
      );

      // Act
      const result = await service.updatePart(TENANT_ID, PART_ID, dto);

      // Assert
      expect(prisma.part.update).toHaveBeenCalledWith({
        where: { id: PART_ID, tenantId: TENANT_ID },
        data: expect.objectContaining({ name: 'Premium Brake Pad Set' }),
        include: { supplier: true, inventory: true },
      });
      expect(result.name).toBe('Premium Brake Pad Set');
    });

    it('should update costPrice as Prisma.Decimal when provided', async () => {
      // Arrange
      const dto: UpdatePartDto = { costPrice: 42.5 };
      prisma.part.update.mockResolvedValue(
        makeMockPart({ costPrice: new Prisma.Decimal(42.5) }),
      );

      // Act
      await service.updatePart(TENANT_ID, PART_ID, dto);

      // Assert
      const updateCall = prisma.part.update.mock.calls[0][0];
      expect(updateCall.data.costPrice).toBeInstanceOf(Prisma.Decimal);
    });

    it('should update retailPrice as Prisma.Decimal when provided', async () => {
      // Arrange
      const dto: UpdatePartDto = { retailPrice: 89.99 };
      prisma.part.update.mockResolvedValue(
        makeMockPart({ retailPrice: new Prisma.Decimal(89.99) }),
      );

      // Act
      await service.updatePart(TENANT_ID, PART_ID, dto);

      // Assert
      const updateCall = prisma.part.update.mock.calls[0][0];
      expect(updateCall.data.retailPrice).toBeInstanceOf(Prisma.Decimal);
    });

    it('should not convert price fields when they are undefined', async () => {
      // Arrange
      const dto: UpdatePartDto = { name: 'Updated Name' };
      prisma.part.update.mockResolvedValue(makeMockPart({ name: 'Updated Name' }));

      // Act
      await service.updatePart(TENANT_ID, PART_ID, dto);

      // Assert
      const updateCall = prisma.part.update.mock.calls[0][0];
      expect(updateCall.data.costPrice).toBeUndefined();
      expect(updateCall.data.retailPrice).toBeUndefined();
    });

    it('should update isActive flag for soft delete', async () => {
      // Arrange
      const dto: UpdatePartDto = { isActive: false };
      prisma.part.update.mockResolvedValue(makeMockPart({ isActive: false }));

      // Act
      await service.updatePart(TENANT_ID, PART_ID, dto);

      // Assert
      const updateCall = prisma.part.update.mock.calls[0][0];
      expect(updateCall.data.isActive).toBe(false);
    });

    it('should enforce tenantId in the update where clause', async () => {
      // Arrange
      const dto: UpdatePartDto = { name: 'Test' };
      prisma.part.update.mockResolvedValue(makeMockPart());

      // Act
      await service.updatePart(TENANT_ID, PART_ID, dto);

      // Assert
      expect(prisma.part.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PART_ID, tenantId: TENANT_ID },
        }),
      );
    });
  });

  // =========================================================================
  // SUPPLIERS
  // =========================================================================

  describe('createSupplier', () => {
    const dto: CreateSupplierDto = {
      name: 'Brembo Parts',
      code: 'BRM-001',
      contactName: 'Mario Rossi',
      email: 'mario@brembo.com',
      phone: '+39 012 345 6789',
      address: 'Via Roma 1',
      city: 'Bergamo',
      paymentTerms: 'NET_30',
    };

    it('should create a supplier with tenantId', async () => {
      // Arrange
      prisma.supplier.create.mockResolvedValue(makeMockSupplier());

      // Act
      const result = await service.createSupplier(TENANT_ID, dto);

      // Assert
      expect(prisma.supplier.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          name: dto.name,
          code: dto.code,
          contactName: dto.contactName,
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          city: dto.city,
          paymentTerms: dto.paymentTerms,
        },
      });
      expect(result).toBeDefined();
    });

    it('should include tenantId in supplier data for tenant isolation', async () => {
      // Arrange
      prisma.supplier.create.mockResolvedValue(makeMockSupplier());

      // Act
      await service.createSupplier(TENANT_ID, dto);

      // Assert
      const createData = prisma.supplier.create.mock.calls[0][0].data;
      expect(createData.tenantId).toBe(TENANT_ID);
    });
  });

  describe('getSuppliers', () => {
    it('should return all active suppliers for a tenant', async () => {
      // Arrange
      const suppliers = [makeMockSupplier(), makeMockSupplier({ id: 'supplier-002', name: 'Bosch' })];
      prisma.supplier.findMany.mockResolvedValue(suppliers);

      // Act
      const result = await service.getSuppliers(TENANT_ID);

      // Assert
      expect(prisma.supplier.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, isActive: true },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(2);
    });

    it('should filter by tenantId for tenant isolation', async () => {
      // Arrange
      prisma.supplier.findMany.mockResolvedValue([]);

      // Act
      await service.getSuppliers('other-tenant');

      // Assert
      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'other-tenant' }),
        }),
      );
    });
  });

  // =========================================================================
  // STOCK MANAGEMENT (adjustStock)
  // =========================================================================

  describe('adjustStock', () => {
    it('should increase stock quantity and record movement in a transaction', async () => {
      // Arrange
      const dto: AdjustStockDto = { quantity: 10, reason: 'Restock from delivery' };
      prisma.part.findFirst.mockResolvedValue(makeMockPart());

      // Act
      await service.adjustStock(TENANT_ID, PART_ID, dto, USER_ID);

      // Assert
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const transactionArgs = prisma.$transaction.mock.calls[0][0];
      expect(Array.isArray(transactionArgs)).toBe(true);
      expect(transactionArgs).toHaveLength(2);
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: INVENTORY_ITEM_ID },
        data: {
          quantity: 30, // 20 + 10
          available: 27, // 30 - 3 reserved
          lastCounted: expect.any(Date),
        },
      });
    });

    it('should decrease stock quantity with negative adjustment', async () => {
      // Arrange
      const dto: AdjustStockDto = { quantity: -5, reason: 'Damaged goods removed' };
      prisma.part.findFirst.mockResolvedValue(makeMockPart());

      // Act
      await service.adjustStock(TENANT_ID, PART_ID, dto, USER_ID);

      // Assert
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: INVENTORY_ITEM_ID },
        data: {
          quantity: 15, // 20 - 5
          available: 12, // 15 - 3 reserved
          lastCounted: expect.any(Date),
        },
      });
    });

    it('should record inventory movement with absolute quantity', async () => {
      // Arrange
      const dto: AdjustStockDto = { quantity: -5, reason: 'Damaged goods' };
      prisma.part.findFirst.mockResolvedValue(makeMockPart());

      // Act
      await service.adjustStock(TENANT_ID, PART_ID, dto, USER_ID);

      // Assert
      expect(prisma.inventoryMovement.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          partId: PART_ID,
          type: MovementType.ADJUSTMENT,
          quantity: 5, // absolute value
          notes: 'Damaged goods',
          performedBy: USER_ID,
        },
      });
    });

    it('should throw NotFoundException when part does not exist', async () => {
      // Arrange
      const dto: AdjustStockDto = { quantity: 5, reason: 'Test' };
      prisma.part.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.adjustStock(TENANT_ID, 'nonexistent', dto, USER_ID),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.adjustStock(TENANT_ID, 'nonexistent', dto, USER_ID),
      ).rejects.toThrow('Part not found');
    });

    it('should throw BadRequestException when stock would go negative', async () => {
      // Arrange
      const dto: AdjustStockDto = { quantity: -25, reason: 'Over-reduction' };
      prisma.part.findFirst.mockResolvedValue(makeMockPart());

      // Act & Assert
      await expect(
        service.adjustStock(TENANT_ID, PART_ID, dto, USER_ID),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.adjustStock(TENANT_ID, PART_ID, dto, USER_ID),
      ).rejects.toThrow('Stock cannot be negative');
    });

    it('should enforce tenant isolation in part lookup', async () => {
      // Arrange
      const dto: AdjustStockDto = { quantity: 5, reason: 'Test' };
      prisma.part.findFirst.mockResolvedValue(makeMockPart());

      // Act
      await service.adjustStock(TENANT_ID, PART_ID, dto, USER_ID);

      // Assert
      expect(prisma.part.findFirst).toHaveBeenCalledWith({
        where: { id: PART_ID, tenantId: TENANT_ID },
        include: { inventory: true },
      });
    });

    it('should use ADJUSTMENT movement type for both positive and negative adjustments', async () => {
      // Arrange
      const positiveDto: AdjustStockDto = { quantity: 10, reason: 'Add' };
      prisma.part.findFirst.mockResolvedValue(makeMockPart());

      // Act
      await service.adjustStock(TENANT_ID, PART_ID, positiveDto, USER_ID);

      // Assert
      const movementData = prisma.inventoryMovement.create.mock.calls[0][0].data;
      expect(movementData.type).toBe(MovementType.ADJUSTMENT);
    });

    it('should correctly handle adjustment when current quantity is zero', async () => {
      // Arrange
      const dto: AdjustStockDto = { quantity: 15, reason: 'Initial stock' };
      const emptyPart = makeMockPart({
        inventory: [{ id: INVENTORY_ITEM_ID, quantity: 0, reserved: 0, available: 0 }],
      });
      prisma.part.findFirst.mockResolvedValue(emptyPart);

      // Act
      await service.adjustStock(TENANT_ID, PART_ID, dto, USER_ID);

      // Assert
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: INVENTORY_ITEM_ID },
        data: {
          quantity: 15,
          available: 15,
          lastCounted: expect.any(Date),
        },
      });
    });

    it('should correctly preserve reserved quantity in available calculation', async () => {
      // Arrange
      const dto: AdjustStockDto = { quantity: 5, reason: 'Restock' };
      const partWithReservations = makeMockPart({
        inventory: [{ id: INVENTORY_ITEM_ID, quantity: 10, reserved: 7, available: 3 }],
      });
      prisma.part.findFirst.mockResolvedValue(partWithReservations);

      // Act
      await service.adjustStock(TENANT_ID, PART_ID, dto, USER_ID);

      // Assert
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: INVENTORY_ITEM_ID },
        data: {
          quantity: 15, // 10 + 5
          available: 8, // 15 - 7
          lastCounted: expect.any(Date),
        },
      });
    });
  });

  // =========================================================================
  // INVENTORY HISTORY
  // =========================================================================

  describe('getInventoryHistory', () => {
    it('should return recent movements for a part', async () => {
      // Arrange
      const movements = [
        makeMockMovement(),
        makeMockMovement({ id: 'mov-002', type: MovementType.IN, quantity: 10 }),
      ];
      prisma.inventoryMovement.findMany.mockResolvedValue(movements);

      // Act
      const result = await service.getInventoryHistory(TENANT_ID, PART_ID);

      // Assert
      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith({
        where: { partId: PART_ID, tenantId: TENANT_ID },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect(result).toHaveLength(2);
    });

    it('should filter by tenantId for tenant isolation', async () => {
      // Arrange
      prisma.inventoryMovement.findMany.mockResolvedValue([]);

      // Act
      await service.getInventoryHistory('other-tenant', PART_ID);

      // Assert
      const whereArg = prisma.inventoryMovement.findMany.mock.calls[0][0].where;
      expect(whereArg.tenantId).toBe('other-tenant');
    });

    it('should map movement response with correct fields', async () => {
      // Arrange
      const movement = makeMockMovement();
      prisma.inventoryMovement.findMany.mockResolvedValue([movement]);

      // Act
      const result = await service.getInventoryHistory(TENANT_ID, PART_ID);

      // Assert
      expect(result[0]).toEqual({
        id: 'mov-001',
        type: MovementType.ADJUSTMENT,
        quantity: 5,
        notes: 'Manual adjustment',
        performedBy: USER_ID,
        createdAt: new Date('2024-06-01T10:00:00Z'),
      });
    });

    it('should handle null notes by mapping to undefined', async () => {
      // Arrange
      const movement = makeMockMovement({ notes: null });
      prisma.inventoryMovement.findMany.mockResolvedValue([movement]);

      // Act
      const result = await service.getInventoryHistory(TENANT_ID, PART_ID);

      // Assert
      expect(result[0].notes).toBeUndefined();
    });

    it('should limit results to 50 most recent movements', async () => {
      // Arrange
      prisma.inventoryMovement.findMany.mockResolvedValue([]);

      // Act
      await service.getInventoryHistory(TENANT_ID, PART_ID);

      // Assert
      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });

  // =========================================================================
  // PURCHASE ORDERS
  // =========================================================================

  describe('createPurchaseOrder', () => {
    const dto: CreatePurchaseOrderDto = {
      supplierId: SUPPLIER_ID,
      notes: 'Urgent restock',
      expectedDate: '2024-06-15',
      items: [
        { partId: PART_ID, quantity: 10, unitPrice: 35 },
      ],
    };

    it('should create a purchase order with generated order number', async () => {
      // Arrange
      prisma.purchaseOrder.count.mockResolvedValue(5);
      prisma.part.findFirst.mockResolvedValue(makeMockPart());
      prisma.purchaseOrder.create.mockResolvedValue(makeMockPurchaseOrder());

      // Act
      const result = await service.createPurchaseOrder(TENANT_ID, dto, USER_ID);

      // Assert
      expect(prisma.purchaseOrder.count).toHaveBeenCalledWith({ where: { tenantId: TENANT_ID } });
      expect(prisma.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            supplierId: SUPPLIER_ID,
            createdBy: USER_ID,
          }),
          include: { supplier: true, items: { include: { part: true } } },
        }),
      );
      expect(result.id).toBe(ORDER_ID);
      expect(result.orderNumber).toBe('PO-2024-0001');
    });

    it('should generate sequential order number based on existing count', async () => {
      // Arrange
      prisma.purchaseOrder.count.mockResolvedValue(42);
      prisma.part.findFirst.mockResolvedValue(makeMockPart());
      prisma.purchaseOrder.create.mockResolvedValue(makeMockPurchaseOrder());

      // Act
      await service.createPurchaseOrder(TENANT_ID, dto, USER_ID);

      // Assert
      const createCall = prisma.purchaseOrder.create.mock.calls[0][0];
      const year = new Date().getFullYear();
      expect(createCall.data.orderNumber).toBe(`PO-${year}-0043`);
    });

    it('should calculate subtotal, VAT, and total correctly', async () => {
      // Arrange
      prisma.purchaseOrder.count.mockResolvedValue(0);
      prisma.part.findFirst.mockResolvedValue(makeMockPart());
      prisma.purchaseOrder.create.mockResolvedValue(makeMockPurchaseOrder());

      // Act
      await service.createPurchaseOrder(TENANT_ID, dto, USER_ID);

      // Assert
      const createCall = prisma.purchaseOrder.create.mock.calls[0][0];
      // 10 items * 35 = 350 subtotal
      const subtotal = createCall.data.subtotal;
      const vatAmount = createCall.data.vatAmount;
      const total = createCall.data.total;
      expect(Number(subtotal)).toBe(350);
      expect(Number(vatAmount)).toBeCloseTo(77, 0); // 350 * 0.22
      expect(Number(total)).toBeCloseTo(427, 0); // 350 + 77
    });

    it('should use part costPrice when unitPrice not provided in item', async () => {
      // Arrange
      const dtoNoPrices: CreatePurchaseOrderDto = {
        supplierId: SUPPLIER_ID,
        items: [{ partId: PART_ID, quantity: 5 }],
      };
      prisma.purchaseOrder.count.mockResolvedValue(0);
      prisma.part.findFirst.mockResolvedValue(makeMockPart());
      prisma.purchaseOrder.create.mockResolvedValue(makeMockPurchaseOrder());

      // Act
      await service.createPurchaseOrder(TENANT_ID, dtoNoPrices, USER_ID);

      // Assert
      const createCall = prisma.purchaseOrder.create.mock.calls[0][0];
      // Should use part.costPrice (35.00) * 5 = 175
      expect(Number(createCall.data.subtotal)).toBe(175);
    });

    it('should throw NotFoundException when a referenced part does not exist', async () => {
      // Arrange
      prisma.purchaseOrder.count.mockResolvedValue(0);
      prisma.part.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createPurchaseOrder(TENANT_ID, dto, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenantId in part lookup for each item', async () => {
      // Arrange
      prisma.purchaseOrder.count.mockResolvedValue(0);
      prisma.part.findFirst.mockResolvedValue(makeMockPart());
      prisma.purchaseOrder.create.mockResolvedValue(makeMockPurchaseOrder());

      // Act
      await service.createPurchaseOrder(TENANT_ID, dto, USER_ID);

      // Assert
      expect(prisma.part.findFirst).toHaveBeenCalledWith({
        where: { id: PART_ID, tenantId: TENANT_ID },
      });
    });

    it('should handle expectedDate as null when not provided', async () => {
      // Arrange
      const dtoNoDate: CreatePurchaseOrderDto = {
        supplierId: SUPPLIER_ID,
        items: [{ partId: PART_ID, quantity: 5 }],
      };
      prisma.purchaseOrder.count.mockResolvedValue(0);
      prisma.part.findFirst.mockResolvedValue(makeMockPart());
      prisma.purchaseOrder.create.mockResolvedValue(
        makeMockPurchaseOrder({ expectedDate: null }),
      );

      // Act
      await service.createPurchaseOrder(TENANT_ID, dtoNoDate, USER_ID);

      // Assert
      const createCall = prisma.purchaseOrder.create.mock.calls[0][0];
      expect(createCall.data.expectedDate).toBeNull();
    });

    it('should map purchase order response with correct fields', async () => {
      // Arrange
      prisma.purchaseOrder.count.mockResolvedValue(0);
      prisma.part.findFirst.mockResolvedValue(makeMockPart());
      prisma.purchaseOrder.create.mockResolvedValue(makeMockPurchaseOrder());

      // Act
      const result = await service.createPurchaseOrder(TENANT_ID, dto, USER_ID);

      // Assert
      expect(result).toEqual({
        id: ORDER_ID,
        orderNumber: 'PO-2024-0001',
        supplierName: 'Brembo Parts',
        status: OrderStatus.DRAFT,
        total: 427,
        orderDate: expect.any(Date),
        expectedDate: expect.any(Date),
        items: [
          {
            partName: 'Brake Pad Set',
            quantity: 10,
            receivedQty: 0,
            unitPrice: 35,
          },
        ],
      });
    });
  });

  describe('getPurchaseOrders', () => {
    it('should return all purchase orders for a tenant', async () => {
      // Arrange
      const orders = [makeMockPurchaseOrder()];
      prisma.purchaseOrder.findMany.mockResolvedValue(orders);

      // Act
      const result = await service.getPurchaseOrders(TENANT_ID);

      // Assert
      expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        include: { supplier: true, items: { include: { part: true } } },
        orderBy: { orderDate: 'desc' },
      });
      expect(result).toHaveLength(1);
    });

    it('should filter by status when provided', async () => {
      // Arrange
      prisma.purchaseOrder.findMany.mockResolvedValue([]);

      // Act
      await service.getPurchaseOrders(TENANT_ID, OrderStatus.SENT);

      // Assert
      const whereArg = prisma.purchaseOrder.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe(OrderStatus.SENT);
    });

    it('should not include status filter when status is undefined', async () => {
      // Arrange
      prisma.purchaseOrder.findMany.mockResolvedValue([]);

      // Act
      await service.getPurchaseOrders(TENANT_ID);

      // Assert
      const whereArg = prisma.purchaseOrder.findMany.mock.calls[0][0].where;
      expect(whereArg).toEqual({ tenantId: TENANT_ID });
    });

    it('should always enforce tenantId for tenant isolation', async () => {
      // Arrange
      prisma.purchaseOrder.findMany.mockResolvedValue([]);

      // Act
      await service.getPurchaseOrders('other-tenant', OrderStatus.DRAFT);

      // Assert
      const whereArg = prisma.purchaseOrder.findMany.mock.calls[0][0].where;
      expect(whereArg.tenantId).toBe('other-tenant');
    });
  });

  // =========================================================================
  // RECEIVE ORDER
  // =========================================================================

  describe('receiveOrder', () => {
    const receiveItems: ReceiveOrderDto[] = [
      { itemId: 'poi-001', quantity: 10 },
    ];

    function makeMockOrderForReceive(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return {
        id: ORDER_ID,
        tenantId: TENANT_ID,
        orderNumber: 'PO-2024-0001',
        status: OrderStatus.SENT,
        items: [
          {
            id: 'poi-001',
            partId: PART_ID,
            quantity: 10,
            receivedQty: 0,
            part: {
              id: PART_ID,
              name: 'Brake Pad Set',
              inventory: [
                {
                  id: INVENTORY_ITEM_ID,
                  quantity: 20,
                  reserved: 3,
                  available: 17,
                },
              ],
            },
          },
        ],
        ...overrides,
      };
    }

    it('should update inventory and record movement when receiving items', async () => {
      // Arrange
      prisma.purchaseOrder.findFirst.mockResolvedValue(makeMockOrderForReceive());
      prisma.purchaseOrderItem.findMany.mockResolvedValue([
        { id: 'poi-001', quantity: 10, receivedQty: 0 },
      ]);

      // Act
      await service.receiveOrder(TENANT_ID, ORDER_ID, receiveItems, USER_ID);

      // Assert
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: INVENTORY_ITEM_ID },
        data: {
          quantity: 30, // 20 + 10
          available: 27, // 30 - 3
        },
      });
      expect(prisma.inventoryMovement.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          partId: PART_ID,
          type: MovementType.IN,
          quantity: 10,
          referenceId: ORDER_ID,
          referenceType: 'PURCHASE_ORDER',
          notes: 'Received from PO PO-2024-0001',
          performedBy: USER_ID,
        },
      });
    });

    it('should update order status to RECEIVED when all items fully received', async () => {
      // Arrange
      prisma.purchaseOrder.findFirst.mockResolvedValue(makeMockOrderForReceive());
      prisma.purchaseOrderItem.findMany.mockResolvedValue([
        { id: 'poi-001', quantity: 10, receivedQty: 10 },
      ]);

      // Act
      await service.receiveOrder(TENANT_ID, ORDER_ID, receiveItems, USER_ID);

      // Assert
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: ORDER_ID },
        data: {
          status: OrderStatus.RECEIVED,
          receivedAt: expect.any(Date),
        },
      });
    });

    it('should update order status to PARTIALLY_RECEIVED when partially received', async () => {
      // Arrange
      prisma.purchaseOrder.findFirst.mockResolvedValue(
        makeMockOrderForReceive({
          items: [
            {
              id: 'poi-001',
              partId: PART_ID,
              quantity: 20,
              receivedQty: 0,
              part: {
                id: PART_ID,
                name: 'Brake Pad Set',
                inventory: [{ id: INVENTORY_ITEM_ID, quantity: 20, reserved: 3, available: 17 }],
              },
            },
            {
              id: 'poi-002',
              partId: 'part-002',
              quantity: 15,
              receivedQty: 0,
              part: {
                id: 'part-002',
                name: 'Oil Filter',
                inventory: [{ id: 'inv-002', quantity: 5, reserved: 0, available: 5 }],
              },
            },
          ],
        }),
      );
      // Simulate: poi-001 partially received, poi-002 untouched
      prisma.purchaseOrderItem.findMany.mockResolvedValue([
        { id: 'poi-001', quantity: 20, receivedQty: 10 },
        { id: 'poi-002', quantity: 15, receivedQty: 0 },
      ]);

      // Act - only receive poi-001
      await service.receiveOrder(TENANT_ID, ORDER_ID, [{ itemId: 'poi-001', quantity: 10 }], USER_ID);

      // Assert
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: ORDER_ID },
        data: {
          status: OrderStatus.PARTIALLY_RECEIVED,
          receivedAt: undefined,
        },
      });
    });

    it('should throw NotFoundException when purchase order does not exist', async () => {
      // Arrange
      prisma.purchaseOrder.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.receiveOrder(TENANT_ID, 'nonexistent', receiveItems, USER_ID),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.receiveOrder(TENANT_ID, 'nonexistent', receiveItems, USER_ID),
      ).rejects.toThrow('Purchase order not found');
    });

    it('should enforce tenantId in order lookup', async () => {
      // Arrange
      prisma.purchaseOrder.findFirst.mockResolvedValue(null);

      // Act
      await expect(
        service.receiveOrder(TENANT_ID, ORDER_ID, receiveItems, USER_ID),
      ).rejects.toThrow();

      // Assert
      expect(prisma.purchaseOrder.findFirst).toHaveBeenCalledWith({
        where: { id: ORDER_ID, tenantId: TENANT_ID },
        include: { items: { include: { part: { include: { inventory: true } } } } },
      });
    });

    it('should skip items that do not match any order item', async () => {
      // Arrange
      prisma.purchaseOrder.findFirst.mockResolvedValue(makeMockOrderForReceive());
      prisma.purchaseOrderItem.findMany.mockResolvedValue([
        { id: 'poi-001', quantity: 10, receivedQty: 0 },
      ]);
      const itemsWithUnknown: ReceiveOrderDto[] = [
        { itemId: 'unknown-item', quantity: 5 },
      ];

      // Act
      await service.receiveOrder(TENANT_ID, ORDER_ID, itemsWithUnknown, USER_ID);

      // Assert - inventory should not be updated for unknown items
      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
      expect(prisma.inventoryMovement.create).not.toHaveBeenCalled();
    });

    it('should use $transaction to batch all updates atomically', async () => {
      // Arrange
      prisma.purchaseOrder.findFirst.mockResolvedValue(makeMockOrderForReceive());
      prisma.purchaseOrderItem.findMany.mockResolvedValue([
        { id: 'poi-001', quantity: 10, receivedQty: 10 },
      ]);

      // Act
      await service.receiveOrder(TENANT_ID, ORDER_ID, receiveItems, USER_ID);

      // Assert
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const transactionArgs = prisma.$transaction.mock.calls[0][0];
      expect(Array.isArray(transactionArgs)).toBe(true);
    });

    it('should increment receivedQty on the order item', async () => {
      // Arrange
      prisma.purchaseOrder.findFirst.mockResolvedValue(makeMockOrderForReceive());
      prisma.purchaseOrderItem.findMany.mockResolvedValue([
        { id: 'poi-001', quantity: 10, receivedQty: 10 },
      ]);

      // Act
      await service.receiveOrder(TENANT_ID, ORDER_ID, receiveItems, USER_ID);

      // Assert
      expect(prisma.purchaseOrderItem.update).toHaveBeenCalledWith({
        where: { id: 'poi-001' },
        data: { receivedQty: { increment: 10 } },
      });
    });
  });

  // =========================================================================
  // LOW STOCK ALERTS
  // =========================================================================

  describe('getLowStockAlerts', () => {
    it('should return alerts for parts at or below reorder point', async () => {
      // Arrange
      const lowPart = makeMockPart({
        reorderPoint: 10,
        minStockLevel: 5,
        inventory: [{ id: 'inv-low', quantity: 8, reserved: 0, available: 8 }],
      });
      const healthyPart = makeMockPart({
        id: 'part-healthy',
        reorderPoint: 10,
        inventory: [{ id: 'inv-ok', quantity: 50, reserved: 0, available: 50 }],
      });
      prisma.part.findMany.mockResolvedValue([lowPart, healthyPart]);

      // Act
      const result = await service.getLowStockAlerts(TENANT_ID);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].partId).toBe(PART_ID);
      expect(result[0].currentStock).toBe(8);
    });

    it('should calculate suggested order quantity correctly', async () => {
      // Arrange
      // suggestedQty = max(minStockLevel * 2 - quantity, minStockLevel)
      const lowPart = makeMockPart({
        reorderPoint: 10,
        minStockLevel: 5,
        inventory: [{ id: 'inv-low', quantity: 3, reserved: 0, available: 3 }],
      });
      prisma.part.findMany.mockResolvedValue([lowPart]);

      // Act
      const result = await service.getLowStockAlerts(TENANT_ID);

      // Assert
      // max(5*2 - 3, 5) = max(7, 5) = 7
      expect(result[0].suggestedOrderQty).toBe(7);
    });

    it('should use minStockLevel as minimum suggested order quantity', async () => {
      // Arrange
      // When quantity is 0: max(5*2 - 0, 5) = max(10, 5) = 10
      const emptyPart = makeMockPart({
        reorderPoint: 10,
        minStockLevel: 5,
        inventory: [{ id: 'inv-empty', quantity: 0, reserved: 0, available: 0 }],
      });
      prisma.part.findMany.mockResolvedValue([emptyPart]);

      // Act
      const result = await service.getLowStockAlerts(TENANT_ID);

      // Assert
      expect(result[0].suggestedOrderQty).toBe(10);
    });

    it('should include supplier name in the alert', async () => {
      // Arrange
      const lowPart = makeMockPart({
        reorderPoint: 10,
        inventory: [{ id: 'inv-low', quantity: 5, reserved: 0, available: 5 }],
      });
      prisma.part.findMany.mockResolvedValue([lowPart]);

      // Act
      const result = await service.getLowStockAlerts(TENANT_ID);

      // Assert
      expect(result[0].supplierName).toBe('Brembo Parts');
    });

    it('should return empty array when no parts are below reorder point', async () => {
      // Arrange
      const healthyPart = makeMockPart({
        reorderPoint: 10,
        inventory: [{ id: 'inv-ok', quantity: 100, reserved: 0, available: 100 }],
      });
      prisma.part.findMany.mockResolvedValue([healthyPart]);

      // Act
      const result = await service.getLowStockAlerts(TENANT_ID);

      // Assert
      expect(result).toEqual([]);
    });

    it('should filter by tenantId and only active parts', async () => {
      // Arrange
      prisma.part.findMany.mockResolvedValue([]);

      // Act
      await service.getLowStockAlerts(TENANT_ID);

      // Assert
      expect(prisma.part.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, isActive: true },
        include: { supplier: true, inventory: true },
      });
    });

    it('should handle parts with no supplier', async () => {
      // Arrange
      const partNoSupplier = makeMockPart({
        reorderPoint: 10,
        supplier: null,
        inventory: [{ id: 'inv-low', quantity: 2, reserved: 0, available: 2 }],
      });
      prisma.part.findMany.mockResolvedValue([partNoSupplier]);

      // Act
      const result = await service.getLowStockAlerts(TENANT_ID);

      // Assert
      expect(result[0].supplierName).toBeUndefined();
    });

    it('should include parts at exactly the reorder point', async () => {
      // Arrange
      const atReorderPoint = makeMockPart({
        reorderPoint: 10,
        inventory: [{ id: 'inv-exact', quantity: 10, reserved: 0, available: 10 }],
      });
      prisma.part.findMany.mockResolvedValue([atReorderPoint]);

      // Act
      const result = await service.getLowStockAlerts(TENANT_ID);

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should map all expected fields in alert response', async () => {
      // Arrange
      const lowPart = makeMockPart({
        reorderPoint: 10,
        minStockLevel: 5,
        inventory: [{ id: 'inv-low', quantity: 4, reserved: 0, available: 4 }],
      });
      prisma.part.findMany.mockResolvedValue([lowPart]);

      // Act
      const result = await service.getLowStockAlerts(TENANT_ID);

      // Assert
      expect(result[0]).toEqual({
        partId: PART_ID,
        sku: 'BRK-001',
        name: 'Brake Pad Set',
        currentStock: 4,
        minStockLevel: 5,
        reorderPoint: 10,
        suggestedOrderQty: 6, // max(5*2 - 4, 5) = max(6, 5) = 6
        supplierName: 'Brembo Parts',
      });
    });
  });

  // =========================================================================
  // RESPONSE MAPPING (private methods tested via public interface)
  // =========================================================================

  describe('response mapping', () => {
    it('should map part with null description to undefined', async () => {
      // Arrange
      prisma.part.findFirst.mockResolvedValue(
        makeMockPart({ description: null }),
      );

      // Act
      const result = await service.getPart(TENANT_ID, PART_ID);

      // Assert
      expect(result.description).toBeUndefined();
    });

    it('should map part with null brand to undefined', async () => {
      // Arrange
      prisma.part.findFirst.mockResolvedValue(
        makeMockPart({ brand: null }),
      );

      // Act
      const result = await service.getPart(TENANT_ID, PART_ID);

      // Assert
      expect(result.brand).toBeUndefined();
    });

    it('should handle purchase order with null expectedDate', async () => {
      // Arrange
      prisma.purchaseOrder.findMany.mockResolvedValue([
        makeMockPurchaseOrder({ expectedDate: null }),
      ]);

      // Act
      const result = await service.getPurchaseOrders(TENANT_ID);

      // Assert
      expect(result[0].expectedDate).toBeUndefined();
    });
  });
});
