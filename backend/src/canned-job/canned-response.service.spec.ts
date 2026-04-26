import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CannedResponseService } from './canned-response.service';
import { PrismaService } from '../common/services/prisma.service';

const mockPrisma = {
  cannedResponse: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

describe('CannedResponseService', () => {
  let service: CannedResponseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CannedResponseService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<CannedResponseService>(CannedResponseService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a canned response with all fields', async () => {
      const expected = {
        id: 'cr-1',
        category: 'DVI',
        text: 'Usura pastiglie',
        severity: 'HIGH',
        isActive: true,
      };
      mockPrisma.cannedResponse.create.mockResolvedValue(expected);

      const result = await service.create('t1', {
        category: 'DVI',
        text: 'Usura pastiglie',
        severity: 'HIGH',
        isActive: true,
      });
      expect(result).toEqual(expected);
      expect(mockPrisma.cannedResponse.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            tenantId: 't1',
            category: 'DVI',
            text: 'Usura pastiglie',
            severity: 'HIGH',
            isActive: true,
          },
        }),
      );
    });

    it('should create with defaults (no severity, isActive true)', async () => {
      const expected = {
        id: 'cr-2',
        category: 'COMUNICAZIONE',
        text: 'Test',
        severity: null,
        isActive: true,
      };
      mockPrisma.cannedResponse.create.mockResolvedValue(expected);

      const result = await service.create('t1', { category: 'COMUNICAZIONE', text: 'Test' });
      expect(result).toEqual(expected);
      expect(mockPrisma.cannedResponse.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 't1',
            severity: null,
            isActive: true,
          }),
        }),
      );
    });

    it('should create with isActive=false explicitly', async () => {
      const expected = {
        id: 'cr-3',
        category: 'DIAGNOSI',
        text: 'Inactive',
        severity: 'LOW',
        isActive: false,
      };
      mockPrisma.cannedResponse.create.mockResolvedValue(expected);

      const result = await service.create('t1', {
        category: 'DIAGNOSI',
        text: 'Inactive',
        severity: 'LOW',
        isActive: false,
      });
      expect(result).toEqual(expected);
      expect(mockPrisma.cannedResponse.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all canned responses for tenant without filter', async () => {
      const responses = [
        { id: 'cr-1', category: 'DVI' },
        { id: 'cr-2', category: 'COMUNICAZIONE' },
      ];
      mockPrisma.cannedResponse.findMany.mockResolvedValue(responses);

      const result = await service.findAll('t1', {});
      expect(result).toEqual(responses);
      expect(mockPrisma.cannedResponse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't1' },
        }),
      );
    });

    it('should filter by category when provided', async () => {
      const responses = [{ id: 'cr-1', category: 'DVI' }];
      mockPrisma.cannedResponse.findMany.mockResolvedValue(responses);

      const result = await service.findAll('t1', { category: 'DVI' });
      expect(result).toEqual(responses);
      expect(mockPrisma.cannedResponse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't1', category: 'DVI' },
        }),
      );
    });

    it('should return empty array when no responses match category', async () => {
      mockPrisma.cannedResponse.findMany.mockResolvedValue([]);

      const result = await service.findAll('t1', { category: 'NONEXISTENT' });
      expect(result).toEqual([]);
      expect(mockPrisma.cannedResponse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't1', category: 'NONEXISTENT' },
        }),
      );
    });

    it('should order by createdAt descending', async () => {
      mockPrisma.cannedResponse.findMany.mockResolvedValue([]);

      await service.findAll('t1', {});
      expect(mockPrisma.cannedResponse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return canned response', async () => {
      const response = { id: 'cr-1', category: 'DVI', text: 'Test' };
      mockPrisma.cannedResponse.findFirst.mockResolvedValue(response);

      const result = await service.findById('t1', 'cr-1');
      expect(result).toEqual(response);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.cannedResponse.findFirst.mockResolvedValue(null);
      await expect(service.findById('t1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update canned response', async () => {
      const existing = { id: 'cr-1', category: 'DVI', text: 'Old' };
      mockPrisma.cannedResponse.findFirst.mockResolvedValue(existing);
      const updated = { ...existing, text: 'New' };
      mockPrisma.cannedResponse.update.mockResolvedValue(updated);

      const result = await service.update('t1', 'cr-1', { text: 'New' });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.cannedResponse.findFirst.mockResolvedValue(null);
      await expect(service.update('t1', 'x', { text: 'New' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete by setting isActive = false', async () => {
      const existing = { id: 'cr-1', isActive: true };
      mockPrisma.cannedResponse.findFirst.mockResolvedValue(existing);
      mockPrisma.cannedResponse.update.mockResolvedValue({ ...existing, isActive: false });

      const result = await service.remove('t1', 'cr-1');
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.cannedResponse.findFirst.mockResolvedValue(null);
      await expect(service.remove('t1', 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
