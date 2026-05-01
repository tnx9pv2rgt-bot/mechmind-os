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
    count: jest.fn(),
  },
  laborGuideEntry: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
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
    it('should return all active guides with pagination', async () => {
      const guides = [{ id: '1', name: 'BMW Standard' }];
      mockPrisma.laborGuide.findMany.mockResolvedValue(guides);
      mockPrisma.laborGuide.count.mockResolvedValue(1);

      const result = await service.findAllGuides('t1');
      expect(result).toEqual({ data: guides, total: 1, page: 1, limit: 50, pages: 1 });
      expect(mockPrisma.laborGuide.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't1', isActive: true },
          skip: 0,
          take: 50,
        }),
      );
    });

    it('should use custom pagination parameters', async () => {
      mockPrisma.laborGuide.findMany.mockResolvedValueOnce([]);
      mockPrisma.laborGuide.count.mockResolvedValueOnce(200);

      const result = await service.findAllGuides('t1', { page: 3, limit: 25 });

      expect(result).toEqual({ data: [], total: 200, page: 3, limit: 25, pages: 8 });
      expect(mockPrisma.laborGuide.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50, // (3-1) * 25
          take: 25,
        }),
      );
    });

    it('should default to page 1 when not provided', async () => {
      mockPrisma.laborGuide.findMany.mockResolvedValueOnce([]);
      mockPrisma.laborGuide.count.mockResolvedValueOnce(0);

      await service.findAllGuides('t1', { limit: 100 });

      expect(mockPrisma.laborGuide.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });

    it('should default to limit 50 when not provided', async () => {
      mockPrisma.laborGuide.findMany.mockResolvedValueOnce([]);
      mockPrisma.laborGuide.count.mockResolvedValueOnce(0);

      await service.findAllGuides('t1', { page: 2 });

      expect(mockPrisma.laborGuide.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('should calculate pages correctly with zero total', async () => {
      mockPrisma.laborGuide.findMany.mockResolvedValueOnce([]);
      mockPrisma.laborGuide.count.mockResolvedValueOnce(0);

      const result = await service.findAllGuides('t1', { page: 1, limit: 50 });

      expect(result.pages).toBe(0); // Math.ceil(0 / 50)
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
      mockPrisma.laborGuideEntry.count.mockResolvedValue(1);

      const result = await service.searchEntries('t1', 'BMW', undefined, 'BRAKES');
      expect(result.data).toEqual(entries);
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

    it('should skip name uniqueness check if name is not being updated', async () => {
      mockPrisma.laborGuide.findFirst.mockResolvedValueOnce({ id: '1', entries: [] });
      mockPrisma.laborGuide.update.mockResolvedValueOnce({ id: '1', description: 'New desc' });

      await service.updateGuide('t1', '1', { description: 'New desc', isActive: true } as never);

      // Verify findFirst was called only once (for findGuideById), not twice (no name check)
      expect(mockPrisma.laborGuide.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should update isActive and source without name check', async () => {
      mockPrisma.laborGuide.findFirst.mockResolvedValueOnce({ id: '1', entries: [] });
      mockPrisma.laborGuide.update.mockResolvedValueOnce({
        id: '1',
        isActive: false,
        source: 'CUSTOM',
      });

      const result = await service.updateGuide('t1', '1', {
        isActive: false,
        source: 'CUSTOM',
      } as never);

      expect(result.isActive).toBe(false);
      expect(mockPrisma.laborGuide.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({ isActive: false, source: 'CUSTOM' }),
        }),
      );
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

    it('should allow null yearFrom and yearTo', async () => {
      mockPrisma.laborGuide.findFirst.mockResolvedValue({ id: '1', entries: [] });
      const dto = {
        make: 'BMW',
        operationCode: 'CODE',
        operationName: 'Operation',
        category: 'ENGINE',
        laborTimeMinutes: 120,
        yearFrom: undefined,
        yearTo: undefined,
      };
      mockPrisma.laborGuideEntry.create.mockResolvedValueOnce({ id: 'e1', ...dto });

      const result = await service.addEntry('t1', '1', dto as never);
      expect(result.id).toBe('e1');
    });

    it('should set difficultyLevel default to 1 if not provided', async () => {
      mockPrisma.laborGuide.findFirst.mockResolvedValue({ id: '1', entries: [] });
      const dto = {
        make: 'BMW',
        operationCode: 'CODE',
        operationName: 'Operation',
        category: 'ENGINE',
        laborTimeMinutes: 120,
      };
      const expected = { id: 'e1', guideId: '1', difficultyLevel: 1, ...dto };
      mockPrisma.laborGuideEntry.create.mockResolvedValueOnce(expected);

      const result = await service.addEntry('t1', '1', dto as never);

      expect(mockPrisma.laborGuideEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ difficultyLevel: 1 }),
        }),
      );
      expect(result.difficultyLevel).toBe(1);
    });

    it('should throw NotFoundException if guide not found', async () => {
      mockPrisma.laborGuide.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.addEntry('t1', 'nonexistent', {
          make: 'BMW',
          operationCode: 'CODE',
          operationName: 'Op',
          category: 'ENGINE',
          laborTimeMinutes: 60,
        } as never),
      ).rejects.toThrow(NotFoundException);
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

    it('should use existing yearFrom when not updated', async () => {
      const entry = { id: 'e1', tenantId: 't1', yearFrom: 2015, yearTo: 2025 };
      mockPrisma.laborGuideEntry.findFirst.mockResolvedValueOnce(entry);
      mockPrisma.laborGuideEntry.update.mockResolvedValueOnce({
        ...entry,
        yearTo: 2030,
      });

      const result = await service.updateEntry('t1', 'e1', { yearTo: 2030 } as never);

      // Verify the merge logic: yearFrom should remain 2015 (existing)
      expect(mockPrisma.laborGuideEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ yearFrom: undefined, yearTo: 2030 }),
        }),
      );
    });

    it('should use existing yearTo when not updated', async () => {
      const entry = { id: 'e1', tenantId: 't1', yearFrom: 2020, yearTo: 2025 };
      mockPrisma.laborGuideEntry.findFirst.mockResolvedValueOnce(entry);
      mockPrisma.laborGuideEntry.update.mockResolvedValueOnce({
        ...entry,
        yearFrom: 2010,
      });

      await service.updateEntry('t1', 'e1', { yearFrom: 2010 } as never);

      expect(mockPrisma.laborGuideEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ yearFrom: 2010, yearTo: undefined }),
        }),
      );
    });

    it('should allow updating both yearFrom and yearTo if valid', async () => {
      const entry = { id: 'e1', tenantId: 't1', yearFrom: 2020, yearTo: 2025 };
      mockPrisma.laborGuideEntry.findFirst.mockResolvedValueOnce(entry);
      mockPrisma.laborGuideEntry.update.mockResolvedValueOnce({
        ...entry,
        yearFrom: 2015,
        yearTo: 2030,
      });

      await service.updateEntry('t1', 'e1', { yearFrom: 2015, yearTo: 2030 } as never);

      expect(mockPrisma.laborGuideEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ yearFrom: 2015, yearTo: 2030 }),
        }),
      );
    });

    it('should allow yearFrom equals yearTo', async () => {
      const entry = { id: 'e1', tenantId: 't1', yearFrom: 2020, yearTo: 2025 };
      mockPrisma.laborGuideEntry.findFirst.mockResolvedValueOnce(entry);
      mockPrisma.laborGuideEntry.update.mockResolvedValueOnce({
        ...entry,
        yearFrom: 2022,
        yearTo: 2022,
      });

      await service.updateEntry('t1', 'e1', { yearFrom: 2022, yearTo: 2022 } as never);

      expect(mockPrisma.laborGuideEntry.update).toHaveBeenCalled();
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
      mockPrisma.laborGuideEntry.count.mockResolvedValue(0);
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
      mockPrisma.laborGuideEntry.count.mockResolvedValue(0);
      await service.searchEntries('t1', 'BMW', '3 Series');
      expect(mockPrisma.laborGuideEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            model: { equals: '3 Series', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should search with pagination custom page and limit', async () => {
      mockPrisma.laborGuideEntry.findMany.mockResolvedValueOnce([]);
      mockPrisma.laborGuideEntry.count.mockResolvedValueOnce(100);
      const result = await service.searchEntries('t1', 'BMW', undefined, undefined, 5, 10);
      expect(mockPrisma.laborGuideEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (5-1) * 10
          take: 10,
        }),
      );
      expect(result.page).toBe(5);
      expect(result.limit).toBe(10);
      expect(result.pages).toBe(10); // ceil(100/10)
    });

    it('should include guide data in search results', async () => {
      const entriesWithGuide = [
        { id: 'e1', make: 'BMW', guide: { id: 'g1', name: 'Guide1', source: 'MANUFACTURER' } },
      ];
      mockPrisma.laborGuideEntry.findMany.mockResolvedValueOnce(entriesWithGuide as never);
      mockPrisma.laborGuideEntry.count.mockResolvedValueOnce(1);

      const result = await service.searchEntries('t1', 'BMW');
      expect(result.data).toEqual(entriesWithGuide);
      expect(mockPrisma.laborGuideEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { guide: { select: { id: true, name: true, source: true } } },
        }),
      );
    });

    it('should handle search with category and model filters', async () => {
      mockPrisma.laborGuideEntry.findMany.mockResolvedValueOnce([]);
      mockPrisma.laborGuideEntry.count.mockResolvedValueOnce(0);

      await service.searchEntries('t1', 'BMW', 'X5', 'ENGINE');

      expect(mockPrisma.laborGuideEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 't1',
            make: { equals: 'BMW', mode: 'insensitive' },
            model: { equals: 'X5', mode: 'insensitive' },
            category: { equals: 'ENGINE', mode: 'insensitive' },
            guide: { isActive: true },
          }),
        }),
      );
    });
  });
});
