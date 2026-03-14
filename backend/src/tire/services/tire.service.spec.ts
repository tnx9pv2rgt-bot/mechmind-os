import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TireService } from './tire.service';
import { PrismaService } from '../../common/services/prisma.service';

const mockPrisma = {
  tireSet: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

describe('TireService', () => {
  let service: TireService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TireService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<TireService>(TireService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a tire set', async () => {
      const dto = {
        brand: 'Michelin',
        model: 'Pilot Sport 5',
        size: '225/45 R17',
        season: 'SUMMER' as const,
      };
      const expected = { id: '1', tenantId: 't1', ...dto };
      mockPrisma.tireSet.create.mockResolvedValue(expected);

      const result = await service.create('t1', dto as never);
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('should return tire sets with filters', async () => {
      const sets = [{ id: '1', brand: 'Michelin' }];
      mockPrisma.tireSet.findMany.mockResolvedValue(sets);

      const result = await service.findAll('t1', { season: 'WINTER' as never });
      expect(result).toEqual(sets);
    });

    it('should filter by vehicleId', async () => {
      mockPrisma.tireSet.findMany.mockResolvedValue([]);
      await service.findAll('t1', { vehicleId: 'v1' });
      expect(mockPrisma.tireSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ vehicleId: 'v1' }) }),
      );
    });

    it('should filter by isStored', async () => {
      mockPrisma.tireSet.findMany.mockResolvedValue([]);
      await service.findAll('t1', { isStored: true });
      expect(mockPrisma.tireSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isStored: true }) }),
      );
    });
  });

  describe('findById', () => {
    it('should return tire set by id', async () => {
      const tireSet = { id: '1', brand: 'Michelin' };
      mockPrisma.tireSet.findFirst.mockResolvedValue(tireSet);
      const result = await service.findById('t1', '1');
      expect(result).toEqual(tireSet);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValue(null);
      await expect(service.findById('t1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a tire set', async () => {
      const existing = { id: '1', brand: 'Michelin' };
      mockPrisma.tireSet.findFirst.mockResolvedValue(existing);
      const updated = { ...existing, brand: 'Pirelli' };
      mockPrisma.tireSet.update.mockResolvedValue(updated);

      const result = await service.update('t1', '1', { brand: 'Pirelli' } as never);
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException if tire set not found', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValue(null);
      await expect(service.update('t1', 'x', { brand: 'X' } as never)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('mount', () => {
    it('should mount tire set on vehicle', async () => {
      const existing = { id: '1', isMounted: false };
      mockPrisma.tireSet.findFirst.mockResolvedValue(existing);
      mockPrisma.tireSet.update.mockResolvedValue({
        ...existing,
        isMounted: true,
        vehicleId: 'v1',
      });

      const result = await service.mount('t1', '1', 'v1');
      expect(result.isMounted).toBe(true);
    });

    it('should throw if tire set not found', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValue(null);
      await expect(service.mount('t1', 'x', 'v1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already mounted', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValue({ id: '1', isMounted: true });
      await expect(service.mount('t1', '1', 'v1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('unmount', () => {
    it('should unmount tire set from vehicle', async () => {
      const existing = { id: '1', isMounted: true };
      mockPrisma.tireSet.findFirst.mockResolvedValue(existing);
      mockPrisma.tireSet.update.mockResolvedValue({ ...existing, isMounted: false });

      const result = await service.unmount('t1', '1');
      expect(result.isMounted).toBe(false);
    });

    it('should throw BadRequestException if not mounted', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValue({ id: '1', isMounted: false });
      await expect(service.unmount('t1', '1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('store', () => {
    it('should put tire set in storage', async () => {
      const existing = { id: '1', isStored: false, isMounted: false };
      mockPrisma.tireSet.findFirst.mockResolvedValue(existing);
      mockPrisma.tireSet.update.mockResolvedValue({
        ...existing,
        isStored: true,
        storageLocation: 'RACK-A3',
      });

      const result = await service.store('t1', '1', 'RACK-A3');
      expect(result.isStored).toBe(true);
      expect(result.storageLocation).toBe('RACK-A3');
    });

    it('should throw BadRequestException if already stored', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValue({ id: '1', isStored: true, isMounted: false });
      await expect(service.store('t1', '1', 'RACK-A3')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if still mounted', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValue({ id: '1', isStored: false, isMounted: true });
      await expect(service.store('t1', '1', 'RACK-A3')).rejects.toThrow(BadRequestException);
    });
  });

  describe('retrieve', () => {
    it('should retrieve tire set from storage', async () => {
      const existing = { id: '1', isStored: true };
      mockPrisma.tireSet.findFirst.mockResolvedValue(existing);
      mockPrisma.tireSet.update.mockResolvedValue({
        ...existing,
        isStored: false,
        storedAt: null,
        storageLocation: null,
      });

      const result = await service.retrieve('t1', '1');
      expect(result.isStored).toBe(false);
    });

    it('should throw BadRequestException if not in storage', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValue({ id: '1', isStored: false });
      await expect(service.retrieve('t1', '1')).rejects.toThrow(BadRequestException);
    });
  });
});
