import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CannedJobService } from './canned-job.service';
import { PrismaService } from '../common/services/prisma.service';

const mockPrisma = {
  cannedJob: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  cannedJobLine: {
    deleteMany: jest.fn(),
  },
  estimate: {
    findFirst: jest.fn(),
  },
  estimateLine: {
    create: jest.fn(),
  },
  workOrder: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('CannedJobService', () => {
  let service: CannedJobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CannedJobService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<CannedJobService>(CannedJobService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a canned job with lines', async () => {
      const expected = {
        id: 'cj-1',
        tenantId: 't1',
        name: 'Tagliando 30k',
        lines: [{ id: 'l1', type: 'LABOR', description: 'Cambio olio' }],
      };
      mockPrisma.cannedJob.create.mockResolvedValue(expected);

      const result = await service.create('t1', {
        name: 'Tagliando 30k',
        description: 'Tagliando completo',
        category: 'Manutenzione',
        lines: [
          {
            type: 'LABOR',
            description: 'Cambio olio',
            quantity: 1,
            unitPrice: 2500,
            laborHours: 0.5,
          },
        ],
      });

      expect(result).toEqual(expected);
      expect(mockPrisma.cannedJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: 't1', name: 'Tagliando 30k' }),
        }),
      );
    });

    it('should create a canned job without lines', async () => {
      const expected = { id: 'cj-2', tenantId: 't1', name: 'Test', lines: [] };
      mockPrisma.cannedJob.create.mockResolvedValue(expected);

      const result = await service.create('t1', { name: 'Test' });
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('should return all canned jobs for tenant', async () => {
      const jobs = [{ id: 'cj-1', lines: [] }];
      mockPrisma.cannedJob.findMany.mockResolvedValue(jobs);
      mockPrisma.cannedJob.count.mockResolvedValue(1);

      const result = await service.findAll('t1', {});
      expect(result).toEqual({ data: jobs, total: 1, page: 1, limit: 20, pages: 1 });
      expect(mockPrisma.cannedJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't1' },
        }),
      );
    });

    it('should filter by category', async () => {
      mockPrisma.cannedJob.findMany.mockResolvedValue([]);
      mockPrisma.cannedJob.count.mockResolvedValue(0);

      await service.findAll('t1', { category: 'Manutenzione' });
      expect(mockPrisma.cannedJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't1', category: 'Manutenzione' },
        }),
      );
    });

    it('should filter by isActive', async () => {
      mockPrisma.cannedJob.findMany.mockResolvedValue([]);
      mockPrisma.cannedJob.count.mockResolvedValue(0);

      await service.findAll('t1', { isActive: true });
      expect(mockPrisma.cannedJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't1', isActive: true },
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return canned job with lines', async () => {
      const job = { id: 'cj-1', lines: [{ id: 'l1' }] };
      mockPrisma.cannedJob.findFirst.mockResolvedValue(job);

      const result = await service.findById('t1', 'cj-1');
      expect(result).toEqual(job);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.cannedJob.findFirst.mockResolvedValue(null);
      await expect(service.findById('t1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update canned job without lines', async () => {
      const existing = { id: 'cj-1', name: 'Old', lines: [] };
      mockPrisma.cannedJob.findFirst.mockResolvedValue(existing);
      const updated = { ...existing, name: 'New' };
      mockPrisma.cannedJob.update.mockResolvedValue(updated);

      const result = await service.update('t1', 'cj-1', { name: 'New' });
      expect(result).toEqual(updated);
    });

    it('should update canned job with new lines (delete old + create new)', async () => {
      const existing = { id: 'cj-1', name: 'Job', lines: [{ id: 'old-l1' }] };
      mockPrisma.cannedJob.findFirst.mockResolvedValue(existing);

      const updated = { id: 'cj-1', name: 'Job', lines: [{ id: 'new-l1' }] };
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          return fn(mockPrisma);
        },
      );
      mockPrisma.cannedJobLine.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.cannedJob.update.mockResolvedValue(updated);

      const result = await service.update('t1', 'cj-1', {
        lines: [{ type: 'PART', description: 'Filtro', quantity: 1, unitPrice: 1500 }],
      });
      expect(result).toEqual(updated);
      expect(mockPrisma.cannedJobLine.deleteMany).toHaveBeenCalledWith({
        where: { cannedJobId: 'cj-1' },
      });
    });

    it('should throw NotFoundException when canned job not found', async () => {
      mockPrisma.cannedJob.findFirst.mockResolvedValue(null);
      await expect(service.update('t1', 'x', { name: 'New' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete by setting isActive = false', async () => {
      const existing = { id: 'cj-1', isActive: true, lines: [] };
      mockPrisma.cannedJob.findFirst.mockResolvedValue(existing);
      mockPrisma.cannedJob.update.mockResolvedValue({ ...existing, isActive: false });

      const result = await service.remove('t1', 'cj-1');
      expect(result.isActive).toBe(false);
      expect(mockPrisma.cannedJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: false },
        }),
      );
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.cannedJob.findFirst.mockResolvedValue(null);
      await expect(service.remove('t1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('applyToEstimate', () => {
    it('should copy canned job lines as estimate lines', async () => {
      const cannedJob = {
        id: 'cj-1',
        lines: [
          {
            type: 'LABOR',
            description: 'Cambio olio',
            quantity: 1,
            unitPrice: 2500,
            partId: null,
            position: 0,
          },
          {
            type: 'PART',
            description: 'Filtro',
            quantity: 2,
            unitPrice: 1500,
            partId: 'p1',
            position: 1,
          },
        ],
      };
      mockPrisma.cannedJob.findFirst.mockResolvedValue(cannedJob);
      mockPrisma.estimate.findFirst.mockResolvedValue({ id: 'est-1', tenantId: 't1' });
      mockPrisma.$transaction.mockResolvedValue([{ id: 'el-1' }, { id: 'el-2' }]);

      const result = await service.applyToEstimate('t1', 'cj-1', 'est-1');
      expect(result).toEqual({ created: 2 });
    });

    it('should throw NotFoundException when canned job not found', async () => {
      mockPrisma.cannedJob.findFirst.mockResolvedValue(null);
      await expect(service.applyToEstimate('t1', 'x', 'est-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when estimate not found', async () => {
      const cannedJob = { id: 'cj-1', lines: [] };
      mockPrisma.cannedJob.findFirst.mockResolvedValue(cannedJob);
      mockPrisma.estimate.findFirst.mockResolvedValue(null);

      await expect(service.applyToEstimate('t1', 'cj-1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('applyToWorkOrder', () => {
    it('should add canned job lines to work order laborItems and partsUsed', async () => {
      const cannedJob = {
        id: 'cj-1',
        lines: [
          {
            type: 'LABOR',
            description: 'Cambio olio',
            quantity: 1,
            unitPrice: 2500,
            laborHours: 0.5,
            partId: null,
          },
          {
            type: 'PART',
            description: 'Filtro',
            quantity: 2,
            unitPrice: 1500,
            laborHours: null,
            partId: 'p1',
          },
        ],
      };
      mockPrisma.cannedJob.findFirst.mockResolvedValue(cannedJob);
      mockPrisma.workOrder.findFirst.mockResolvedValue({
        id: 'wo-1',
        tenantId: 't1',
        laborItems: [],
        partsUsed: [],
      });
      mockPrisma.workOrder.update.mockResolvedValue({ id: 'wo-1' });

      const result = await service.applyToWorkOrder('t1', 'cj-1', 'wo-1');
      expect(result).toEqual({ updated: true });
      expect(mockPrisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            laborItems: [
              { description: 'Cambio olio', quantity: 1, unitPrice: 2500, laborHours: 0.5 },
            ],
            partsUsed: [{ description: 'Filtro', quantity: 2, unitPrice: 1500, partId: 'p1' }],
          }),
        }),
      );
    });

    it('should append to existing laborItems and partsUsed', async () => {
      const cannedJob = {
        id: 'cj-1',
        lines: [
          {
            type: 'LABOR',
            description: 'New labor',
            quantity: 1,
            unitPrice: 3000,
            laborHours: 1,
            partId: null,
          },
        ],
      };
      mockPrisma.cannedJob.findFirst.mockResolvedValue(cannedJob);
      mockPrisma.workOrder.findFirst.mockResolvedValue({
        id: 'wo-1',
        tenantId: 't1',
        laborItems: [{ description: 'Existing' }],
        partsUsed: [{ description: 'Existing part' }],
      });
      mockPrisma.workOrder.update.mockResolvedValue({ id: 'wo-1' });

      await service.applyToWorkOrder('t1', 'cj-1', 'wo-1');
      expect(mockPrisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            laborItems: [
              { description: 'Existing' },
              { description: 'New labor', quantity: 1, unitPrice: 3000, laborHours: 1 },
            ],
            partsUsed: [{ description: 'Existing part' }],
          }),
        }),
      );
    });

    it('should throw NotFoundException when canned job not found', async () => {
      mockPrisma.cannedJob.findFirst.mockResolvedValue(null);
      await expect(service.applyToWorkOrder('t1', 'x', 'wo-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when work order not found', async () => {
      const cannedJob = { id: 'cj-1', lines: [] };
      mockPrisma.cannedJob.findFirst.mockResolvedValue(cannedJob);
      mockPrisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.applyToWorkOrder('t1', 'cj-1', 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
