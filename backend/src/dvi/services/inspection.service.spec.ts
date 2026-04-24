import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InspectionService } from './inspection.service';
import { PrismaService } from '@common/services/prisma.service';
import { S3Service } from '@common/services/s3.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { PublicTokenService } from '../../public-token/public-token.service';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  CreateFindingDto,
  UpdateFindingDto,
  CustomerApprovalDto,
} from '../dto/inspection.dto';

// ==========================================
// Mock PDFKit (virtual — not installed in test env)
// ==========================================

const mockPdfDocInstance: Record<string, jest.Mock | number> = {};
const pdfEventHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};

function resetPdfMock(): void {
  // Clear event handlers
  for (const key of Object.keys(pdfEventHandlers)) {
    delete pdfEventHandlers[key];
  }

  mockPdfDocInstance.on = jest.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (!pdfEventHandlers[event]) pdfEventHandlers[event] = [];
    pdfEventHandlers[event].push(handler);
    return mockPdfDocInstance;
  });
  mockPdfDocInstance.fontSize = jest.fn().mockReturnValue(mockPdfDocInstance);
  mockPdfDocInstance.text = jest.fn().mockReturnValue(mockPdfDocInstance);
  mockPdfDocInstance.moveDown = jest.fn().mockReturnValue(mockPdfDocInstance);
  mockPdfDocInstance.fillColor = jest.fn().mockReturnValue(mockPdfDocInstance);
  mockPdfDocInstance.moveTo = jest.fn().mockReturnValue(mockPdfDocInstance);
  mockPdfDocInstance.lineTo = jest.fn().mockReturnValue(mockPdfDocInstance);
  mockPdfDocInstance.stroke = jest.fn().mockReturnValue(mockPdfDocInstance);
  mockPdfDocInstance.font = jest.fn().mockReturnValue(mockPdfDocInstance);
  mockPdfDocInstance.y = 100;
  mockPdfDocInstance.end = jest.fn(() => {
    if (pdfEventHandlers['data']) {
      pdfEventHandlers['data'].forEach(h => h(Buffer.from('pdf-chunk')));
    }
    if (pdfEventHandlers['end']) {
      pdfEventHandlers['end'].forEach(h => h());
    }
  });
}

jest.mock(
  'pdfkit',
  () => ({
    __esModule: true,
    default: jest.fn(() => mockPdfDocInstance),
  }),
  { virtual: true },
);

// ==========================================
// Mock Prisma Enums (same values as @prisma/client)
// ==========================================

const InspectionStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_REVIEW: 'PENDING_REVIEW',
  READY_FOR_CUSTOMER: 'READY_FOR_CUSTOMER',
  CUSTOMER_REVIEWING: 'CUSTOMER_REVIEWING',
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  ARCHIVED: 'ARCHIVED',
} as const;

const InspectionItemStatus = {
  PENDING: 'PENDING',
  CHECKED: 'CHECKED',
  ISSUE_FOUND: 'ISSUE_FOUND',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;

const FindingStatus = {
  REPORTED: 'REPORTED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

const FindingSeverity = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  OK: 'OK',
} as const;

const FuelLevel = {
  EMPTY: 'EMPTY',
  QUARTER: 'QUARTER',
  HALF: 'HALF',
  THREE_QUARTERS: 'THREE_QUARTERS',
  FULL: 'FULL',
} as const;

// ==========================================
// Test Constants
// ==========================================

const TENANT_ID = 'tenant-001';
const INSPECTION_ID = 'insp-001';
const TEMPLATE_ID = 'template-001';
const VEHICLE_ID = 'vehicle-001';
const CUSTOMER_ID = 'customer-001';
const MECHANIC_ID = 'mechanic-001';
const FINDING_ID = 'finding-001';
const ITEM_ID = 'item-001';
const TEMPLATE_ITEM_ID = 'tpl-item-001';
const PHOTO_ID = 'photo-001';
const OTHER_TENANT_ID = 'tenant-002';
const PHOTO_BUCKET = 'mechmind-inspection-photos';
const FRONTEND_URL = 'https://app.mechmind.io';

// ==========================================
// Mock Data Factories
// ==========================================

function buildMockTemplateItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: TEMPLATE_ITEM_ID,
    category: 'BRAKES',
    name: 'Front Brake Pads',
    position: 1,
    ...overrides,
  };
}

function buildMockTemplate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: TEMPLATE_ID,
    tenantId: TENANT_ID,
    isActive: true,
    items: [
      buildMockTemplateItem(),
      buildMockTemplateItem({
        id: 'tpl-item-002',
        category: 'TIRES',
        name: 'Front Left Tire',
        position: 2,
      }),
    ],
    ...overrides,
  };
}

function buildMockVehicle(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: VEHICLE_ID,
    make: 'Toyota',
    model: 'Corolla',
    licensePlate: 'AB123CD',
    ...overrides,
  };
}

function buildMockCustomer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: CUSTOMER_ID,
    tenantId: TENANT_ID,
    encryptedFirstName: 'Mario',
    encryptedLastName: 'Rossi',
    encryptedName: 'Mario Rossi',
    encryptedEmail: 'mario@example.com',
    ...overrides,
  };
}

function buildMockMechanic(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: MECHANIC_ID,
    name: 'Luca Bianchi',
    ...overrides,
  };
}

function buildMockPhoto(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: PHOTO_ID,
    url: 'https://s3.example.com/photo.jpg',
    thumbnailUrl: 'https://s3.example.com/photo-thumb.jpg',
    category: 'DAMAGE',
    description: 'Worn brake pad',
    takenAt: new Date('2024-06-01T10:00:00Z'),
    takenBy: MECHANIC_ID,
    ...overrides,
  };
}

function buildMockInspectionItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: ITEM_ID,
    inspectionId: INSPECTION_ID,
    templateItemId: TEMPLATE_ITEM_ID,
    status: InspectionItemStatus.PENDING,
    notes: null,
    severity: null,
    templateItem: buildMockTemplateItem(),
    photos: [],
    ...overrides,
  };
}

function buildMockFinding(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: FINDING_ID,
    inspectionId: INSPECTION_ID,
    category: 'BRAKES',
    title: 'Worn Brake Pads',
    description: 'Front brake pads are below minimum thickness',
    severity: FindingSeverity.HIGH,
    recommendation: 'Replace front brake pads',
    estimatedCost: 250,
    status: FindingStatus.REPORTED,
    approvedByCustomer: false,
    ...overrides,
  };
}

function buildMockInspection(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: INSPECTION_ID,
    tenantId: TENANT_ID,
    templateId: TEMPLATE_ID,
    vehicleId: VEHICLE_ID,
    customerId: CUSTOMER_ID,
    mechanicId: MECHANIC_ID,
    mileage: 45000,
    fuelLevel: FuelLevel.HALF,
    status: InspectionStatus.IN_PROGRESS,
    startedAt: new Date('2024-06-01T09:00:00Z'),
    completedAt: null,
    customerNotified: false,
    customerViewed: false,
    approvedAt: null,
    approvedBy: null,
    vehicle: buildMockVehicle(),
    customer: buildMockCustomer(),
    mechanic: buildMockMechanic(),
    items: [buildMockInspectionItem()],
    findings: [],
    photos: [],
    ...overrides,
  };
}

// ==========================================
// Test Suite
// ==========================================

describe('InspectionService', () => {
  let service: InspectionService;
  let prisma: {
    inspectionTemplate: { findFirst: jest.Mock };
    inspection: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    inspectionItem: { updateMany: jest.Mock };
    inspectionFinding: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    inspectionPhoto: { create: jest.Mock };
    estimate: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };
  let s3: { upload: jest.Mock; getSignedDownloadUrl: jest.Mock; delete: jest.Mock };
  let notifications: { sendNotification: jest.Mock };
  let configService: { get: jest.Mock };
  let publicTokenService: {
    generateToken: jest.Mock;
    validateToken: jest.Mock;
    consumeToken: jest.Mock;
    revokeTokensForEntity: jest.Mock;
  };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    // -- Prisma mock --
    prisma = {
      inspectionTemplate: {
        findFirst: jest.fn(),
      },
      inspection: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      inspectionItem: {
        updateMany: jest.fn(),
      },
      inspectionFinding: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      inspectionPhoto: {
        create: jest.fn(),
      },
      estimate: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    // -- S3 mock --
    s3 = {
      upload: jest.fn().mockResolvedValue(undefined),
      getSignedDownloadUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    // -- Notifications mock --
    notifications = {
      sendNotification: jest.fn().mockResolvedValue(undefined),
    };

    // -- Config mock --
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const configMap: Record<string, string> = {
          S3_INSPECTION_PHOTOS_BUCKET: PHOTO_BUCKET,
          FRONTEND_URL: FRONTEND_URL,
        };
        return configMap[key] ?? defaultValue;
      }),
    };

    // -- PublicTokenService mock --
    publicTokenService = {
      generateToken: jest.fn().mockResolvedValue({ token: 'test-token-123' }),
      validateToken: jest.fn(),
      consumeToken: jest.fn().mockResolvedValue({}),
      revokeTokensForEntity: jest.fn().mockResolvedValue(0),
    };

    // -- EventEmitter mock --
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InspectionService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
        { provide: S3Service, useValue: s3 },
        { provide: NotificationsService, useValue: notifications },
        { provide: PublicTokenService, useValue: publicTokenService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<InspectionService>(InspectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // create
  // ==========================================

  describe('create', () => {
    const dto: CreateInspectionDto = {
      vehicleId: VEHICLE_ID,
      customerId: CUSTOMER_ID,
      templateId: TEMPLATE_ID,
      mechanicId: MECHANIC_ID,
      mileage: 45000,
      fuelLevel: FuelLevel.HALF as never,
    };

    it('should create inspection from template with all items', async () => {
      // Arrange
      const template = buildMockTemplate();
      const createdInspection = buildMockInspection();

      (prisma.inspectionTemplate.findFirst as jest.Mock).mockResolvedValue(template);
      (prisma.inspection.create as jest.Mock).mockResolvedValue(createdInspection);

      // Act
      const result = await service.create(TENANT_ID, dto);

      // Assert
      expect(prisma.inspectionTemplate.findFirst).toHaveBeenCalledWith({
        where: { id: TEMPLATE_ID, tenantId: TENANT_ID, isActive: true },
        include: { items: { orderBy: { position: 'asc' } } },
      });
      expect(prisma.inspection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            templateId: TEMPLATE_ID,
            vehicleId: VEHICLE_ID,
            customerId: CUSTOMER_ID,
            mechanicId: MECHANIC_ID,
            mileage: 45000,
            status: InspectionStatus.IN_PROGRESS,
          }),
        }),
      );
      expect(result.id).toBe(INSPECTION_ID);
      expect(result.status).toBe(InspectionStatus.IN_PROGRESS);
    });

    it('should create inspection items from template items', async () => {
      // Arrange
      const templateItems = [
        buildMockTemplateItem({ id: 'tpl-1', position: 1 }),
        buildMockTemplateItem({ id: 'tpl-2', position: 2 }),
        buildMockTemplateItem({ id: 'tpl-3', position: 3 }),
      ];
      const template = buildMockTemplate({ items: templateItems });
      (prisma.inspectionTemplate.findFirst as jest.Mock).mockResolvedValue(template);
      (prisma.inspection.create as jest.Mock).mockResolvedValue(buildMockInspection());

      // Act
      await service.create(TENANT_ID, dto);

      // Assert
      const createCall = (prisma.inspection.create as jest.Mock).mock.calls[0][0];
      const itemsCreate = createCall.data.items.create;
      expect(itemsCreate).toHaveLength(3);
      expect(itemsCreate[0]).toEqual({
        templateItemId: 'tpl-1',
        status: InspectionItemStatus.PENDING,
      });
      expect(itemsCreate[1]).toEqual({
        templateItemId: 'tpl-2',
        status: InspectionItemStatus.PENDING,
      });
      expect(itemsCreate[2]).toEqual({
        templateItemId: 'tpl-3',
        status: InspectionItemStatus.PENDING,
      });
    });

    it('should throw NotFoundException when template does not exist', async () => {
      // Arrange
      (prisma.inspectionTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(TENANT_ID, dto)).rejects.toThrow(NotFoundException);
      await expect(service.create(TENANT_ID, dto)).rejects.toThrow('Inspection template not found');
    });

    it('should enforce tenant isolation on template lookup', async () => {
      // Arrange
      (prisma.inspectionTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(OTHER_TENANT_ID, dto)).rejects.toThrow(NotFoundException);
      expect(prisma.inspectionTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: OTHER_TENANT_ID }),
        }),
      );
    });

    it('should only use active templates', async () => {
      // Arrange
      (prisma.inspectionTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      await expect(service.create(TENANT_ID, dto)).rejects.toThrow(NotFoundException);

      // Assert
      expect(prisma.inspectionTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should map response through mapToResponseDto', async () => {
      // Arrange
      const inspection = buildMockInspection({
        items: [buildMockInspectionItem({ photos: [buildMockPhoto()] })],
        findings: [buildMockFinding()],
        photos: [buildMockPhoto({ id: 'global-photo-001' })],
      });
      (prisma.inspectionTemplate.findFirst as jest.Mock).mockResolvedValue(buildMockTemplate());
      (prisma.inspection.create as jest.Mock).mockResolvedValue(inspection);

      // Act
      const result = await service.create(TENANT_ID, dto);

      // Assert
      expect(result.vehicle).toEqual({
        id: VEHICLE_ID,
        make: 'Toyota',
        model: 'Corolla',
        licensePlate: 'AB123CD',
      });
      expect(result.customer).toEqual({ id: CUSTOMER_ID, name: 'Mario Rossi' });
      expect(result.mechanic).toEqual({ id: MECHANIC_ID, name: 'Luca Bianchi' });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].photos).toHaveLength(1);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].estimatedCost).toBe(250);
      expect(result.photos).toHaveLength(1);
    });
  });

  // ==========================================
  // findById
  // ==========================================

  describe('findById', () => {
    it('should return mapped inspection when found', async () => {
      // Arrange
      const inspection = buildMockInspection();
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      const result = await service.findById(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(result.id).toBe(INSPECTION_ID);
      expect(result.status).toBe(InspectionStatus.IN_PROGRESS);
      expect(result.vehicle.make).toBe('Toyota');
    });

    it('should throw NotFoundException when inspection not found', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findById(TENANT_ID, 'nonexistent')).rejects.toThrow(
        'Inspection not found',
      );
    });

    it('should enforce tenant isolation in query', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(OTHER_TENANT_ID, INSPECTION_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.inspection.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: INSPECTION_ID, tenantId: OTHER_TENANT_ID },
        }),
      );
    });

    it('should include all related entities', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(buildMockInspection());

      // Act
      await service.findById(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(prisma.inspection.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            vehicle: true,
            customer: true,
            mechanic: { select: { id: true, name: true } },
            findings: true,
            photos: true,
          }),
        }),
      );
    });
  });

  // ==========================================
  // findAll
  // ==========================================

  describe('findAll', () => {
    const mockInspectionList = [
      {
        id: 'insp-001',
        status: InspectionStatus.IN_PROGRESS,
        startedAt: new Date('2024-06-01T09:00:00Z'),
        vehicle: { make: 'Toyota', model: 'Corolla', licensePlate: 'AB123CD' },
        customer: { encryptedFirstName: 'Mario' },
        mechanic: { name: 'Luca Bianchi' },
        findings: [{ severity: 'CRITICAL' }, { severity: 'HIGH' }, { severity: 'CRITICAL' }],
      },
      {
        id: 'insp-002',
        status: InspectionStatus.APPROVED,
        startedAt: new Date('2024-06-02T14:00:00Z'),
        vehicle: { make: 'Fiat', model: '500', licensePlate: 'XY456ZW' },
        customer: { encryptedFirstName: 'Giulia' },
        mechanic: { name: 'Marco Verdi' },
        findings: [],
      },
    ];

    it('should return summary DTOs for all inspections', async () => {
      // Arrange
      (prisma.inspection.findMany as jest.Mock).mockResolvedValue(mockInspectionList);
      (prisma.inspection.count as jest.Mock).mockResolvedValue(2);

      // Act
      const result = await service.findAll(TENANT_ID, {});

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.data[0]).toEqual({
        id: 'insp-001',
        status: InspectionStatus.IN_PROGRESS,
        startedAt: new Date('2024-06-01T09:00:00Z'),
        vehicleInfo: 'Toyota Corolla (AB123CD)',
        customerName: 'Mario',
        mechanicName: 'Luca Bianchi',
        issuesFound: 3,
        criticalIssues: 2,
      });
      expect(result.data[1].issuesFound).toBe(0);
      expect(result.data[1].criticalIssues).toBe(0);
    });

    it('should filter by vehicleId when provided', async () => {
      // Arrange
      (prisma.inspection.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.inspection.count as jest.Mock).mockResolvedValue(0);

      // Act
      await service.findAll(TENANT_ID, { vehicleId: VEHICLE_ID });

      // Assert
      expect(prisma.inspection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            vehicleId: VEHICLE_ID,
          }),
        }),
      );
    });

    it('should filter by customerId when provided', async () => {
      // Arrange
      (prisma.inspection.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.inspection.count as jest.Mock).mockResolvedValue(0);

      // Act
      await service.findAll(TENANT_ID, { customerId: CUSTOMER_ID });

      // Assert
      expect(prisma.inspection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            customerId: CUSTOMER_ID,
          }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      // Arrange
      (prisma.inspection.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.findAll(TENANT_ID, { status: InspectionStatus.APPROVED as never });

      // Assert
      expect(prisma.inspection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            status: InspectionStatus.APPROVED,
          }),
        }),
      );
    });

    it('should filter by mechanicId when provided', async () => {
      // Arrange
      (prisma.inspection.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.findAll(TENANT_ID, { mechanicId: MECHANIC_ID });

      // Assert
      expect(prisma.inspection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            mechanicId: MECHANIC_ID,
          }),
        }),
      );
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      (prisma.inspection.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.findAll(OTHER_TENANT_ID, {});

      // Assert
      expect(prisma.inspection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: OTHER_TENANT_ID }),
        }),
      );
    });

    it('should order by startedAt descending', async () => {
      // Arrange
      (prisma.inspection.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.findAll(TENANT_ID, {});

      // Assert
      expect(prisma.inspection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { startedAt: 'desc' },
        }),
      );
    });

    it('should return empty array when no inspections found', async () => {
      // Arrange
      (prisma.inspection.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.inspection.count as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await service.findAll(TENANT_ID, {});

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ==========================================
  // update
  // ==========================================

  describe('update', () => {
    it('should update inspection status', async () => {
      // Arrange
      const existingInspection = buildMockInspection();
      const updatedInspection = buildMockInspection({ status: InspectionStatus.PENDING_REVIEW });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(existingInspection);
      (prisma.inspection.update as jest.Mock).mockResolvedValue(updatedInspection);

      const dto: UpdateInspectionDto = { status: InspectionStatus.PENDING_REVIEW as never };

      // Act
      const result = await service.update(TENANT_ID, INSPECTION_ID, dto, MECHANIC_ID);

      // Assert
      expect(prisma.inspection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: INSPECTION_ID, tenantId: TENANT_ID },
          data: expect.objectContaining({ status: InspectionStatus.PENDING_REVIEW }),
        }),
      );
      expect(result.status).toBe(InspectionStatus.PENDING_REVIEW);
    });

    it('should update inspection items when provided', async () => {
      // Arrange
      const existingInspection = buildMockInspection();
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(existingInspection);
      (prisma.inspection.update as jest.Mock).mockResolvedValue(
        buildMockInspection({
          items: [
            buildMockInspectionItem({
              status: InspectionItemStatus.ISSUE_FOUND,
              notes: 'Pads worn below 2mm',
              severity: FindingSeverity.HIGH,
            }),
          ],
        }),
      );
      (prisma.inspectionItem.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const dto: UpdateInspectionDto = {
        items: [
          {
            templateItemId: TEMPLATE_ITEM_ID,
            status: InspectionItemStatus.ISSUE_FOUND as never,
            notes: 'Pads worn below 2mm',
            severity: FindingSeverity.HIGH as never,
          },
        ],
      };

      // Act
      await service.update(TENANT_ID, INSPECTION_ID, dto, MECHANIC_ID);

      // Assert
      expect(prisma.inspectionItem.updateMany).toHaveBeenCalledWith({
        where: {
          inspectionId: INSPECTION_ID,
          templateItemId: TEMPLATE_ITEM_ID,
        },
        data: {
          status: InspectionItemStatus.ISSUE_FOUND,
          notes: 'Pads worn below 2mm',
          severity: FindingSeverity.HIGH,
        },
      });
    });

    it('should update multiple items in sequence', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(buildMockInspection());
      (prisma.inspection.update as jest.Mock).mockResolvedValue(buildMockInspection());
      (prisma.inspectionItem.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const dto: UpdateInspectionDto = {
        items: [
          { templateItemId: 'tpl-1', status: InspectionItemStatus.CHECKED as never },
          {
            templateItemId: 'tpl-2',
            status: InspectionItemStatus.ISSUE_FOUND as never,
            notes: 'Worn tire',
          },
          { templateItemId: 'tpl-3', status: InspectionItemStatus.NOT_APPLICABLE as never },
        ],
      };

      // Act
      await service.update(TENANT_ID, INSPECTION_ID, dto, MECHANIC_ID);

      // Assert
      expect(prisma.inspectionItem.updateMany).toHaveBeenCalledTimes(3);
    });

    it('should set completedAt when status transitions to READY_FOR_CUSTOMER', async () => {
      // Arrange
      const existingInspection = buildMockInspection();
      const updatedInspection = buildMockInspection({
        status: InspectionStatus.READY_FOR_CUSTOMER,
        completedAt: new Date(),
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(existingInspection);
      (prisma.inspection.update as jest.Mock).mockResolvedValue(updatedInspection);

      const dto: UpdateInspectionDto = { status: InspectionStatus.READY_FOR_CUSTOMER as never };

      // Act
      await service.update(TENANT_ID, INSPECTION_ID, dto, MECHANIC_ID);

      // Assert
      const updateCall = (prisma.inspection.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.completedAt).toBeInstanceOf(Date);
    });

    it('should notify customer when status transitions to READY_FOR_CUSTOMER', async () => {
      // Arrange
      const existingInspection = buildMockInspection();
      const updatedInspection = buildMockInspection({
        status: InspectionStatus.READY_FOR_CUSTOMER,
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(existingInspection);
      (prisma.inspection.update as jest.Mock).mockResolvedValue(updatedInspection);
      (prisma.inspection.update as jest.Mock)
        // First call: status update -> returns updatedInspection
        // Second call: customerNotified update (from notifyCustomer)
        .mockResolvedValueOnce(updatedInspection)
        .mockResolvedValueOnce({ ...updatedInspection, customerNotified: true });

      const dto: UpdateInspectionDto = { status: InspectionStatus.READY_FOR_CUSTOMER as never };

      // Act
      await service.update(TENANT_ID, INSPECTION_ID, dto, MECHANIC_ID);

      // Assert
      expect(notifications.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          type: 'inspection_completed',
          title: 'Your Vehicle Inspection is Ready',
          email: expect.objectContaining({
            template: 'inspection-ready',
          }),
        }),
      );
    });

    it('should NOT notify customer for non-READY_FOR_CUSTOMER status transitions', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(buildMockInspection());
      (prisma.inspection.update as jest.Mock).mockResolvedValue(
        buildMockInspection({ status: InspectionStatus.PENDING_REVIEW }),
      );

      const dto: UpdateInspectionDto = { status: InspectionStatus.PENDING_REVIEW as never };

      // Act
      await service.update(TENANT_ID, INSPECTION_ID, dto, MECHANIC_ID);

      // Assert
      expect(notifications.sendNotification).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when inspection not found', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(null);

      const dto: UpdateInspectionDto = { status: InspectionStatus.PENDING_REVIEW as never };

      // Act & Assert
      await expect(service.update(TENANT_ID, INSPECTION_ID, dto, MECHANIC_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should enforce mechanic ownership on update', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(null);

      const dto: UpdateInspectionDto = { status: InspectionStatus.PENDING_REVIEW as never };

      // Act & Assert
      await expect(
        service.update(TENANT_ID, INSPECTION_ID, dto, 'wrong-mechanic-id'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.inspection.findFirst).toHaveBeenCalledWith({
        where: { id: INSPECTION_ID, tenantId: TENANT_ID, mechanicId: 'wrong-mechanic-id' },
      });
    });

    it('should update mileage when provided', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(buildMockInspection());
      (prisma.inspection.update as jest.Mock).mockResolvedValue(
        buildMockInspection({ mileage: 50000 }),
      );

      const dto: UpdateInspectionDto = { mileage: 50000 };

      // Act
      await service.update(TENANT_ID, INSPECTION_ID, dto, MECHANIC_ID);

      // Assert
      expect(prisma.inspection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mileage: 50000 }),
        }),
      );
    });
  });

  // ==========================================
  // addFinding
  // ==========================================

  describe('addFinding', () => {
    const dto: CreateFindingDto = {
      category: 'BRAKES',
      title: 'Worn Brake Pads',
      description: 'Front brake pads are below minimum thickness',
      severity: FindingSeverity.HIGH as never,
      recommendation: 'Replace front brake pads',
      estimatedCost: 250,
    };

    it('should create a finding for the inspection', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(buildMockInspection());
      (prisma.inspectionFinding.create as jest.Mock).mockResolvedValue(buildMockFinding());

      // Act
      await service.addFinding(TENANT_ID, INSPECTION_ID, dto);

      // Assert
      expect(prisma.inspectionFinding.create).toHaveBeenCalledWith({
        data: {
          inspectionId: INSPECTION_ID,
          category: 'BRAKES',
          title: 'Worn Brake Pads',
          description: 'Front brake pads are below minimum thickness',
          severity: FindingSeverity.HIGH,
          recommendation: 'Replace front brake pads',
          estimatedCost: 250,
          status: FindingStatus.REPORTED,
        },
      });
    });

    it('should set initial finding status to REPORTED', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(buildMockInspection());
      (prisma.inspectionFinding.create as jest.Mock).mockResolvedValue(buildMockFinding());

      // Act
      await service.addFinding(TENANT_ID, INSPECTION_ID, dto);

      // Assert
      const createCall = (prisma.inspectionFinding.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.status).toBe(FindingStatus.REPORTED);
    });

    it('should throw NotFoundException when inspection not found', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.addFinding(TENANT_ID, INSPECTION_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.addFinding(TENANT_ID, INSPECTION_ID, dto)).rejects.toThrow(
        'Inspection not found',
      );
    });

    it('should enforce tenant isolation when adding finding', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.addFinding(OTHER_TENANT_ID, INSPECTION_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.inspection.findFirst).toHaveBeenCalledWith({
        where: { id: INSPECTION_ID, tenantId: OTHER_TENANT_ID },
      });
    });

    it('should create finding without optional fields', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(buildMockInspection());
      (prisma.inspectionFinding.create as jest.Mock).mockResolvedValue(buildMockFinding());

      const minimalDto: CreateFindingDto = {
        category: 'ENGINE',
        title: 'Oil Leak',
        description: 'Small oil leak detected',
        severity: FindingSeverity.MEDIUM as never,
      };

      // Act
      await service.addFinding(TENANT_ID, INSPECTION_ID, minimalDto);

      // Assert
      expect(prisma.inspectionFinding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: 'ENGINE',
          title: 'Oil Leak',
          recommendation: undefined,
          estimatedCost: undefined,
        }),
      });
    });
  });

  // ==========================================
  // updateFinding
  // ==========================================

  describe('updateFinding', () => {
    it('should update finding status', async () => {
      // Arrange
      (prisma.inspectionFinding.findFirst as jest.Mock).mockResolvedValue(buildMockFinding());
      (prisma.inspectionFinding.update as jest.Mock).mockResolvedValue(
        buildMockFinding({ status: FindingStatus.APPROVED }),
      );

      const dto: UpdateFindingDto = { status: FindingStatus.APPROVED as never };

      // Act
      await service.updateFinding(TENANT_ID, FINDING_ID, dto);

      // Assert
      expect(prisma.inspectionFinding.update).toHaveBeenCalledWith({
        where: { id: FINDING_ID },
        data: { status: FindingStatus.APPROVED },
      });
    });

    it('should set approvedByCustomer and approvedAt when customer approves', async () => {
      // Arrange
      (prisma.inspectionFinding.findFirst as jest.Mock).mockResolvedValue(buildMockFinding());
      (prisma.inspectionFinding.update as jest.Mock).mockResolvedValue(
        buildMockFinding({ approvedByCustomer: true }),
      );

      const dto: UpdateFindingDto = { approvedByCustomer: true };

      // Act
      await service.updateFinding(TENANT_ID, FINDING_ID, dto);

      // Assert
      const updateCall = (prisma.inspectionFinding.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.approvedByCustomer).toBe(true);
      expect(updateCall.data.approvedAt).toBeInstanceOf(Date);
    });

    it('should NOT set approvedAt when approvedByCustomer is not provided', async () => {
      // Arrange
      (prisma.inspectionFinding.findFirst as jest.Mock).mockResolvedValue(buildMockFinding());
      (prisma.inspectionFinding.update as jest.Mock).mockResolvedValue(
        buildMockFinding({ status: FindingStatus.IN_PROGRESS }),
      );

      const dto: UpdateFindingDto = { status: FindingStatus.IN_PROGRESS as never };

      // Act
      await service.updateFinding(TENANT_ID, FINDING_ID, dto);

      // Assert
      const updateCall = (prisma.inspectionFinding.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.approvedByCustomer).toBeUndefined();
      expect(updateCall.data.approvedAt).toBeUndefined();
    });

    it('should throw NotFoundException when finding not found', async () => {
      // Arrange
      (prisma.inspectionFinding.findFirst as jest.Mock).mockResolvedValue(null);

      const dto: UpdateFindingDto = { status: FindingStatus.APPROVED as never };

      // Act & Assert
      await expect(service.updateFinding(TENANT_ID, 'nonexistent', dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateFinding(TENANT_ID, 'nonexistent', dto)).rejects.toThrow(
        'Finding not found',
      );
    });

    it('should enforce tenant isolation through inspection relation', async () => {
      // Arrange
      (prisma.inspectionFinding.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateFinding(OTHER_TENANT_ID, FINDING_ID, {
          status: FindingStatus.APPROVED as never,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.inspectionFinding.findFirst).toHaveBeenCalledWith({
        where: { id: FINDING_ID, inspection: { tenantId: OTHER_TENANT_ID } },
      });
    });
  });

  // ==========================================
  // uploadPhoto
  // ==========================================

  describe('uploadPhoto', () => {
    const fileBuffer = Buffer.from('fake-image-data');
    const mimeType = 'image/jpeg';

    it('should upload photo to S3 and save record', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(buildMockInspection());
      (prisma.inspectionPhoto.create as jest.Mock).mockResolvedValue({
        id: PHOTO_ID,
        url: 'https://s3.example.com/signed-url',
      });

      // Act
      const result = await service.uploadPhoto(
        TENANT_ID,
        INSPECTION_ID,
        fileBuffer,
        mimeType,
        MECHANIC_ID,
        ITEM_ID,
        'DAMAGE',
        'Worn brake pad photo',
      );

      // Assert
      expect(result.id).toBe(PHOTO_ID);
      expect(result.url).toBe('https://s3.example.com/signed-url');
    });

    it('should upload file to the correct S3 bucket', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(buildMockInspection());
      (prisma.inspectionPhoto.create as jest.Mock).mockResolvedValue({ id: PHOTO_ID, url: 'url' });

      // Act
      await service.uploadPhoto(TENANT_ID, INSPECTION_ID, fileBuffer, mimeType, MECHANIC_ID);

      // Assert
      expect(s3.upload).toHaveBeenCalledWith(
        PHOTO_BUCKET,
        expect.stringContaining(`inspections/${TENANT_ID}/${INSPECTION_ID}/`),
        fileBuffer,
        mimeType,
      );
    });

    it('should generate S3 key with tenant and inspection path', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(buildMockInspection());
      (prisma.inspectionPhoto.create as jest.Mock).mockResolvedValue({ id: PHOTO_ID, url: 'url' });

      // Act
      await service.uploadPhoto(TENANT_ID, INSPECTION_ID, fileBuffer, mimeType, MECHANIC_ID);

      // Assert
      const uploadCall = s3.upload.mock.calls[0];
      const key = uploadCall[1] as string;
      expect(key).toMatch(/^inspections\/tenant-001\/insp-001\/\d+\.jpg$/);
    });

    it('should request 7-day signed URL', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(buildMockInspection());
      (prisma.inspectionPhoto.create as jest.Mock).mockResolvedValue({ id: PHOTO_ID, url: 'url' });

      // Act
      await service.uploadPhoto(TENANT_ID, INSPECTION_ID, fileBuffer, mimeType, MECHANIC_ID);

      // Assert
      expect(s3.getSignedDownloadUrl).toHaveBeenCalledWith(
        PHOTO_BUCKET,
        expect.stringContaining(`inspections/${TENANT_ID}/${INSPECTION_ID}/`),
        3600 * 24 * 7,
      );
    });

    it('should save photo metadata to database', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(buildMockInspection());
      (prisma.inspectionPhoto.create as jest.Mock).mockResolvedValue({ id: PHOTO_ID, url: 'url' });

      // Act
      await service.uploadPhoto(
        TENANT_ID,
        INSPECTION_ID,
        fileBuffer,
        mimeType,
        MECHANIC_ID,
        ITEM_ID,
        'DAMAGE',
        'Brake pad damage',
      );

      // Assert
      expect(prisma.inspectionPhoto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inspectionId: INSPECTION_ID,
          itemId: ITEM_ID,
          s3Bucket: PHOTO_BUCKET,
          url: 'https://s3.example.com/signed-url',
          category: 'DAMAGE',
          description: 'Brake pad damage',
          takenBy: MECHANIC_ID,
        }),
      });
    });

    it('should save photo without optional itemId, category, description', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(buildMockInspection());
      (prisma.inspectionPhoto.create as jest.Mock).mockResolvedValue({ id: PHOTO_ID, url: 'url' });

      // Act
      await service.uploadPhoto(TENANT_ID, INSPECTION_ID, fileBuffer, mimeType, MECHANIC_ID);

      // Assert
      expect(prisma.inspectionPhoto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inspectionId: INSPECTION_ID,
          itemId: undefined,
          category: undefined,
          description: undefined,
          takenBy: MECHANIC_ID,
        }),
      });
    });

    it('should throw NotFoundException when inspection not found', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.uploadPhoto(TENANT_ID, INSPECTION_ID, fileBuffer, mimeType, MECHANIC_ID),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.uploadPhoto(TENANT_ID, INSPECTION_ID, fileBuffer, mimeType, MECHANIC_ID),
      ).rejects.toThrow('Inspection not found');
    });

    it('should enforce tenant isolation for photo upload', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.uploadPhoto(OTHER_TENANT_ID, INSPECTION_ID, fileBuffer, mimeType, MECHANIC_ID),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.inspection.findFirst).toHaveBeenCalledWith({
        where: { id: INSPECTION_ID, tenantId: OTHER_TENANT_ID },
      });
    });
  });

  // ==========================================
  // submitCustomerApproval
  // ==========================================

  describe('submitCustomerApproval', () => {
    const dto: CustomerApprovalDto = {
      email: 'mario@example.com',
      approvedFindingIds: ['finding-001', 'finding-002'],
      declinedFindingIds: ['finding-003'],
    };

    it('should approve selected findings', async () => {
      // Arrange
      const inspection = buildMockInspection({
        status: InspectionStatus.READY_FOR_CUSTOMER,
        customer: buildMockCustomer(),
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      (prisma.inspectionFinding.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.inspection.update as jest.Mock).mockResolvedValue(
        buildMockInspection({ status: InspectionStatus.APPROVED }),
      );

      // Act
      await service.submitCustomerApproval(TENANT_ID, INSPECTION_ID, dto);

      // Assert
      expect(prisma.inspectionFinding.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['finding-001', 'finding-002'] } },
        data: expect.objectContaining({
          status: FindingStatus.APPROVED,
          approvedByCustomer: true,
        }),
      });
    });

    it('should set approvedAt timestamp on approved findings', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(
        buildMockInspection({ status: InspectionStatus.READY_FOR_CUSTOMER }),
      );
      (prisma.inspectionFinding.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.inspection.update as jest.Mock).mockResolvedValue(buildMockInspection());

      // Act
      await service.submitCustomerApproval(TENANT_ID, INSPECTION_ID, dto);

      // Assert
      const approveCall = (prisma.inspectionFinding.updateMany as jest.Mock).mock.calls[0][0];
      expect(approveCall.data.approvedAt).toBeInstanceOf(Date);
    });

    it('should decline selected findings', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(
        buildMockInspection({ status: InspectionStatus.READY_FOR_CUSTOMER }),
      );
      (prisma.inspectionFinding.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.inspection.update as jest.Mock).mockResolvedValue(buildMockInspection());

      // Act
      await service.submitCustomerApproval(TENANT_ID, INSPECTION_ID, dto);

      // Assert
      expect(prisma.inspectionFinding.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['finding-003'] } },
        data: { status: FindingStatus.DECLINED },
      });
    });

    it('should update inspection status to APPROVED', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(
        buildMockInspection({ status: InspectionStatus.READY_FOR_CUSTOMER }),
      );
      (prisma.inspectionFinding.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.inspection.update as jest.Mock).mockResolvedValue(buildMockInspection());

      // Act
      await service.submitCustomerApproval(TENANT_ID, INSPECTION_ID, dto);

      // Assert
      expect(prisma.inspection.update).toHaveBeenCalledWith({
        where: { id: INSPECTION_ID },
        data: expect.objectContaining({
          status: InspectionStatus.APPROVED,
          approvedBy: 'mario@example.com',
        }),
      });
    });

    it('should set approvedAt timestamp on the inspection', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(
        buildMockInspection({ status: InspectionStatus.READY_FOR_CUSTOMER }),
      );
      (prisma.inspectionFinding.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.inspection.update as jest.Mock).mockResolvedValue(buildMockInspection());

      // Act
      await service.submitCustomerApproval(TENANT_ID, INSPECTION_ID, dto);

      // Assert
      const updateCall = (prisma.inspection.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.approvedAt).toBeInstanceOf(Date);
    });

    it('should send notification to mechanic after approval', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(
        buildMockInspection({ status: InspectionStatus.READY_FOR_CUSTOMER }),
      );
      (prisma.inspectionFinding.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.inspection.update as jest.Mock).mockResolvedValue(buildMockInspection());

      // Act
      await service.submitCustomerApproval(TENANT_ID, INSPECTION_ID, dto);

      // Assert
      expect(notifications.sendNotification).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        userId: MECHANIC_ID,
        type: 'inspection_completed',
        title: 'Inspection Approved',
        message: 'Customer has approved the inspection findings',
        data: { inspectionId: INSPECTION_ID, type: 'INSPECTION_APPROVED' },
      });
    });

    it('should handle approval with no approved findings', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(
        buildMockInspection({ status: InspectionStatus.READY_FOR_CUSTOMER }),
      );
      (prisma.inspectionFinding.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.inspection.update as jest.Mock).mockResolvedValue(buildMockInspection());

      const dtoNoApprovals: CustomerApprovalDto = {
        email: 'mario@example.com',
        approvedFindingIds: [],
        declinedFindingIds: ['finding-001'],
      };

      // Act
      await service.submitCustomerApproval(TENANT_ID, INSPECTION_ID, dtoNoApprovals);

      // Assert
      // Only the decline call should be made (approved is skipped because array is empty)
      expect(prisma.inspectionFinding.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.inspectionFinding.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['finding-001'] } },
        data: { status: FindingStatus.DECLINED },
      });
    });

    it('should handle approval with no declined findings', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(
        buildMockInspection({ status: InspectionStatus.READY_FOR_CUSTOMER }),
      );
      (prisma.inspectionFinding.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.inspection.update as jest.Mock).mockResolvedValue(buildMockInspection());

      const dtoNoDeclines: CustomerApprovalDto = {
        email: 'mario@example.com',
        approvedFindingIds: ['finding-001'],
        declinedFindingIds: [],
      };

      // Act
      await service.submitCustomerApproval(TENANT_ID, INSPECTION_ID, dtoNoDeclines);

      // Assert
      // Only the approve call should be made (declined is skipped because array is empty)
      expect(prisma.inspectionFinding.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.inspectionFinding.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['finding-001'] } },
        data: expect.objectContaining({
          status: FindingStatus.APPROVED,
          approvedByCustomer: true,
        }),
      });
    });

    it('should throw NotFoundException when inspection not found', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.submitCustomerApproval(TENANT_ID, INSPECTION_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.submitCustomerApproval(TENANT_ID, INSPECTION_ID, dto)).rejects.toThrow(
        'Inspection not found',
      );
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.submitCustomerApproval(OTHER_TENANT_ID, INSPECTION_ID, dto),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.inspection.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: INSPECTION_ID, tenantId: OTHER_TENANT_ID },
        }),
      );
    });
  });

  // ==========================================
  // generateReport
  // ==========================================

  describe('generateReport', () => {
    it('should throw NotFoundException if inspection does not exist before generating report', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.generateReport(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    beforeEach(() => {
      resetPdfMock();
    });

    it('should generate a PDF buffer with vehicle info and no findings', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [],
        items: [buildMockInspectionItem({ status: InspectionItemStatus.CHECKED, notes: null })],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      const result = await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      // Should render "No issues found." for empty findings
      expect(mockPdfDocInstance.font).toHaveBeenCalledWith('Helvetica-Oblique');
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('No issues found.');
    });

    it('should render CRITICAL severity findings in red', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [
          buildMockFinding({
            severity: FindingSeverity.CRITICAL,
            title: 'Engine Failure',
            description: 'Complete engine failure detected',
            recommendation: 'Replace engine',
            estimatedCost: 5000,
          }),
        ],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      const result = await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(mockPdfDocInstance.fillColor).toHaveBeenCalledWith('#dc2626');
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('[CRITICAL] ', { continued: true });
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith(
        'Engine Failure — Complete engine failure detected',
      );
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('  Recommendation: Replace engine');
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('  Estimated Cost: €5000.00');
    });

    it('should render HIGH severity findings in orange', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [
          buildMockFinding({
            severity: FindingSeverity.HIGH,
            title: 'Worn Brakes',
            description: 'Pads below 2mm',
            recommendation: undefined,
            estimatedCost: undefined,
          }),
        ],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(mockPdfDocInstance.fillColor).toHaveBeenCalledWith('#ea580c');
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('[HIGH] ', { continued: true });
    });

    it('should render MEDIUM severity findings in yellow', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [
          buildMockFinding({
            severity: FindingSeverity.MEDIUM,
            title: 'Worn Tires',
            description: 'Tread depth at 3mm',
            recommendation: undefined,
            estimatedCost: undefined,
          }),
        ],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(mockPdfDocInstance.fillColor).toHaveBeenCalledWith('#ca8a04');
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('[MEDIUM] ', { continued: true });
    });

    it('should render LOW severity findings in green', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [
          buildMockFinding({
            severity: FindingSeverity.LOW,
            title: 'Minor Scratch',
            description: 'Small scratch on bumper',
            recommendation: undefined,
            estimatedCost: undefined,
          }),
        ],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(mockPdfDocInstance.fillColor).toHaveBeenCalledWith('#16a34a');
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('[LOW] ', { continued: true });
    });

    it('should render findings with recommendation and estimatedCost', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [
          buildMockFinding({
            recommendation: 'Replace immediately',
            estimatedCost: 350.5,
          }),
        ],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('  Recommendation: Replace immediately');
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('  Estimated Cost: €350.50');
    });

    it('should skip recommendation and estimatedCost when not present', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [
          buildMockFinding({
            severity: FindingSeverity.HIGH,
            title: 'Test Finding',
            description: 'No extra info',
            recommendation: undefined,
            estimatedCost: undefined,
          }),
        ],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      const textCalls = (mockPdfDocInstance.text as jest.Mock).mock.calls.map(
        (c: unknown[]) => c[0],
      );
      expect(textCalls).not.toContain(expect.stringContaining('Recommendation:'));
      expect(textCalls).not.toContain(expect.stringContaining('Estimated Cost:'));
    });

    it('should render inspection items with all status types', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [],
        items: [
          buildMockInspectionItem({
            id: 'item-checked',
            status: InspectionItemStatus.CHECKED,
            notes: null,
            templateItem: buildMockTemplateItem({ category: 'BRAKES', name: 'Front Brakes' }),
          }),
          buildMockInspectionItem({
            id: 'item-issue',
            status: InspectionItemStatus.ISSUE_FOUND,
            notes: 'Tread low',
            templateItem: buildMockTemplateItem({ category: 'TIRES', name: 'Left Tire' }),
          }),
          buildMockInspectionItem({
            id: 'item-na',
            status: InspectionItemStatus.NOT_APPLICABLE,
            notes: null,
            templateItem: buildMockTemplateItem({ category: 'AC', name: 'AC System' }),
          }),
          buildMockInspectionItem({
            id: 'item-pending',
            status: InspectionItemStatus.PENDING,
            notes: null,
            templateItem: buildMockTemplateItem({ category: 'ENGINE', name: 'Oil Level' }),
          }),
        ],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      const textCalls = (mockPdfDocInstance.text as jest.Mock).mock.calls.map(
        (c: unknown[]) => c[0],
      );
      expect(textCalls).toContainEqual(expect.stringContaining('OK'));
      expect(textCalls).toContainEqual(expect.stringContaining('ISSUE'));
      expect(textCalls).toContainEqual(expect.stringContaining('N/A'));
      expect(textCalls).toContainEqual(expect.stringContaining('PENDING'));
    });

    it('should render item notes when present', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [],
        items: [
          buildMockInspectionItem({
            status: InspectionItemStatus.ISSUE_FOUND,
            notes: 'Brake fluid is dark, needs replacement',
          }),
        ],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith(
        '  Notes: Brake fluid is dark, needs replacement',
      );
    });

    it('should render mileage when present', async () => {
      // Arrange
      const inspection = buildMockInspection({ mileage: 125000, findings: [] });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      const textCalls = (mockPdfDocInstance.text as jest.Mock).mock.calls.map(
        (c: unknown[]) => c[0],
      );
      expect(textCalls).toContainEqual(expect.stringContaining('Mileage:'));
    });

    it('should skip mileage when null', async () => {
      // Arrange
      const inspection = buildMockInspection({ mileage: null, findings: [] });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      const textCalls = (mockPdfDocInstance.text as jest.Mock).mock.calls.map(
        (c: unknown[]) => c[0],
      );
      const mileageCalls = textCalls.filter(
        (t: string) => typeof t === 'string' && t.includes('Mileage:'),
      );
      expect(mileageCalls).toHaveLength(0);
    });

    it('should render fuel level when present', async () => {
      // Arrange
      const inspection = buildMockInspection({ fuelLevel: FuelLevel.THREE_QUARTERS, findings: [] });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      const textCalls = (mockPdfDocInstance.text as jest.Mock).mock.calls.map(
        (c: unknown[]) => c[0],
      );
      expect(textCalls).toContainEqual(expect.stringContaining('Fuel Level:'));
    });

    it('should skip fuel level when null', async () => {
      // Arrange
      const inspection = buildMockInspection({ fuelLevel: null, findings: [] });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      const textCalls = (mockPdfDocInstance.text as jest.Mock).mock.calls.map(
        (c: unknown[]) => c[0],
      );
      const fuelCalls = textCalls.filter(
        (t: string) => typeof t === 'string' && t.includes('Fuel Level:'),
      );
      expect(fuelCalls).toHaveLength(0);
    });

    it('should reject the promise when PDFDocument emits an error', async () => {
      // Arrange - override end() to emit error instead of data+end
      mockPdfDocInstance.end = jest.fn(() => {
        if (pdfEventHandlers['error']) {
          pdfEventHandlers['error'].forEach(h => h(new Error('PDF generation failed')));
        }
      });

      const inspection = buildMockInspection({ findings: [] });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act & Assert
      await expect(service.generateReport(TENANT_ID, INSPECTION_ID)).rejects.toThrow(
        'PDF generation failed',
      );
    });

    it('should render vehicle make, model, license plate, and mechanic name', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [],
        vehicle: buildMockVehicle({ make: 'BMW', model: 'X5', licensePlate: 'ZZ999AA' }),
        mechanic: buildMockMechanic({ name: 'Marco Verdi' }),
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('Make/Model: BMW X5');
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('License Plate: ZZ999AA');
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('Mechanic: Marco Verdi');
    });

    it('should render multiple findings with mixed severities', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [
          buildMockFinding({
            id: 'f1',
            severity: FindingSeverity.CRITICAL,
            title: 'Brake Failure',
            description: 'Complete brake failure',
            recommendation: 'Urgent replacement',
            estimatedCost: 1200,
          }),
          buildMockFinding({
            id: 'f2',
            severity: FindingSeverity.LOW,
            title: 'Wiper Fluid',
            description: 'Low wiper fluid',
            recommendation: undefined,
            estimatedCost: undefined,
          }),
        ],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(mockPdfDocInstance.fillColor).toHaveBeenCalledWith('#dc2626');
      expect(mockPdfDocInstance.fillColor).toHaveBeenCalledWith('#16a34a');
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('[CRITICAL] ', { continued: true });
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('[LOW] ', { continued: true });
      expect(mockPdfDocInstance.end).toHaveBeenCalled();
    });

    it('should call doc.end() to finalize the PDF', async () => {
      // Arrange
      const inspection = buildMockInspection({ findings: [] });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(mockPdfDocInstance.end).toHaveBeenCalledTimes(1);
    });

    it('should render the report header with title and report ID', async () => {
      // Arrange
      const inspection = buildMockInspection({ findings: [] });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith('Digital Vehicle Inspection Report', {
        align: 'center',
      });
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith(`Report ID: ${INSPECTION_ID}`, {
        align: 'center',
      });
    });

    it('should render the date using inspection startedAt', async () => {
      // Arrange
      const startDate = new Date('2024-06-01T09:00:00Z');
      const inspection = buildMockInspection({ startedAt: startDate, findings: [] });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(mockPdfDocInstance.text).toHaveBeenCalledWith(
        `Date: ${startDate.toLocaleDateString('it-IT')}`,
      );
    });

    it('should render footer with generation timestamp', async () => {
      // Arrange
      const inspection = buildMockInspection({ findings: [] });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.generateReport(TENANT_ID, INSPECTION_ID);

      // Assert
      const textCalls = (mockPdfDocInstance.text as jest.Mock).mock.calls;
      const footerCall = textCalls.find(
        (c: unknown[]) =>
          typeof c[0] === 'string' && (c[0] as string).includes('Generated by MechMind OS'),
      );
      expect(footerCall).toBeDefined();
      expect(footerCall[1]).toEqual({ align: 'center' });
    });
  });

  // ==========================================
  // mapToResponseDto (tested indirectly)
  // ==========================================

  describe('response mapping', () => {
    it('should map completedAt as undefined when null', async () => {
      // Arrange
      const inspection = buildMockInspection({ completedAt: null });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      const result = await service.findById(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(result.completedAt).toBeUndefined();
    });

    it('should map completedAt when present', async () => {
      // Arrange
      const completedDate = new Date('2024-06-01T12:00:00Z');
      const inspection = buildMockInspection({ completedAt: completedDate });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      const result = await service.findById(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(result.completedAt).toEqual(completedDate);
    });

    it('should convert estimatedCost to number', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [buildMockFinding({ estimatedCost: '350.50' })],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      const result = await service.findById(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(result.findings[0].estimatedCost).toBe(350.5);
      expect(typeof result.findings[0].estimatedCost).toBe('number');
    });

    it('should map estimatedCost as undefined when null', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [buildMockFinding({ estimatedCost: null })],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      const result = await service.findById(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(result.findings[0].estimatedCost).toBeUndefined();
    });

    it('should map all photo fields including optional thumbnailUrl', async () => {
      // Arrange
      const inspection = buildMockInspection({
        items: [
          buildMockInspectionItem({
            photos: [
              buildMockPhoto({ thumbnailUrl: null }),
              buildMockPhoto({ id: 'photo-002', thumbnailUrl: 'https://s3.example.com/thumb.jpg' }),
            ],
          }),
        ],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      const result = await service.findById(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(result.items[0].photos[0].thumbnailUrl).toBeUndefined();
      expect(result.items[0].photos[1].thumbnailUrl).toBe('https://s3.example.com/thumb.jpg');
    });

    it('should map inspection-level photos separately from item photos', async () => {
      // Arrange
      const inspection = buildMockInspection({
        items: [buildMockInspectionItem({ photos: [buildMockPhoto({ id: 'item-photo' })] })],
        photos: [buildMockPhoto({ id: 'global-photo' })],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      const result = await service.findById(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(result.items[0].photos).toHaveLength(1);
      expect(result.items[0].photos[0].id).toBe('item-photo');
      expect(result.photos).toHaveLength(1);
      expect(result.photos[0].id).toBe('global-photo');
    });

    it('should map customerNotified and customerViewed flags', async () => {
      // Arrange
      const inspection = buildMockInspection({
        customerNotified: true,
        customerViewed: true,
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      const result = await service.findById(TENANT_ID, INSPECTION_ID);

      // Assert
      expect(result.customerNotified).toBe(true);
      expect(result.customerViewed).toBe(true);
    });
  });

  // ==========================================
  // Full Workflow Integration (unit-level)
  // ==========================================

  describe('inspection workflow: create -> update items -> add findings -> upload photos -> complete -> customer approval', () => {
    it('should support the full inspection lifecycle', async () => {
      // Step 1: Create inspection
      const template = buildMockTemplate();
      const createdInspection = buildMockInspection();
      (prisma.inspectionTemplate.findFirst as jest.Mock).mockResolvedValue(template);
      (prisma.inspection.create as jest.Mock).mockResolvedValue(createdInspection);

      const createDto: CreateInspectionDto = {
        vehicleId: VEHICLE_ID,
        customerId: CUSTOMER_ID,
        templateId: TEMPLATE_ID,
        mechanicId: MECHANIC_ID,
        mileage: 45000,
      };

      const created = await service.create(TENANT_ID, createDto);
      expect(created.status).toBe(InspectionStatus.IN_PROGRESS);
      expect(created.items.length).toBeGreaterThan(0);

      // Step 2: Update items with findings
      const inspectionWithUpdatedItems = buildMockInspection({
        items: [
          buildMockInspectionItem({
            status: InspectionItemStatus.ISSUE_FOUND,
            notes: 'Brake pads worn',
            severity: FindingSeverity.HIGH,
          }),
        ],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(createdInspection);
      (prisma.inspectionItem.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.inspection.update as jest.Mock).mockResolvedValue(inspectionWithUpdatedItems);

      const updateDto: UpdateInspectionDto = {
        items: [
          {
            templateItemId: TEMPLATE_ITEM_ID,
            status: InspectionItemStatus.ISSUE_FOUND as never,
            notes: 'Brake pads worn',
            severity: FindingSeverity.HIGH as never,
          },
        ],
      };

      await service.update(TENANT_ID, INSPECTION_ID, updateDto, MECHANIC_ID);
      expect(prisma.inspectionItem.updateMany).toHaveBeenCalled();

      // Step 3: Add a finding
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(createdInspection);
      (prisma.inspectionFinding.create as jest.Mock).mockResolvedValue(buildMockFinding());

      const findingDto: CreateFindingDto = {
        category: 'BRAKES',
        title: 'Worn Brake Pads',
        description: 'Front pads below 2mm',
        severity: FindingSeverity.HIGH as never,
        recommendation: 'Replace immediately',
        estimatedCost: 250,
      };

      await service.addFinding(TENANT_ID, INSPECTION_ID, findingDto);
      expect(prisma.inspectionFinding.create).toHaveBeenCalled();

      // Step 4: Upload photo
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(createdInspection);
      (prisma.inspectionPhoto.create as jest.Mock).mockResolvedValue({
        id: PHOTO_ID,
        url: 'https://s3.example.com/signed-url',
      });

      const photoResult = await service.uploadPhoto(
        TENANT_ID,
        INSPECTION_ID,
        Buffer.from('photo-data'),
        'image/jpeg',
        MECHANIC_ID,
        ITEM_ID,
        'DAMAGE',
        'Worn brake pad closeup',
      );
      expect(photoResult.id).toBe(PHOTO_ID);
      expect(s3.upload).toHaveBeenCalled();

      // Step 5: Complete inspection (READY_FOR_CUSTOMER)
      const completedInspection = buildMockInspection({
        status: InspectionStatus.READY_FOR_CUSTOMER,
        completedAt: new Date(),
        findings: [buildMockFinding()],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(createdInspection);
      (prisma.inspection.update as jest.Mock)
        .mockResolvedValueOnce(completedInspection) // status update
        .mockResolvedValueOnce({ ...completedInspection, customerNotified: true }); // notifyCustomer

      const completeDto: UpdateInspectionDto = {
        status: InspectionStatus.READY_FOR_CUSTOMER as never,
      };

      const completed = await service.update(TENANT_ID, INSPECTION_ID, completeDto, MECHANIC_ID);
      expect(completed.status).toBe(InspectionStatus.READY_FOR_CUSTOMER);
      expect(notifications.sendNotification).toHaveBeenCalled();

      // Step 6: Customer approval
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(completedInspection);
      (prisma.inspectionFinding.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.inspection.update as jest.Mock).mockResolvedValue(
        buildMockInspection({ status: InspectionStatus.APPROVED }),
      );

      const approvalDto: CustomerApprovalDto = {
        email: 'mario@example.com',
        approvedFindingIds: [FINDING_ID],
        declinedFindingIds: [],
      };

      await service.submitCustomerApproval(TENANT_ID, INSPECTION_ID, approvalDto);
      expect(prisma.inspection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: InspectionStatus.APPROVED }),
        }),
      );
      expect(notifications.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'inspection_completed',
          title: 'Inspection Approved',
        }),
      );
    });
  });

  // ==========================================
  // State Machine
  // ==========================================

  describe('State Machine', () => {
    it('should reject ARCHIVED → IN_PROGRESS (update)', async () => {
      // Arrange
      const inspection = buildMockInspection({
        status: InspectionStatus.ARCHIVED,
        mechanicId: MECHANIC_ID,
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      const dto: UpdateInspectionDto = { status: InspectionStatus.IN_PROGRESS as never };

      // Act & Assert
      await expect(service.update(TENANT_ID, INSPECTION_ID, dto, MECHANIC_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject APPROVED → READY_FOR_CUSTOMER (update)', async () => {
      // Arrange
      const inspection = buildMockInspection({
        status: InspectionStatus.APPROVED,
        mechanicId: MECHANIC_ID,
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      const dto: UpdateInspectionDto = { status: InspectionStatus.READY_FOR_CUSTOMER as never };

      // Act & Assert
      await expect(service.update(TENANT_ID, INSPECTION_ID, dto, MECHANIC_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject IN_PROGRESS → APPROVED (update)', async () => {
      // Arrange
      const inspection = buildMockInspection({
        status: InspectionStatus.IN_PROGRESS,
        mechanicId: MECHANIC_ID,
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      const dto: UpdateInspectionDto = { status: InspectionStatus.APPROVED as never };

      // Act & Assert
      await expect(service.update(TENANT_ID, INSPECTION_ID, dto, MECHANIC_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject IN_PROGRESS → APPROVED (submitCustomerApproval)', async () => {
      // Arrange
      const inspection = buildMockInspection({
        status: InspectionStatus.IN_PROGRESS,
        customer: buildMockCustomer(),
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      const dto: CustomerApprovalDto = {
        email: 'mario@example.com',
        approvedFindingIds: ['finding-001'],
        declinedFindingIds: [],
      };

      // Act & Assert
      await expect(service.submitCustomerApproval(TENANT_ID, INSPECTION_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================
  // Public Token Workflow
  // ==========================================

  describe('sendToCustomer', () => {
    it('should generate public token and emit event', async () => {
      // Arrange
      const inspection = buildMockInspection();
      const mockToken = { token: 'public-token-123', tenantId: TENANT_ID };
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      (publicTokenService.revokeTokensForEntity as jest.Mock).mockResolvedValue(undefined);
      (publicTokenService.generateToken as jest.Mock).mockResolvedValue(mockToken);

      // Act
      const result = await service.sendToCustomer(TENANT_ID, INSPECTION_ID, 'SMS');

      // Assert
      expect(publicTokenService.revokeTokensForEntity).toHaveBeenCalledWith(TENANT_ID, 'Inspection', INSPECTION_ID);
      expect(publicTokenService.generateToken).toHaveBeenCalledWith(
        TENANT_ID,
        'DVI_REPORT',
        INSPECTION_ID,
        'Inspection',
        72,
        { channel: 'SMS' },
      );
      expect(result.reportUrl).toContain('public-token-123');
      expect(eventEmitter.emit).toHaveBeenCalledWith('inspection.sentToCustomer', expect.objectContaining({
        inspectionId: INSPECTION_ID,
        tenantId: TENANT_ID,
        channel: 'SMS',
      }));
    });

    it('should support EMAIL channel', async () => {
      // Arrange
      const inspection = buildMockInspection();
      const mockToken = { token: 'token-email', tenantId: TENANT_ID };
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      (publicTokenService.revokeTokensForEntity as jest.Mock).mockResolvedValue(undefined);
      (publicTokenService.generateToken as jest.Mock).mockResolvedValue(mockToken);

      // Act
      const result = await service.sendToCustomer(TENANT_ID, INSPECTION_ID, 'EMAIL');

      // Assert
      expect(publicTokenService.generateToken).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        { channel: 'EMAIL' },
      );
      expect(result.reportUrl).toContain('token-email');
    });

    it('should support WHATSAPP channel', async () => {
      // Arrange
      const inspection = buildMockInspection();
      const mockToken = { token: 'token-wa', tenantId: TENANT_ID };
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      (publicTokenService.revokeTokensForEntity as jest.Mock).mockResolvedValue(undefined);
      (publicTokenService.generateToken as jest.Mock).mockResolvedValue(mockToken);

      // Act
      await service.sendToCustomer(TENANT_ID, INSPECTION_ID, 'WHATSAPP');

      // Assert
      expect(publicTokenService.generateToken).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        { channel: 'WHATSAPP' },
      );
    });

    it('should throw NotFoundException when inspection not found', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.sendToCustomer(TENANT_ID, INSPECTION_ID, 'SMS')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should emit event with customer and vehicle info', async () => {
      // Arrange
      const inspection = buildMockInspection({
        customerId: 'cust-123',
        vehicle: buildMockVehicle({ make: 'Fiat', model: '500' }),
      });
      const mockToken = { token: 'tok', tenantId: TENANT_ID };
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      (publicTokenService.revokeTokensForEntity as jest.Mock).mockResolvedValue(undefined);
      (publicTokenService.generateToken as jest.Mock).mockResolvedValue(mockToken);

      // Act
      await service.sendToCustomer(TENANT_ID, INSPECTION_ID, 'SMS');

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith('inspection.sentToCustomer', {
        inspectionId: INSPECTION_ID,
        tenantId: TENANT_ID,
        customerId: 'cust-123',
        channel: 'SMS',
        reportUrl: expect.stringContaining('tok'),
      });
    });
  });

  describe('getByPublicToken', () => {
    it('should retrieve inspection by public token', async () => {
      // Arrange
      const mockTokenRecord = { entityId: INSPECTION_ID, tenantId: TENANT_ID };
      const inspection = buildMockInspection({ customerViewed: false });
      (publicTokenService.validateToken as jest.Mock).mockResolvedValue(mockTokenRecord);
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      const result = await service.getByPublicToken('public-token-123');

      // Assert
      expect(publicTokenService.validateToken).toHaveBeenCalledWith('public-token-123');
      expect(result.id).toBe(INSPECTION_ID);
      expect(result.status).toBe(InspectionStatus.IN_PROGRESS);
    });

    it('should mark inspection as customer viewed', async () => {
      // Arrange
      const mockTokenRecord = { entityId: INSPECTION_ID, tenantId: TENANT_ID };
      const inspection = buildMockInspection({ customerViewed: false });
      (publicTokenService.validateToken as jest.Mock).mockResolvedValue(mockTokenRecord);
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      (prisma.inspection.update as jest.Mock).mockResolvedValue({
        ...inspection,
        customerViewed: true,
      });

      // Act
      await service.getByPublicToken('public-token-123');

      // Assert
      expect(prisma.inspection.update).toHaveBeenCalledWith({
        where: { id: INSPECTION_ID },
        data: { customerViewed: true },
      });
    });

    it('should NOT call update if already customerViewed', async () => {
      // Arrange
      const mockTokenRecord = { entityId: INSPECTION_ID, tenantId: TENANT_ID };
      const inspection = buildMockInspection({ customerViewed: true });
      (publicTokenService.validateToken as jest.Mock).mockResolvedValue(mockTokenRecord);
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act
      await service.getByPublicToken('public-token-123');

      // Assert
      expect(prisma.inspection.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when inspection not found', async () => {
      // Arrange
      const mockTokenRecord = { entityId: INSPECTION_ID, tenantId: TENANT_ID };
      (publicTokenService.validateToken as jest.Mock).mockResolvedValue(mockTokenRecord);
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getByPublicToken('invalid-token')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveRepairsViaToken', () => {
    it('should approve findings via public token', async () => {
      // Arrange
      const mockTokenRecord = { entityId: INSPECTION_ID, tenantId: TENANT_ID };
      const inspection = buildMockInspection({
        findings: [buildMockFinding({ id: FINDING_ID })],
      });
      (publicTokenService.validateToken as jest.Mock).mockResolvedValue(mockTokenRecord);
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      (prisma.inspectionFinding.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.inspection.update as jest.Mock).mockResolvedValue(
        buildMockInspection({ status: InspectionStatus.APPROVED }),
      );
      (publicTokenService.consumeToken as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.approveRepairsViaToken('public-token', [FINDING_ID], []);

      // Assert
      expect(prisma.inspectionFinding.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [FINDING_ID] } },
        data: expect.objectContaining({
          status: FindingStatus.APPROVED,
          approvedByCustomer: true,
        }),
      });
      expect(prisma.inspection.update).toHaveBeenCalledWith({
        where: { id: INSPECTION_ID },
        data: {
          status: InspectionStatus.APPROVED,
          approvedAt: expect.any(Date),
        },
      });
      expect(publicTokenService.consumeToken).toHaveBeenCalledWith('public-token');
    });

    it('should decline findings via public token', async () => {
      // Arrange
      const mockTokenRecord = { entityId: INSPECTION_ID, tenantId: TENANT_ID };
      const inspection = buildMockInspection({
        findings: [buildMockFinding({ id: FINDING_ID })],
      });
      (publicTokenService.validateToken as jest.Mock).mockResolvedValue(mockTokenRecord);
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      (prisma.inspectionFinding.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.inspection.update as jest.Mock).mockResolvedValue(
        buildMockInspection({ status: InspectionStatus.APPROVED }),
      );
      (publicTokenService.consumeToken as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.approveRepairsViaToken('public-token', [], [FINDING_ID]);

      // Assert
      expect(prisma.inspectionFinding.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [FINDING_ID] } },
        data: { status: FindingStatus.DECLINED },
      });
    });

    it('should handle mixed approve/decline findings', async () => {
      // Arrange
      const finding1 = buildMockFinding({ id: 'finding-1' });
      const finding2 = buildMockFinding({ id: 'finding-2' });
      const mockTokenRecord = { entityId: INSPECTION_ID, tenantId: TENANT_ID };
      const inspection = buildMockInspection({
        findings: [finding1, finding2],
      });
      (publicTokenService.validateToken as jest.Mock).mockResolvedValue(mockTokenRecord);
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      (prisma.inspectionFinding.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.inspection.update as jest.Mock).mockResolvedValue(
        buildMockInspection({ status: InspectionStatus.APPROVED }),
      );
      (publicTokenService.consumeToken as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.approveRepairsViaToken('token', ['finding-1'], ['finding-2']);

      // Assert
      expect(prisma.inspectionFinding.updateMany).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when finding does not belong to inspection', async () => {
      // Arrange
      const mockTokenRecord = { entityId: INSPECTION_ID, tenantId: TENANT_ID };
      const inspection = buildMockInspection({
        findings: [buildMockFinding({ id: 'finding-valid' })],
      });
      (publicTokenService.validateToken as jest.Mock).mockResolvedValue(mockTokenRecord);
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act & Assert
      await expect(service.approveRepairsViaToken('token', ['finding-invalid'], [])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when inspection not found', async () => {
      // Arrange
      const mockTokenRecord = { entityId: INSPECTION_ID, tenantId: TENANT_ID };
      (publicTokenService.validateToken as jest.Mock).mockResolvedValue(mockTokenRecord);
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.approveRepairsViaToken('token', [], [])).rejects.toThrow(NotFoundException);
    });

    it('should emit inspection.repairsApproved event', async () => {
      // Arrange
      const mockTokenRecord = { entityId: INSPECTION_ID, tenantId: TENANT_ID };
      const inspection = buildMockInspection({
        findings: [buildMockFinding({ id: FINDING_ID })],
      });
      (publicTokenService.validateToken as jest.Mock).mockResolvedValue(mockTokenRecord);
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      (prisma.inspectionFinding.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.inspection.update as jest.Mock).mockResolvedValue(
        buildMockInspection({ status: InspectionStatus.APPROVED }),
      );
      (publicTokenService.consumeToken as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.approveRepairsViaToken('token', [FINDING_ID], []);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith('inspection.repairsApproved', {
        inspectionId: INSPECTION_ID,
        tenantId: TENANT_ID,
        approvedFindingIds: [FINDING_ID],
        declinedFindingIds: [],
      });
    });
  });

  // ==========================================
  // Estimate Conversion
  // ==========================================

  describe('createEstimateFromFindings', () => {
    it('should create estimate from inspection findings', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [
          buildMockFinding({ id: FINDING_ID, title: 'Brake pads', estimatedCost: '150.00' }),
        ],
        customerId: CUSTOMER_ID,
        vehicleId: VEHICLE_ID,
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      (prisma.estimate.findFirst as jest.Mock).mockResolvedValue(null);
      const mockEstimate = {
        id: 'est-001',
        estimateNumber: `EST-${new Date().getFullYear()}-0001`,
        customerId: CUSTOMER_ID,
        vehicleId: VEHICLE_ID,
        totalCents: 18300,
        lines: [],
      };
      (prisma.estimate.create as jest.Mock).mockResolvedValue(mockEstimate);

      // Act
      const result = (await service.createEstimateFromFindings(TENANT_ID, INSPECTION_ID, [FINDING_ID], MECHANIC_ID)) as typeof mockEstimate;

      // Assert
      expect(prisma.estimate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            customerId: CUSTOMER_ID,
            vehicleId: VEHICLE_ID,
            status: 'DRAFT',
          }),
        }),
      );
      expect(result.id).toBe('est-001');
    });

    it('should throw NotFoundException when inspection not found', async () => {
      // Arrange
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createEstimateFromFindings(TENANT_ID, INSPECTION_ID, [FINDING_ID], MECHANIC_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when no findings match', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [],
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);

      // Act & Assert
      await expect(
        service.createEstimateFromFindings(TENANT_ID, INSPECTION_ID, [FINDING_ID], MECHANIC_ID),
      ).rejects.toThrow('No matching findings found');
    });

    it('should calculate correct estimate number with multiple estimates', async () => {
      // Arrange
      const year = new Date().getFullYear();
      const inspection = buildMockInspection({
        findings: [buildMockFinding({ estimatedCost: '100.00' })],
        customerId: CUSTOMER_ID,
        vehicleId: VEHICLE_ID,
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      const lastEst = {
        estimateNumber: `EST-${year}-0005`,
      };
      (prisma.estimate.findFirst as jest.Mock).mockResolvedValue(lastEst);
      (prisma.estimate.create as jest.Mock).mockResolvedValue({
        id: 'est',
        estimateNumber: `EST-${year}-0006`,
        lines: [],
      });

      // Act
      await service.createEstimateFromFindings(TENANT_ID, INSPECTION_ID, ['f1'], MECHANIC_ID);

      // Assert
      expect(prisma.estimate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estimateNumber: `EST-${year}-0006`,
          }),
        }),
      );
    });

    it('should handle NaN estimate number gracefully (non-numeric suffix)', async () => {
      // Arrange
      const year = new Date().getFullYear();
      const inspection = buildMockInspection({
        findings: [buildMockFinding({ estimatedCost: '50.00' })],
        customerId: CUSTOMER_ID,
        vehicleId: VEHICLE_ID,
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      const lastEst = {
        estimateNumber: `EST-${year}-INVALID`, // Non-numeric suffix
      };
      (prisma.estimate.findFirst as jest.Mock).mockResolvedValue(lastEst);
      (prisma.estimate.create as jest.Mock).mockResolvedValue({
        id: 'est',
        estimateNumber: `EST-${year}-0001`, // Should fallback to 1
        lines: [],
      });

      // Act
      await service.createEstimateFromFindings(TENANT_ID, INSPECTION_ID, ['f1'], MECHANIC_ID);

      // Assert
      expect(prisma.estimate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estimateNumber: `EST-${year}-0001`,
          }),
        }),
      );
    });

    it('should calculate VAT correctly (22%)', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [buildMockFinding({ estimatedCost: '100.00' })], // 10000 cents
        customerId: CUSTOMER_ID,
        vehicleId: VEHICLE_ID,
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      (prisma.estimate.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.estimate.create as jest.Mock).mockResolvedValue({
        id: 'est',
        lines: [],
      });

      // Act
      await service.createEstimateFromFindings(TENANT_ID, INSPECTION_ID, ['f1'], MECHANIC_ID);

      // Assert
      expect(prisma.estimate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotalCents: 10000, // 100 * 100
            vatCents: 2200, // 100 * 22
            totalCents: 12200, // subtotal + vat
          }),
        }),
      );
    });

    it('should handle zero cost findings', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [buildMockFinding({ estimatedCost: null })], // null cost
        customerId: CUSTOMER_ID,
        vehicleId: VEHICLE_ID,
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      (prisma.estimate.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.estimate.create as jest.Mock).mockResolvedValue({
        id: 'est',
        lines: [],
      });

      // Act
      await service.createEstimateFromFindings(TENANT_ID, INSPECTION_ID, ['f1'], MECHANIC_ID);

      // Assert
      expect(prisma.estimate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotalCents: 0,
            vatCents: 0,
            totalCents: 0,
          }),
        }),
      );
    });

    it('should include inspection reference in notes', async () => {
      // Arrange
      const inspection = buildMockInspection({
        findings: [buildMockFinding({ estimatedCost: '100.00' })],
        customerId: CUSTOMER_ID,
        vehicleId: VEHICLE_ID,
      });
      (prisma.inspection.findFirst as jest.Mock).mockResolvedValue(inspection);
      (prisma.estimate.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.estimate.create as jest.Mock).mockResolvedValue({ id: 'est', lines: [] });

      // Act
      await service.createEstimateFromFindings(TENANT_ID, INSPECTION_ID, ['f1'], MECHANIC_ID);

      // Assert
      expect(prisma.estimate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: `Generated from inspection ${INSPECTION_ID}`,
          }),
        }),
      );
    });
  });
});
