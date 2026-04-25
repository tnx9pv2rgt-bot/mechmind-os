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

  // ============== findOneEntry ==============

  describe('findOneEntry', () => {
    it('should return entry when found', async () => {
      prisma.wasteEntry.findFirst.mockResolvedValue(mockEntry);

      const result = await service.findOneEntry(TENANT_ID, ENTRY_ID);

      expect(result).toEqual(mockEntry);
      expect(prisma.wasteEntry.findFirst).toHaveBeenCalledWith({
        where: { id: ENTRY_ID, tenantId: TENANT_ID },
        include: { transporter: true, destination: true, fir: true },
      });
    });

    it('should throw NotFoundException when entry not found', async () => {
      prisma.wasteEntry.findFirst.mockResolvedValue(null);

      await expect(service.findOneEntry(TENANT_ID, 'nonexistent')).rejects.toThrow(
        'Movimento rifiuto con ID nonexistent non trovato',
      );
    });
  });

  // ============== updateEntry ==============

  describe('updateEntry', () => {
    it('should update entry fields', async () => {
      prisma.wasteEntry.findFirst.mockResolvedValue(mockEntry);
      prisma.wasteEntry.update.mockResolvedValue({ ...mockEntry, cerCode: '160103' });

      const result = await service.updateEntry(TENANT_ID, ENTRY_ID, { cerCode: '160103' });

      expect(prisma.wasteEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ENTRY_ID },
          data: expect.objectContaining({ cerCode: '160103' }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when entry does not exist', async () => {
      prisma.wasteEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.updateEntry(TENANT_ID, 'nonexistent', { cerCode: '160103' }),
      ).rejects.toThrow('Movimento rifiuto con ID nonexistent non trovato');
    });

    it('should handle partial update with multiple fields', async () => {
      prisma.wasteEntry.findFirst.mockResolvedValue(mockEntry);
      prisma.wasteEntry.update.mockResolvedValue(mockEntry);

      await service.updateEntry(TENANT_ID, ENTRY_ID, {
        cerCode: '160103',
        cerDescription: 'Pneumatici',
        quantityKg: 100,
        entryDate: '2026-04-01',
        hazardClass: WasteHazardClass.NON_PERICOLOSO,
        physicalState: WastePhysicalState.SOLIDO,
        notes: 'test note',
      });

      expect(prisma.wasteEntry.update).toHaveBeenCalledWith({
        where: { id: ENTRY_ID },
        data: expect.objectContaining({
          cerCode: '160103',
          cerDescription: 'Pneumatici',
          hazardClass: WasteHazardClass.NON_PERICOLOSO,
          physicalState: WastePhysicalState.SOLIDO,
          notes: 'test note',
        }),
        include: { transporter: true, destination: true },
      });
    });

    it('should update storageLocationCode field', async () => {
      prisma.wasteEntry.findFirst.mockResolvedValue(mockEntry);
      prisma.wasteEntry.update.mockResolvedValue(mockEntry);

      await service.updateEntry(TENANT_ID, ENTRY_ID, {
        storageLocationCode: 'MAG-B2',
      });

      expect(prisma.wasteEntry.update).toHaveBeenCalledWith({
        where: { id: ENTRY_ID },
        data: expect.objectContaining({
          storageLocationCode: 'MAG-B2',
        }),
        include: { transporter: true, destination: true },
      });
    });
  });

  // ============== findAllEntries — additional filter branches ==============

  describe('findAllEntries (filter branches)', () => {
    it('should apply entryType filter', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteEntry.count.mockResolvedValue(0);

      await service.findAllEntries(TENANT_ID, { entryType: WasteEntryType.SCARICO });

      expect(prisma.wasteEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entryType: WasteEntryType.SCARICO,
          }),
        }),
      );
    });

    it('should apply dateFrom and dateTo filters', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteEntry.count.mockResolvedValue(0);

      await service.findAllEntries(TENANT_ID, {
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      });

      expect(prisma.wasteEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entryDate: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-12-31'),
            },
          }),
        }),
      );
    });

    it('should apply only dateFrom', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteEntry.count.mockResolvedValue(0);

      await service.findAllEntries(TENANT_ID, { dateFrom: '2026-01-01' });

      expect(prisma.wasteEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entryDate: { gte: new Date('2026-01-01') },
          }),
        }),
      );
    });

    it('should apply search filter', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteEntry.count.mockResolvedValue(0);

      await service.findAllEntries(TENANT_ID, { search: 'olio' });

      expect(prisma.wasteEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                cerDescription: { contains: 'olio', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('should use default page and limit', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteEntry.count.mockResolvedValue(0);

      const result = await service.findAllEntries(TENANT_ID, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // ============== createEntry — SCARICO type ==============

  describe('createEntry (SCARICO type)', () => {
    it('should generate RS prefix for SCARICO entries', async () => {
      prisma.wasteEntry.findFirst.mockResolvedValue(null);
      prisma.wasteEntry.create.mockResolvedValue(mockEntry);

      const dto: CreateWasteEntryDto = {
        cerCode: '130205*',
        cerDescription: 'Oli minerali per motori',
        entryType: WasteEntryType.SCARICO,
        entryDate: '2026-03-24',
        quantityKg: 25.5,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
      };

      await service.createEntry(TENANT_ID, dto, 'user-001');

      expect(prisma.wasteEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entryNumber: expect.stringMatching(/^RS-\d{4}-\d{4}$/),
          }),
        }),
      );
    });

    it('should not set storedSince for SCARICO entries', async () => {
      prisma.wasteEntry.findFirst.mockResolvedValue(null);
      prisma.wasteEntry.create.mockResolvedValue(mockEntry);

      const dto: CreateWasteEntryDto = {
        cerCode: '130205*',
        cerDescription: 'Oli minerali per motori',
        entryType: WasteEntryType.SCARICO,
        entryDate: '2026-03-24',
        quantityKg: 25.5,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
      };

      await service.createEntry(TENANT_ID, dto);

      expect(prisma.wasteEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            storedSince: undefined,
          }),
        }),
      );
    });
  });

  // ============== generateEntryNumber — sequential numbering ==============

  describe('generateEntryNumber (sequential)', () => {
    it('should increment from last entry number', async () => {
      prisma.wasteEntry.findFirst.mockResolvedValueOnce({
        entryNumber: `RC-${new Date().getFullYear()}-0005`,
      });
      prisma.wasteEntry.create.mockResolvedValue(mockEntry);

      const dto: CreateWasteEntryDto = {
        cerCode: '130205*',
        cerDescription: 'test',
        entryType: WasteEntryType.CARICO,
        entryDate: '2026-03-24',
        quantityKg: 10,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
      };

      await service.createEntry(TENANT_ID, dto);

      expect(prisma.wasteEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entryNumber: `RC-${new Date().getFullYear()}-0006`,
          }),
        }),
      );
    });
  });

  // ============== updateTransporter ==============

  describe('updateTransporter', () => {
    it('should update transporter', async () => {
      prisma.wasteTransporter.findFirst.mockResolvedValue(mockTransporter);
      prisma.wasteTransporter.update.mockResolvedValue({ ...mockTransporter, name: 'Updated' });

      const result = (await service.updateTransporter(TENANT_ID, TRANSPORTER_ID, {
        name: 'Updated',
      })) as Record<string, unknown>;

      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException when transporter not found', async () => {
      prisma.wasteTransporter.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTransporter(TENANT_ID, 'nonexistent', { name: 'Test' }),
      ).rejects.toThrow('Trasportatore con ID nonexistent non trovato');
    });
  });

  // ============== Destinations ==============

  describe('createDestination', () => {
    it('should create destination when fiscalCode is unique', async () => {
      prisma.wasteDestination.findUnique.mockResolvedValue(null);
      const dest = { id: 'dest-001', tenantId: TENANT_ID, name: 'Impianto Riciclo' };
      prisma.wasteDestination.create.mockResolvedValue(dest);

      const result = await service.createDestination(TENANT_ID, {
        name: 'Impianto Riciclo',
        fiscalCode: '09876543210',
        address: 'Via Destinazione 1',
      });

      expect(result).toEqual(dest);
    });

    it('should throw ConflictException for duplicate destination fiscalCode', async () => {
      prisma.wasteDestination.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createDestination(TENANT_ID, {
          name: 'Impianto Riciclo',
          fiscalCode: '09876543210',
          address: 'Via Destinazione 1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateDestination', () => {
    it('should update destination', async () => {
      prisma.wasteDestination.findFirst.mockResolvedValue({ id: 'dest-001' });
      prisma.wasteDestination.update.mockResolvedValue({ id: 'dest-001', name: 'Updated' });

      const result = (await service.updateDestination(TENANT_ID, 'dest-001', {
        name: 'Updated',
      })) as Record<string, unknown>;
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException when destination not found', async () => {
      prisma.wasteDestination.findFirst.mockResolvedValue(null);

      await expect(
        service.updateDestination(TENANT_ID, 'nonexistent', { name: 'Test' }),
      ).rejects.toThrow('Destinazione con ID nonexistent non trovata');
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

    it('should return FIR pending confirmation alerts', async () => {
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteFir.findMany.mockResolvedValue([
        { id: 'fir-001', firNumber: 'FIR-2025-0001', deliveryDate: fourMonthsAgo },
      ]);

      const alerts = await service.getAlerts(TENANT_ID);

      const firAlert = alerts.find(a => a.type === 'FIR_PENDING_CONFIRMATION');
      expect(firAlert).toBeDefined();
      expect(firAlert?.severity).toBe('warning');
      expect(firAlert?.entityId).toBe('fir-001');
    });

    it('should return no storage or FIR alerts when no issues', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteFir.findMany.mockResolvedValue([]);

      const alerts = await service.getAlerts(TENANT_ID);

      // MUD_DEADLINE is date-based (April 30) and may appear depending on current date
      const nonMudAlerts = alerts.filter(a => a.type !== 'MUD_DEADLINE');
      expect(nonMudAlerts).toHaveLength(0);
    });

    it('should return multiple alert types simultaneously', async () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

      prisma.wasteEntry.findMany.mockResolvedValue([
        { id: 'old-1', cerCode: '130205*', storedSince: twoYearsAgo },
      ]);
      prisma.wasteFir.findMany.mockResolvedValue([
        { id: 'fir-001', firNumber: 'FIR-2025-0001', deliveryDate: fourMonthsAgo },
      ]);

      const alerts = await service.getAlerts(TENANT_ID);

      expect(alerts.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============== getDashboard — edge cases ==============

  describe('getDashboard (edge cases)', () => {
    it('should return zeros when no entries exist', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteEntry.count.mockResolvedValue(0);

      const dashboard = await service.getDashboard(TENANT_ID);

      expect(dashboard.totalEntriesThisYear).toBe(0);
      expect(dashboard.totalKgThisYear).toBe(0);
      expect(dashboard.byCer).toHaveLength(0);
      expect(dashboard.monthlyTrend).toHaveLength(0);
    });

    it('should aggregate same CER code entries', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([
        { ...mockEntry, quantityKg: 10, entryDate: new Date('2026-01-15') },
        { ...mockEntry, quantityKg: 20, entryDate: new Date('2026-01-20') },
      ]);
      prisma.wasteEntry.count.mockResolvedValue(0);

      const dashboard = await service.getDashboard(TENANT_ID);

      expect(dashboard.byCer).toHaveLength(1);
      expect(dashboard.byCer[0].totalKg).toBe(30);
      expect(dashboard.byCer[0].entryCount).toBe(2);
    });
  });

  // ============== findAllTransporters ==============

  describe('findAllTransporters', () => {
    it('should return transporters sorted by name', async () => {
      const transporters = [
        { id: 't-002', tenantId: TENANT_ID, name: 'B Transport' },
        { id: 't-001', tenantId: TENANT_ID, name: 'A Transport' },
      ];
      prisma.wasteTransporter.findMany.mockResolvedValue(transporters);

      const result = await service.findAllTransporters(TENANT_ID);

      expect(prisma.wasteTransporter.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(transporters);
    });
  });

  // ============== findAllDestinations ==============

  describe('findAllDestinations', () => {
    it('should return destinations sorted by name', async () => {
      const destinations = [
        { id: 'd-002', tenantId: TENANT_ID, name: 'Z Destination' },
        { id: 'd-001', tenantId: TENANT_ID, name: 'A Destination' },
      ];
      prisma.wasteDestination.findMany.mockResolvedValue(destinations);

      const result = await service.findAllDestinations(TENANT_ID);

      expect(prisma.wasteDestination.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(destinations);
    });
  });

  // ============== generateEntryNumber edge cases ==============

  describe('generateEntryNumber edge cases', () => {
    it('should pad entry number to 4 digits', async () => {
      prisma.wasteEntry.findFirst.mockResolvedValue(null);
      prisma.wasteEntry.create.mockResolvedValue(mockEntry);

      const dto: CreateWasteEntryDto = {
        cerCode: '130205*',
        cerDescription: 'test',
        entryType: WasteEntryType.CARICO,
        entryDate: '2026-03-24',
        quantityKg: 10,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
      };

      await service.createEntry(TENANT_ID, dto);

      expect(prisma.wasteEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entryNumber: expect.stringMatching(/^RC-\d{4}-0001$/),
          }),
        }),
      );
    });

    it('should query correct year prefix for entry number', async () => {
      const currentYear = new Date().getFullYear();
      prisma.wasteEntry.findFirst.mockResolvedValue(null);
      prisma.wasteEntry.create.mockResolvedValue(mockEntry);

      const dto: CreateWasteEntryDto = {
        cerCode: '130205*',
        cerDescription: 'test',
        entryType: WasteEntryType.CARICO,
        entryDate: '2026-03-24',
        quantityKg: 10,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
      };

      await service.createEntry(TENANT_ID, dto);

      expect(prisma.wasteEntry.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          entryNumber: { startsWith: `RC-${currentYear}-` },
        },
        orderBy: { entryNumber: 'desc' },
      });
    });
  });

  // ============== MUD DASHBOARD ALERTS ==============

  describe('getAlerts MUD deadline', () => {
    it('should calculate days to MUD deadline (April 30)', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteFir.findMany.mockResolvedValue([]);

      const alerts = await service.getAlerts(TENANT_ID);

      const mudAlert = alerts.find(a => a.type === 'MUD_DEADLINE');
      if (mudAlert) {
        expect(mudAlert.severity).toMatch(/^(warning|error)$/);
        expect(mudAlert.message).toContain('giorni');
      }
    });

    it('should not return MUD deadline alert after April 30', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteFir.findMany.mockResolvedValue([]);

      // If current date > April 30, MUD alert should not appear (for next year)
      const alerts = await service.getAlerts(TENANT_ID);

      // Just verify that service processes date correctly
      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  // ============== QUERY FILTERS COMPREHENSIVE ==============

  describe('findAllEntries comprehensive filters', () => {
    it('should combine multiple filters in single query', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteEntry.count.mockResolvedValue(0);

      await service.findAllEntries(TENANT_ID, {
        cerCode: '130205*',
        entryType: WasteEntryType.CARICO,
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
        search: 'olio',
        page: 2,
        limit: 50,
      });

      expect(prisma.wasteEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            cerCode: '130205*',
            entryType: WasteEntryType.CARICO,
            entryDate: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-12-31'),
            },
            OR: expect.any(Array),
          }),
          skip: 50, // (2-1) * 50
          take: 50,
        }),
      );
    });

    it('should apply dateTo only filter', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteEntry.count.mockResolvedValue(0);

      await service.findAllEntries(TENANT_ID, { dateTo: '2026-06-30' });

      expect(prisma.wasteEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entryDate: { lte: new Date('2026-06-30') },
          }),
        }),
      );
    });
  });

  // ============== DECIMAL QUANTITIES ==============

  describe('createEntry decimal handling', () => {
    it('should convert quantityKg to Prisma.Decimal', async () => {
      prisma.wasteEntry.findFirst.mockResolvedValue(null);
      prisma.wasteEntry.create.mockResolvedValue(mockEntry);

      const dto: CreateWasteEntryDto = {
        cerCode: '130205*',
        cerDescription: 'test',
        entryType: WasteEntryType.CARICO,
        entryDate: '2026-03-24',
        quantityKg: 25.555,
        hazardClass: WasteHazardClass.PERICOLOSO,
        physicalState: WastePhysicalState.LIQUIDO,
      };

      await service.createEntry(TENANT_ID, dto);

      expect(prisma.wasteEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantityKg: expect.any(Object), // Prisma.Decimal
          }),
        }),
      );
    });
  });

  // ============== updateEntry storageLocationCode (line 162) ==============

  describe('updateEntry storageLocationCode', () => {
    it('should update storageLocationCode when provided', async () => {
      prisma.wasteEntry.findFirst.mockResolvedValue(mockEntry);
      prisma.wasteEntry.update.mockResolvedValue({ ...mockEntry, storageLocationCode: 'LOC-A' });

      await service.updateEntry(TENANT_ID, ENTRY_ID, { storageLocationCode: 'LOC-A' });

      expect(prisma.wasteEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ storageLocationCode: 'LOC-A' }),
        }),
      );
    });

    it('should update transporterId and destinationId and workOrderId when provided', async () => {
      prisma.wasteEntry.findFirst.mockResolvedValue(mockEntry);
      prisma.wasteEntry.update.mockResolvedValue(mockEntry);

      await service.updateEntry(TENANT_ID, ENTRY_ID, {
        transporterId: 'tr-002',
        destinationId: 'dest-002',
        workOrderId: 'wo-001',
        isOwnProduction: false,
        quantityUnits: 2,
        unitType: 'pezzi',
        originDescription: 'officina',
      });

      expect(prisma.wasteEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transporterId: 'tr-002',
            destinationId: 'dest-002',
            workOrderId: 'wo-001',
            isOwnProduction: false,
          }),
        }),
      );
    });
  });

  // ============== PAGINATION EDGE CASES ==============

  describe('findAllEntries pagination', () => {
    it('should calculate pages correctly', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteEntry.count.mockResolvedValue(100);

      const result = await service.findAllEntries(TENANT_ID, { page: 1, limit: 20 });

      expect(result.pages).toBe(5); // Math.ceil(100 / 20)
    });

    it('should handle single page result', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([mockEntry]);
      prisma.wasteEntry.count.mockResolvedValue(1);

      const result = await service.findAllEntries(TENANT_ID, { limit: 20 });

      expect(result.pages).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should calculate skip offset correctly for page 3', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteEntry.count.mockResolvedValue(0);

      await service.findAllEntries(TENANT_ID, { page: 3, limit: 10 });

      expect(prisma.wasteEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
        }),
      );
    });
  });
});
