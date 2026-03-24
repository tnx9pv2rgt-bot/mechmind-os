import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { RentriService } from './rentri.service';
import { PrismaService } from '@common/services/prisma.service';
import { WasteEntryType, WasteHazardClass, WastePhysicalState } from '@prisma/client';
import { CreateWasteEntryDto } from '../dto/waste-entry.dto';

// ---------------------------------------------------------------------------
// Mock delegates
// ---------------------------------------------------------------------------

interface MockWasteEntryDelegate {
  findMany: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  count: jest.Mock;
}

interface MockWasteTransporterDelegate {
  findMany: jest.Mock;
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
}

interface MockWasteDestinationDelegate {
  findMany: jest.Mock;
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
}

interface MockWasteFirDelegate {
  findMany: jest.Mock;
  count: jest.Mock;
}

interface MockPrisma {
  wasteEntry: MockWasteEntryDelegate;
  wasteTransporter: MockWasteTransporterDelegate;
  wasteDestination: MockWasteDestinationDelegate;
  wasteFir: MockWasteFirDelegate;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const ENTRY_ID = 'entry-001';
const TRANSPORTER_ID = 'transporter-001';

const mockEntry = {
  id: ENTRY_ID,
  tenantId: TENANT_ID,
  entryNumber: 'RC-2026-0001',
  entryType: WasteEntryType.CARICO,
  entryDate: new Date('2026-03-24'),
  cerCode: '130205*',
  cerDescription: 'Oli minerali per motori',
  hazardClass: WasteHazardClass.PERICOLOSO,
  physicalState: WastePhysicalState.LIQUIDO,
  quantityKg: 25.5,
  isOwnProduction: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTransporter = {
  id: TRANSPORTER_ID,
  tenantId: TENANT_ID,
  name: 'Eco Trasporti Srl',
  fiscalCode: '01234567890',
  isActive: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RentriService', () => {
  let service: RentriService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    const mockPrisma: MockPrisma = {
      wasteEntry: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      wasteTransporter: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      wasteDestination: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      wasteFir: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RentriService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<RentriService>(RentriService);
    prisma = module.get(PrismaService) as unknown as MockPrisma;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============== ENTRIES ==============

  describe('createEntry', () => {
    it('should create an entry with correct tenantId and generated entryNumber', async () => {
      prisma.wasteEntry.findFirst.mockResolvedValue(null); // no previous entry
      prisma.wasteEntry.create.mockResolvedValue({ ...mockEntry });

      const dto: CreateWasteEntryDto = {
        cerCode: '130205*',
        cerDescription: 'Oli minerali per motori',
        entryType: WasteEntryType.CARICO,
        entryDate: '2026-03-24',
        quantityKg: 25.5,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
      };

      const result = await service.createEntry(TENANT_ID, dto, 'user-001');

      expect(prisma.wasteEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            entryNumber: expect.stringMatching(/^RC-\d{4}-\d{4}$/),
            cerCode: '130205*',
          }),
        }),
      );
      expect(result).toBeDefined();
    });
  });

  describe('findAllEntries', () => {
    it('should return paginated entries with filters', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([mockEntry]);
      prisma.wasteEntry.count.mockResolvedValue(1);

      const result = await service.findAllEntries(TENANT_ID, {
        page: 1,
        limit: 20,
        cerCode: '130205*',
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(prisma.wasteEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            cerCode: '130205*',
          }),
        }),
      );
    });
  });

  // ============== CER CODES ==============

  describe('getCerCodes', () => {
    it('should return the full CER catalog', () => {
      const codes = service.getCerCodes();
      expect(codes.length).toBeGreaterThan(0);
      expect(codes[0]).toHaveProperty('code');
      expect(codes[0]).toHaveProperty('description');
      expect(codes[0]).toHaveProperty('hazardClass');
    });
  });

  describe('searchCerCodes', () => {
    it('should filter CER codes by query text', () => {
      const results = service.searchCerCodes('olio motore');
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every(
          r =>
            r.commonName.toLowerCase().includes('olio') ||
            r.description.toLowerCase().includes('olio'),
        ),
      ).toBe(true);
    });

    it('should filter CER codes by code', () => {
      const results = service.searchCerCodes('160103');
      expect(results).toHaveLength(1);
      expect(results[0].commonName).toBe('Pneumatici usati');
    });

    it('should return empty array for non-matching query', () => {
      const results = service.searchCerCodes('xyznonexistent');
      expect(results).toHaveLength(0);
    });
  });

  // ============== TRANSPORTERS ==============

  describe('createTransporter', () => {
    it('should throw ConflictException for duplicate fiscalCode', async () => {
      prisma.wasteTransporter.findUnique.mockResolvedValue(mockTransporter);

      await expect(
        service.createTransporter(TENANT_ID, {
          name: 'Eco Trasporti Srl',
          fiscalCode: '01234567890',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create transporter when fiscalCode is unique', async () => {
      prisma.wasteTransporter.findUnique.mockResolvedValue(null);
      prisma.wasteTransporter.create.mockResolvedValue(mockTransporter);

      const result = await service.createTransporter(TENANT_ID, {
        name: 'Eco Trasporti Srl',
        fiscalCode: '01234567890',
      });

      expect(prisma.wasteTransporter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            fiscalCode: '01234567890',
          }),
        }),
      );
      expect(result).toEqual(mockTransporter);
    });
  });

  // ============== DASHBOARD ==============

  describe('getDashboard', () => {
    it('should return aggregated dashboard data', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([
        { ...mockEntry, quantityKg: 10, entryDate: new Date('2026-01-15') },
        {
          ...mockEntry,
          quantityKg: 20,
          cerCode: '160103',
          cerDescription: 'Pneumatici',
          entryDate: new Date('2026-02-10'),
        },
      ]);
      prisma.wasteEntry.count.mockResolvedValue(0); // no storage alerts

      const dashboard = await service.getDashboard(TENANT_ID);

      expect(dashboard.totalEntriesThisYear).toBe(2);
      expect(dashboard.totalKgThisYear).toBe(30);
      expect(dashboard.byCer.length).toBe(2);
      expect(dashboard.monthlyTrend.length).toBe(2);
    });
  });

  // ============== ALERTS ==============

  describe('getAlerts', () => {
    it('should return storage age warnings', async () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      prisma.wasteEntry.findMany.mockResolvedValue([
        { id: 'old-entry', cerCode: '130205*', storedSince: twoYearsAgo },
      ]);
      prisma.wasteFir.findMany.mockResolvedValue([]);

      const alerts = await service.getAlerts(TENANT_ID);

      const storageAlert = alerts.find(a => a.type === 'STORAGE_OVER_YEAR');
      expect(storageAlert).toBeDefined();
      expect(storageAlert?.severity).toBe('error');
    });
  });
});
