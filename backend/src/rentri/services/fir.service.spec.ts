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
      providers: [
        FirService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
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
      prisma.wasteFir.findFirst.mockResolvedValue({ ...mockFir, status: WasteFirStatus.IN_TRANSIT });

      await expect(
        service.vidimateFir(TENANT_ID, FIR_ID, 'VF2026-ABC123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
