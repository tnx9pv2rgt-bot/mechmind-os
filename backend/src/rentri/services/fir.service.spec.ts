import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FirService } from './fir.service';
import { PrismaService } from '@common/services/prisma.service';
import { WasteFirStatus, WasteHazardClass, WastePhysicalState } from '@prisma/client';
import { CreateFirDto } from '../dto/waste-fir.dto';

// ---------------------------------------------------------------------------
// Mock delegates
// ---------------------------------------------------------------------------

interface MockWasteFirDelegate {
  findMany: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  count: jest.Mock;
}

interface MockTenantDelegate {
  findUnique: jest.Mock;
}

interface MockPrisma {
  wasteFir: MockWasteFirDelegate;
  tenant: MockTenantDelegate;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const FIR_ID = 'fir-001';

const mockFir = {
  id: FIR_ID,
  tenantId: TENANT_ID,
  firNumber: 'FIR-2026-0001',
  status: WasteFirStatus.DRAFT,
  cerCode: '130205*',
  cerDescription: 'Oli minerali per motori',
  hazardClass: WasteHazardClass.PERICOLOSO,
  physicalState: WastePhysicalState.LIQUIDO,
  quantityKg: 50,
  producerName: 'Officina Test',
  producerFiscalCode: '12345678901',
  producerAddress: 'Via Test 1',
  transporterId: 'transporter-001',
  destinationId: 'destination-001',
  scheduledDate: new Date('2026-04-01'),
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FirService', () => {
  let service: FirService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    const mockPrisma: MockPrisma = {
      wasteFir: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FirService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<FirService>(FirService);
    prisma = module.get(PrismaService) as unknown as MockPrisma;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFir', () => {
    it('should create FIR with correct data', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue(null); // no previous FIR
      prisma.tenant.findUnique.mockResolvedValue({ id: TENANT_ID, name: 'Officina Test' });
      prisma.wasteFir.create.mockResolvedValue({ ...mockFir });

      const dto: CreateFirDto = {
        cerCode: '130205*',
        cerDescription: 'Oli minerali per motori',
        quantityKg: 50,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
        transporterId: 'transporter-001',
        destinationId: 'destination-001',
        scheduledDate: '2026-04-01',
      };

      const result = await service.createFir(TENANT_ID, dto, 'user-001');

      expect(prisma.wasteFir.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            firNumber: expect.stringMatching(/^FIR-\d{4}-\d{4}$/),
            status: WasteFirStatus.DRAFT,
            cerCode: '130205*',
          }),
        }),
      );
      expect(result).toBeDefined();
    });
  });

  describe('updateStatus', () => {
    it('should allow valid transition DRAFT -> VIDIMATED', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({ ...mockFir, status: WasteFirStatus.DRAFT });
      prisma.wasteFir.update.mockResolvedValue({ ...mockFir, status: WasteFirStatus.VIDIMATED });

      const result = await service.updateStatus(TENANT_ID, FIR_ID, WasteFirStatus.VIDIMATED);

      expect(prisma.wasteFir.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: FIR_ID },
          data: expect.objectContaining({ status: WasteFirStatus.VIDIMATED }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('should allow valid transition VIDIMATED -> IN_TRANSIT', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({ ...mockFir, status: WasteFirStatus.VIDIMATED });
      prisma.wasteFir.update.mockResolvedValue({ ...mockFir, status: WasteFirStatus.IN_TRANSIT });

      const result = await service.updateStatus(TENANT_ID, FIR_ID, WasteFirStatus.IN_TRANSIT);

      expect(prisma.wasteFir.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: WasteFirStatus.IN_TRANSIT,
            pickupDate: expect.any(Date),
          }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for invalid transition DRAFT -> DELIVERED', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({ ...mockFir, status: WasteFirStatus.DRAFT });

      await expect(
        service.updateStatus(TENANT_ID, FIR_ID, WasteFirStatus.DELIVERED),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for transition from CONFIRMED', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({ ...mockFir, status: WasteFirStatus.CONFIRMED });

      await expect(
        service.updateStatus(TENANT_ID, FIR_ID, WasteFirStatus.CANCELLED),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if FIR does not exist', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStatus(TENANT_ID, 'nonexistent', WasteFirStatus.VIDIMATED),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('vidimateFir', () => {
    it('should update vivifirCode and status to VIDIMATED', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({ ...mockFir, status: WasteFirStatus.DRAFT });
      prisma.wasteFir.update.mockResolvedValue({
        ...mockFir,
        status: WasteFirStatus.VIDIMATED,
        vivifirCode: 'VF2026-ABC123',
      });

      const result = await service.vidimateFir(TENANT_ID, FIR_ID, 'VF2026-ABC123');

      expect(prisma.wasteFir.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: WasteFirStatus.VIDIMATED,
            vivifirCode: 'VF2026-ABC123',
          }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('should throw if FIR is not in DRAFT status', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({
        ...mockFir,
        status: WasteFirStatus.IN_TRANSIT,
      });

      await expect(service.vidimateFir(TENANT_ID, FIR_ID, 'VF2026-ABC123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when FIR does not exist', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue(null);

      await expect(service.vidimateFir(TENANT_ID, 'nonexistent', 'VF2026-ABC123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // findAllFirs
  // =========================================================================
  describe('findAllFirs', () => {
    it('should return paginated FIR list', async () => {
      prisma.wasteFir.findMany.mockResolvedValue([mockFir]);
      prisma.wasteFir.count.mockResolvedValue(1);

      const result = await service.findAllFirs(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.pages).toBe(1);
    });

    it('should apply status filter', async () => {
      prisma.wasteFir.findMany.mockResolvedValue([]);
      prisma.wasteFir.count.mockResolvedValue(0);

      await service.findAllFirs(TENANT_ID, { status: 'DRAFT' });

      expect(prisma.wasteFir.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'DRAFT' }),
        }),
      );
    });

    it('should use default page and limit', async () => {
      prisma.wasteFir.findMany.mockResolvedValue([]);
      prisma.wasteFir.count.mockResolvedValue(0);

      const result = await service.findAllFirs(TENANT_ID, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // =========================================================================
  // findOneFir
  // =========================================================================
  describe('findOneFir', () => {
    it('should return FIR when found', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue(mockFir);

      const result = await service.findOneFir(TENANT_ID, FIR_ID);

      expect(result).toEqual(mockFir);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue(null);

      await expect(service.findOneFir(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // updateStatus — additional transitions
  // =========================================================================
  describe('updateStatus (additional transitions)', () => {
    it('should allow IN_TRANSIT -> DELIVERED and set deliveryDate', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({
        ...mockFir,
        status: WasteFirStatus.IN_TRANSIT,
      });
      prisma.wasteFir.update.mockResolvedValue({ ...mockFir, status: WasteFirStatus.DELIVERED });

      await service.updateStatus(TENANT_ID, FIR_ID, WasteFirStatus.DELIVERED);

      expect(prisma.wasteFir.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: WasteFirStatus.DELIVERED,
            deliveryDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should allow DELIVERED -> CONFIRMED and set confirmationDate', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({ ...mockFir, status: WasteFirStatus.DELIVERED });
      prisma.wasteFir.update.mockResolvedValue({ ...mockFir, status: WasteFirStatus.CONFIRMED });

      await service.updateStatus(TENANT_ID, FIR_ID, WasteFirStatus.CONFIRMED);

      expect(prisma.wasteFir.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: WasteFirStatus.CONFIRMED,
            confirmationDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should allow DRAFT -> CANCELLED', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({ ...mockFir, status: WasteFirStatus.DRAFT });
      prisma.wasteFir.update.mockResolvedValue({ ...mockFir, status: WasteFirStatus.CANCELLED });

      const result = await service.updateStatus(TENANT_ID, FIR_ID, WasteFirStatus.CANCELLED);

      expect(result).toBeDefined();
    });

    it('should reject CANCELLED -> any status', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({ ...mockFir, status: WasteFirStatus.CANCELLED });

      await expect(service.updateStatus(TENANT_ID, FIR_ID, WasteFirStatus.DRAFT)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // createFir — sequential numbering
  // =========================================================================
  describe('createFir (sequential numbering)', () => {
    it('should increment FIR number from last existing', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({
        firNumber: `FIR-${new Date().getFullYear()}-0010`,
      });
      prisma.tenant.findUnique.mockResolvedValue({ id: TENANT_ID, name: 'Officina' });
      prisma.wasteFir.create.mockResolvedValue(mockFir);

      const dto: CreateFirDto = {
        cerCode: '130205*',
        cerDescription: 'Oli minerali per motori',
        quantityKg: 50,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
        transporterId: 'transporter-001',
        destinationId: 'destination-001',
        scheduledDate: '2026-04-01',
      };

      await service.createFir(TENANT_ID, dto);

      expect(prisma.wasteFir.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firNumber: `FIR-${new Date().getFullYear()}-0011`,
          }),
        }),
      );
    });

    it('should use empty producer fields when tenant not found', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue(null);
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.wasteFir.create.mockResolvedValue(mockFir);

      const dto: CreateFirDto = {
        cerCode: '130205*',
        cerDescription: 'test',
        quantityKg: 10,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
        transporterId: 'transporter-001',
        destinationId: 'destination-001',
        scheduledDate: '2026-04-01',
      };

      await service.createFir(TENANT_ID, dto);

      expect(prisma.wasteFir.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            producerName: '',
          }),
        }),
      );
    });
  });

  // =========================================================================
  // FIR state machine comprehensive coverage
  // =========================================================================
  describe('FIR state machine transitions', () => {
    it('should allow VIDIMATED -> CANCELLED (valid transition)', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({
        ...mockFir,
        status: WasteFirStatus.VIDIMATED,
      });
      prisma.wasteFir.update.mockResolvedValue({
        ...mockFir,
        status: WasteFirStatus.CANCELLED,
      });

      const result = await service.updateStatus(TENANT_ID, FIR_ID, WasteFirStatus.CANCELLED);
      expect(result).toBeDefined();
    });

    it('should reject IN_TRANSIT -> DRAFT', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({
        ...mockFir,
        status: WasteFirStatus.IN_TRANSIT,
      });

      await expect(service.updateStatus(TENANT_ID, FIR_ID, WasteFirStatus.DRAFT)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject DELIVERED -> IN_TRANSIT', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({
        ...mockFir,
        status: WasteFirStatus.DELIVERED,
      });

      await expect(
        service.updateStatus(TENANT_ID, FIR_ID, WasteFirStatus.IN_TRANSIT),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // vidimateFir validation
  // =========================================================================
  describe('vidimateFir additional cases', () => {
    it('should reject vidimateFir from VIDIMATED status', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({
        ...mockFir,
        status: WasteFirStatus.VIDIMATED,
      });

      await expect(service.vidimateFir(TENANT_ID, FIR_ID, 'CODE123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject vidimateFir from CANCELLED status', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({
        ...mockFir,
        status: WasteFirStatus.CANCELLED,
      });

      await expect(service.vidimateFir(TENANT_ID, FIR_ID, 'CODE123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // FIR numbering with year boundaries
  // =========================================================================
  describe('FIR numbering edge cases', () => {
    it('should start from 0001 when no FIR exists for year', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue(null);
      prisma.tenant.findUnique.mockResolvedValue({ id: TENANT_ID, name: 'Officina' });
      prisma.wasteFir.create.mockResolvedValue(mockFir);

      const dto: CreateFirDto = {
        cerCode: '130205*',
        cerDescription: 'test',
        quantityKg: 10,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
        transporterId: 'transporter-001',
        destinationId: 'destination-001',
        scheduledDate: '2026-04-01',
      };

      await service.createFir(TENANT_ID, dto);

      const currentYear = new Date().getFullYear();
      expect(prisma.wasteFir.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firNumber: `FIR-${currentYear}-0001`,
          }),
        }),
      );
    });

    it('should pad FIR number to 4 digits', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({
        firNumber: `FIR-${new Date().getFullYear()}-0099`,
      });
      prisma.tenant.findUnique.mockResolvedValue({ id: TENANT_ID, name: 'Officina' });
      prisma.wasteFir.create.mockResolvedValue(mockFir);

      const dto: CreateFirDto = {
        cerCode: '130205*',
        cerDescription: 'test',
        quantityKg: 10,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
        transporterId: 'transporter-001',
        destinationId: 'destination-001',
        scheduledDate: '2026-04-01',
      };

      await service.createFir(TENANT_ID, dto);

      const currentYear = new Date().getFullYear();
      expect(prisma.wasteFir.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firNumber: `FIR-${currentYear}-0100`,
          }),
        }),
      );
    });
  });

  // =========================================================================
  // createFir tenant reference
  // =========================================================================
  describe('createFir tenant reference', () => {
    it('should include tenant name in FIR when tenant exists', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue(null);
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        name: 'Officina Rossi Srl',
      });
      prisma.wasteFir.create.mockResolvedValue(mockFir);

      const dto: CreateFirDto = {
        cerCode: '130205*',
        cerDescription: 'test',
        quantityKg: 10,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
        transporterId: 'transporter-001',
        destinationId: 'destination-001',
        scheduledDate: '2026-04-01',
      };

      await service.createFir(TENANT_ID, dto);

      expect(prisma.wasteFir.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            producerName: 'Officina Rossi Srl',
          }),
        }),
      );
    });

    it('should query tenant by tenantId', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue(null);
      prisma.tenant.findUnique.mockResolvedValue({ id: TENANT_ID, name: 'Test' });
      prisma.wasteFir.create.mockResolvedValue(mockFir);

      const dto: CreateFirDto = {
        cerCode: '130205*',
        cerDescription: 'test',
        quantityKg: 10,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
        transporterId: 'transporter-001',
        destinationId: 'destination-001',
        scheduledDate: '2026-04-01',
      };

      await service.createFir(TENANT_ID, dto);

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
      });
    });
  });

  // =========================================================================
  // updateStatus date setters
  // =========================================================================
  describe('updateStatus date handling', () => {
    it('should not set pickupDate for non-IN_TRANSIT transitions', async () => {
      prisma.wasteFir.findFirst.mockResolvedValue({
        ...mockFir,
        status: WasteFirStatus.VIDIMATED,
      });
      prisma.wasteFir.update.mockResolvedValue({
        ...mockFir,
        status: WasteFirStatus.CANCELLED,
      });

      await service.updateStatus(TENANT_ID, FIR_ID, WasteFirStatus.CANCELLED);

      expect(prisma.wasteFir.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            pickupDate: expect.anything(),
          }),
        }),
      );
    });
  });

  // =========================================================================
  // findAllFirs pagination specifics
  // =========================================================================
  describe('findAllFirs pagination', () => {
    it('should calculate correct skip for page 5', async () => {
      prisma.wasteFir.findMany.mockResolvedValue([]);
      prisma.wasteFir.count.mockResolvedValue(0);

      await service.findAllFirs(TENANT_ID, { page: 5, limit: 10 });

      expect(prisma.wasteFir.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (5-1) * 10
        }),
      );
    });

    it('should calculate pages correctly with remainder', async () => {
      prisma.wasteFir.findMany.mockResolvedValue([]);
      prisma.wasteFir.count.mockResolvedValue(45);

      const result = await service.findAllFirs(TENANT_ID, { page: 1, limit: 10 });

      expect(result.pages).toBe(5); // Math.ceil(45 / 10)
    });
  });
});
