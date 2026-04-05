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
});
