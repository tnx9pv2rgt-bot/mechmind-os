import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
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

    it('should throw BadRequestException if guide name already exists', async () => {
      mockPrisma.laborGuide.findUnique.mockResolvedValue({ id: '1', name: 'BMW Standard' });
      await expect(service.createGuide('t1', { name: 'BMW Standard' } as never)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAllGuides', () => {
    it('should return all active guides', async () => {
      const guides = [{ id: '1', name: 'BMW Standard' }];
      mockPrisma.laborGuide.findMany.mockResolvedValue(guides);

      const result = await service.findAllGuides('t1');
      expect(result).toEqual(guides);
      expect(mockPrisma.laborGuide.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 't1', isActive: true } }),
      );
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

  describe('updateGuide', () => {
    it('should update a guide', async () => {
      mockPrisma.laborGuide.findFirst.mockResolvedValue({ id: '1', entries: [] });
      mockPrisma.laborGuide.update.mockResolvedValue({ id: '1', name: 'Updated' });

      const result = await service.updateGuide('t1', '1', { description: 'New desc' } as never);
      expect(result).toEqual({ id: '1', name: 'Updated' });
    });

    it('should check name uniqueness when updating name', async () => {
      mockPrisma.laborGuide.findFirst
        .mockResolvedValueOnce({ id: '1', entries: [] }) // findGuideById
        .mockResolvedValueOnce({ id: '2', name: 'Existing Name' }); // name uniqueness check
      await expect(
        service.updateGuide('t1', '1', { name: 'Existing Name' } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow updating name if no conflict', async () => {
      mockPrisma.laborGuide.findFirst
        .mockResolvedValueOnce({ id: '1', entries: [] }) // findGuideById
        .mockResolvedValueOnce(null); // no conflict
      mockPrisma.laborGuide.update.mockResolvedValue({ id: '1', name: 'New Name' });

      const result = await service.updateGuide('t1', '1', { name: 'New Name' } as never);
      expect(result.name).toBe('New Name');
    });
  });

  describe('deleteGuide', () => {
    it('should soft-delete a guide', async () => {
      mockPrisma.laborGuide.findFirst.mockResolvedValue({ id: '1', entries: [] });
      mockPrisma.laborGuide.update.mockResolvedValue({ id: '1', isActive: false });

      const result = await service.deleteGuide('t1', '1');
      expect(result.isActive).toBe(false);
      expect(mockPrisma.laborGuide.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException if guide not found', async () => {
      mockPrisma.laborGuide.findFirst.mockResolvedValue(null);
      await expect(service.deleteGuide('t1', 'x')).rejects.toThrow(NotFoundException);
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

    it('should throw BadRequestException if yearFrom > yearTo', async () => {
      mockPrisma.laborGuide.findFirst.mockResolvedValue({ id: '1', entries: [] });
      await expect(
        service.addEntry('t1', '1', {
          make: 'BMW',
          operationCode: 'X',
          operationName: 'X',
          category: 'X',
          laborTimeMinutes: 60,
          yearFrom: 2025,
          yearTo: 2020,
        } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateEntry', () => {
    it('should update an entry', async () => {
      const entry = { id: 'e1', tenantId: 't1', yearFrom: 2020, yearTo: 2025 };
      mockPrisma.laborGuideEntry.findFirst.mockResolvedValue(entry);
      mockPrisma.laborGuideEntry.update.mockResolvedValue({ ...entry, laborTimeMinutes: 120 });

      const result = await service.updateEntry('t1', 'e1', { laborTimeMinutes: 120 } as never);
      expect(result.laborTimeMinutes).toBe(120);
    });

    it('should throw NotFoundException if entry not found', async () => {
      mockPrisma.laborGuideEntry.findFirst.mockResolvedValue(null);
      await expect(service.updateEntry('t1', 'x', {} as never)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if yearFrom > yearTo after merge', async () => {
      const entry = { id: 'e1', tenantId: 't1', yearFrom: 2020, yearTo: 2025 };
      mockPrisma.laborGuideEntry.findFirst.mockResolvedValue(entry);
      await expect(service.updateEntry('t1', 'e1', { yearFrom: 2030 } as never)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteEntry', () => {
    it('should delete an entry', async () => {
      const entry = { id: 'e1', tenantId: 't1' };
      mockPrisma.laborGuideEntry.findFirst.mockResolvedValue(entry);
      mockPrisma.laborGuideEntry.delete.mockResolvedValue(entry);

      const result = await service.deleteEntry('t1', 'e1');
      expect(result).toEqual(entry);
      expect(mockPrisma.laborGuideEntry.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
    });

    it('should throw NotFoundException if entry not found', async () => {
      mockPrisma.laborGuideEntry.findFirst.mockResolvedValue(null);
      await expect(service.deleteEntry('t1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchEntries', () => {
    it('should search by make only', async () => {
      mockPrisma.laborGuideEntry.findMany.mockResolvedValue([]);
      await service.searchEntries('t1', 'BMW');
      expect(mockPrisma.laborGuideEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 't1',
            make: { equals: 'BMW', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should search by make and model', async () => {
      mockPrisma.laborGuideEntry.findMany.mockResolvedValue([]);
      await service.searchEntries('t1', 'BMW', '3 Series');
      expect(mockPrisma.laborGuideEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            model: { equals: '3 Series', mode: 'insensitive' },
          }),
        }),
      );
    });
  });
});
