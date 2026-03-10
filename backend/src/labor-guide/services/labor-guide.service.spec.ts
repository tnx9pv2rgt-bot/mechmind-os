import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LaborGuideService } from './labor-guide.service';
import { PrismaService } from '../../common/services/prisma.service';

const mockPrisma = {
  laborGuide: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  laborGuideEntry: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('LaborGuideService', () => {
  let service: LaborGuideService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LaborGuideService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<LaborGuideService>(LaborGuideService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createGuide', () => {
    it('should create a labor guide', async () => {
      const dto = { name: 'BMW Standard', source: 'MANUFACTURER' };
      const expected = { id: '1', tenantId: 't1', ...dto };
      mockPrisma.laborGuide.findUnique.mockResolvedValue(null);
      mockPrisma.laborGuide.create.mockResolvedValue(expected);

      const result = await service.createGuide('t1', dto as never);
      expect(result).toEqual(expected);
    });
  });

  describe('findGuideById', () => {
    it('should return guide with entries', async () => {
      const guide = { id: '1', entries: [{ id: 'e1' }] };
      mockPrisma.laborGuide.findFirst.mockResolvedValue(guide);

      const result = await service.findGuideById('t1', '1');
      expect(result).toEqual(guide);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.laborGuide.findFirst.mockResolvedValue(null);
      await expect(service.findGuideById('t1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchEntries', () => {
    it('should search entries by make and category', async () => {
      const entries = [{ id: 'e1', make: 'BMW', category: 'BRAKES', laborTimeMinutes: 120 }];
      mockPrisma.laborGuideEntry.findMany.mockResolvedValue(entries);

      const result = await service.searchEntries('t1', 'BMW', undefined, 'BRAKES');
      expect(result).toEqual(entries);
      expect(mockPrisma.laborGuideEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 't1',
            make: { equals: 'BMW', mode: 'insensitive' },
            category: { equals: 'BRAKES', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  describe('addEntry', () => {
    it('should add entry to guide', async () => {
      mockPrisma.laborGuide.findFirst.mockResolvedValue({ id: '1', entries: [] });
      const dto = {
        make: 'BMW',
        operationCode: 'BRAKE_PAD',
        operationName: 'Brake Pad Replacement',
        category: 'BRAKES',
        laborTimeMinutes: 90,
      };
      const expected = { id: 'e1', guideId: '1', ...dto };
      mockPrisma.laborGuideEntry.create.mockResolvedValue(expected);

      const result = await service.addEntry('t1', '1', dto as never);
      expect(result).toEqual(expected);
    });
  });
});
