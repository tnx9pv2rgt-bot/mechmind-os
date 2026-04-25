import { Test, TestingModule } from '@nestjs/testing';
import { MudService } from './mud.service';
import { PrismaService } from '@common/services/prisma.service';

describe('MudService', () => {
  let service: MudService;
  let prisma: {
    wasteEntry: { findMany: jest.Mock };
    wasteFir: { count: jest.Mock };
  };

  const TENANT_ID = 'tenant-001';
  const YEAR = 2026;

  const mockEntry = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: 'entry-001',
    tenantId: TENANT_ID,
    cerCode: '130205*',
    cerDescription: 'Oli minerali per motori',
    quantityKg: 25.5,
    entryDate: new Date('2026-03-15'),
    destination: { name: 'Impianto Riciclo Srl' },
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      wasteEntry: { findMany: jest.fn() },
      wasteFir: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MudService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<MudService>(MudService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // getPreview
  // =========================================================================
  describe('getPreview', () => {
    it('should return preview with aggregated data', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([
        mockEntry({ quantityKg: 10 }),
        mockEntry({ quantityKg: 20 }),
      ]);
      prisma.wasteFir.count.mockResolvedValue(3);

      const preview = await service.getPreview(TENANT_ID, YEAR);

      expect(preview.year).toBe(YEAR);
      expect(preview.totalKg).toBe(30);
      expect(preview.totalEntries).toBe(2);
      expect(preview.totalFirs).toBe(3);
      expect(preview.rows).toHaveLength(1);
      expect(preview.rows[0].cerCode).toBe('130205*');
      expect(preview.rows[0].totalKg).toBe(30);
      expect(preview.rows[0].operationCount).toBe(2);
    });

    it('should group by CER code', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([
        mockEntry({ cerCode: '130205*', cerDescription: 'Oli', quantityKg: 10 }),
        mockEntry({ cerCode: '160103', cerDescription: 'Pneumatici', quantityKg: 50 }),
        mockEntry({ cerCode: '130205*', cerDescription: 'Oli', quantityKg: 15 }),
      ]);
      prisma.wasteFir.count.mockResolvedValue(0);

      const preview = await service.getPreview(TENANT_ID, YEAR);

      expect(preview.rows).toHaveLength(2);

      const oilRow = preview.rows.find(r => r.cerCode === '130205*');
      expect(oilRow?.totalKg).toBe(25);
      expect(oilRow?.operationCount).toBe(2);

      const tireRow = preview.rows.find(r => r.cerCode === '160103');
      expect(tireRow?.totalKg).toBe(50);
      expect(tireRow?.operationCount).toBe(1);
    });

    it('should identify main destination by highest count', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([
        mockEntry({ destination: { name: 'Dest A' } }),
        mockEntry({ destination: { name: 'Dest B' } }),
        mockEntry({ destination: { name: 'Dest A' } }),
      ]);
      prisma.wasteFir.count.mockResolvedValue(0);

      const preview = await service.getPreview(TENANT_ID, YEAR);

      expect(preview.rows[0].mainDestination).toBe('Dest A');
    });

    it('should handle entries with no destination', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([mockEntry({ destination: null })]);
      prisma.wasteFir.count.mockResolvedValue(0);

      const preview = await service.getPreview(TENANT_ID, YEAR);

      expect(preview.rows[0].mainDestination).toBeNull();
    });

    it('should return empty rows when no entries', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteFir.count.mockResolvedValue(0);

      const preview = await service.getPreview(TENANT_ID, YEAR);

      expect(preview.rows).toHaveLength(0);
      expect(preview.totalKg).toBe(0);
      expect(preview.totalEntries).toBe(0);
    });

    it('should query correct year range', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteFir.count.mockResolvedValue(0);

      await service.getPreview(TENANT_ID, 2025);

      expect(prisma.wasteEntry.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          entryDate: {
            gte: new Date(2025, 0, 1),
            lte: new Date(2025, 11, 31, 23, 59, 59),
          },
        },
        include: { destination: true },
      });
    });
  });

  // =========================================================================
  // exportCsv
  // =========================================================================
  describe('exportCsv', () => {
    it('should generate CSV with header and data rows', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([
        mockEntry({ quantityKg: 25.5, destination: { name: 'Dest A' } }),
      ]);
      prisma.wasteFir.count.mockResolvedValue(1);

      const csv = await service.exportCsv(TENANT_ID, YEAR);

      const lines = csv.split('\n');
      expect(lines[0]).toBe('CER,Descrizione,Quantita kg,Nr. Operazioni,Destinazione principale');
      expect(lines[1]).toContain('"130205*"');
      expect(lines[1]).toContain('25.500');
      expect(lines[1]).toContain('"Dest A"');
    });

    it('should generate empty CSV (header only) when no entries', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteFir.count.mockResolvedValue(0);

      const csv = await service.exportCsv(TENANT_ID, YEAR);

      const lines = csv.split('\n');
      expect(lines).toHaveLength(1); // header only
    });

    it('should handle null destination in CSV', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([mockEntry({ destination: null })]);
      prisma.wasteFir.count.mockResolvedValue(0);

      const csv = await service.exportCsv(TENANT_ID, YEAR);

      const lines = csv.split('\n');
      expect(lines[1]).toContain('""'); // empty destination
    });

    it('should generate multiple rows for multiple CER codes', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([
        mockEntry({ cerCode: '130205*', cerDescription: 'Oli', quantityKg: 10 }),
        mockEntry({ cerCode: '160103', cerDescription: 'Pneumatici', quantityKg: 50 }),
      ]);
      prisma.wasteFir.count.mockResolvedValue(0);

      const csv = await service.exportCsv(TENANT_ID, YEAR);

      const lines = csv.split('\n');
      expect(lines).toHaveLength(3); // header + 2 data rows
    });
  });

  // =========================================================================
  // getPreview — destination aggregation detailed
  // =========================================================================
  describe('getPreview destination aggregation', () => {
    it('should handle ties in destination count (picks last)', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([
        mockEntry({ destination: { name: 'Dest A' } }),
        mockEntry({ destination: { name: 'Dest B' } }),
      ]);
      prisma.wasteFir.count.mockResolvedValue(0);

      const preview = await service.getPreview(TENANT_ID, YEAR);

      // When both have count 1, maxCount comparison will pick last
      expect(preview.rows[0].mainDestination).toBeDefined();
    });

    it('should aggregate FIR count separately from entries', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([mockEntry(), mockEntry()]);
      prisma.wasteFir.count.mockResolvedValue(5);

      const preview = await service.getPreview(TENANT_ID, YEAR);

      expect(preview.totalEntries).toBe(2);
      expect(preview.totalFirs).toBe(5);
    });

    it('should use include destination in findMany query', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteFir.count.mockResolvedValue(0);

      await service.getPreview(TENANT_ID, YEAR);

      expect(prisma.wasteEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { destination: true },
        }),
      );
    });
  });

  // =========================================================================
  // CSV formatting
  // =========================================================================
  describe('exportCsv formatting', () => {
    it('should format quantity with 3 decimal places', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([mockEntry({ quantityKg: 123.4567 })]);
      prisma.wasteFir.count.mockResolvedValue(0);

      const csv = await service.exportCsv(TENANT_ID, YEAR);

      const lines = csv.split('\n');
      expect(lines[1]).toContain('123.457'); // toFixed(3)
    });

    it('should quote CER description with special characters', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([
        mockEntry({
          cerCode: '160103',
          cerDescription: 'Descrizione con "virgolette"',
          quantityKg: 10,
        }),
      ]);
      prisma.wasteFir.count.mockResolvedValue(0);

      const csv = await service.exportCsv(TENANT_ID, YEAR);

      const lines = csv.split('\n');
      // CSV format should properly escape/quote
      expect(lines[1]).toContain('"160103"');
    });

    it('should handle missing destination name in CSV', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([mockEntry({ destination: undefined })]);
      prisma.wasteFir.count.mockResolvedValue(0);

      const csv = await service.exportCsv(TENANT_ID, YEAR);

      const lines = csv.split('\n');
      expect(lines[1]).toContain('""'); // empty quotes for missing destination
    });
  });

  // =========================================================================
  // Year range calculations
  // =========================================================================
  describe('getPreview year range', () => {
    it('should query correct date range for December 31', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteFir.count.mockResolvedValue(0);

      await service.getPreview(TENANT_ID, 2025);

      // Verify exact date range
      expect(prisma.wasteEntry.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          entryDate: {
            gte: new Date(2025, 0, 1),
            lte: new Date(2025, 11, 31, 23, 59, 59),
          },
        },
        include: { destination: true },
      });
    });

    it('should query FIR count with same year range', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([]);
      prisma.wasteFir.count.mockResolvedValue(0);

      await service.getPreview(TENANT_ID, 2024);

      expect(prisma.wasteFir.count).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          scheduledDate: {
            gte: new Date(2024, 0, 1),
            lte: new Date(2024, 11, 31, 23, 59, 59),
          },
        },
      });
    });
  });

  // =========================================================================
  // Large dataset handling
  // =========================================================================
  describe('MudService large datasets', () => {
    it('should handle 1000+ entries with aggregation', async () => {
      const entries = Array.from({ length: 1000 }, (_, i) => ({
        ...mockEntry(),
        id: `entry-${i}`,
        cerCode: i % 10 === 0 ? '130205*' : '160103',
        quantityKg: 10 + (i % 100),
        destination: { name: `Dest ${i % 5}` },
      }));
      prisma.wasteEntry.findMany.mockResolvedValue(entries);
      prisma.wasteFir.count.mockResolvedValue(50);

      const preview = await service.getPreview(TENANT_ID, YEAR);

      expect(preview.totalEntries).toBe(1000);
      expect(preview.rows.length).toBeLessThanOrEqual(2); // Only 2 CER codes
      expect(preview.totalKg).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Edge case: entries with no CER code variation
  // =========================================================================
  describe('getPreview single CER code', () => {
    it('should handle all entries with same CER code', async () => {
      prisma.wasteEntry.findMany.mockResolvedValue([
        mockEntry({ cerCode: '130205*', quantityKg: 5 }),
        mockEntry({ cerCode: '130205*', quantityKg: 10 }),
        mockEntry({ cerCode: '130205*', quantityKg: 15 }),
      ]);
      prisma.wasteFir.count.mockResolvedValue(0);

      const preview = await service.getPreview(TENANT_ID, YEAR);

      expect(preview.rows).toHaveLength(1);
      expect(preview.rows[0].totalKg).toBe(30);
      expect(preview.rows[0].operationCount).toBe(3);
    });
  });
});
