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
    count: jest.fn(),
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
    // Set default mock behavior to prevent persistent state
    mockPrisma.tireSet.create.mockResolvedValue(null);
    mockPrisma.tireSet.findMany.mockResolvedValue([]);
    mockPrisma.tireSet.findFirst.mockResolvedValue(null);
    mockPrisma.tireSet.update.mockResolvedValue(null);
    mockPrisma.tireSet.count.mockResolvedValue(0);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a tire set with all optional fields', async () => {
      const dto = {
        vehicleId: 'v1',
        brand: 'Michelin',
        model: 'Pilot Sport 5',
        size: '225/45 R17',
        season: 'SUMMER' as const,
        dot: '2324',
        treadDepthMm: 8.5,
        wearLevel: 30,
        storageLocation: 'RACK-A3',
        notes: 'Winter backup set',
      };
      const expected = { id: '1', tenantId: 't1', isMounted: false, isStored: false, ...dto };
      mockPrisma.tireSet.create.mockResolvedValueOnce(expected);

      const result = await service.create('t1', dto as never);

      expect(result).toEqual(expected);
      expect(result.id).toBe('1');
      expect(result.tenantId).toBe('t1');
      expect(result.brand).toBe('Michelin');
      expect(result.wearLevel).toBe(30);
      expect(mockPrisma.tireSet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 't1',
            brand: 'Michelin',
            vehicleId: 'v1',
          }),
        }),
      );
      expect(mockPrisma.tireSet.create).toHaveBeenCalledTimes(1);
    });

    it('should use default wearLevel of 0 when not provided', async () => {
      const dto = {
        brand: 'Michelin',
        model: 'Pilot Sport 5',
        size: '225/45 R17',
        season: 'SUMMER' as const,
      };
      const expected = {
        id: '1',
        tenantId: 't1',
        wearLevel: 0,
        ...dto,
      };
      mockPrisma.tireSet.create.mockResolvedValueOnce(expected as never);

      const result = await service.create('t1', dto as never);

      expect(result.wearLevel).toBe(0);
      expect(result.id).toBe('1');
      expect(mockPrisma.tireSet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ wearLevel: 0 }),
        }),
      );
      expect(mockPrisma.tireSet.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return tire sets with filters', async () => {
      const sets = [{ id: '1', brand: 'Michelin' }];
      mockPrisma.tireSet.findMany.mockResolvedValueOnce(sets);
      mockPrisma.tireSet.count.mockResolvedValueOnce(1);

      const result = await service.findAll('t1', { season: 'WINTER' as never });
      expect(result).toEqual({ data: sets, total: 1, page: 1, limit: 20, pages: 1 });
      expect(result.data).toHaveLength(1);
      expect(result.pages).toBe(1);
      expect(result.page).toBe(1);
      expect(mockPrisma.tireSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ season: 'WINTER' }),
        }),
      );
      expect(mockPrisma.tireSet.count).toHaveBeenCalledTimes(1);
    });

    it('should filter by vehicleId', async () => {
      mockPrisma.tireSet.findMany.mockResolvedValueOnce([]);
      mockPrisma.tireSet.count.mockResolvedValueOnce(0);
      await service.findAll('t1', { vehicleId: 'v1' });
      expect(mockPrisma.tireSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ vehicleId: 'v1' }) }),
      );
    });

    it('should filter by isStored=true', async () => {
      mockPrisma.tireSet.findMany.mockResolvedValueOnce([]);
      mockPrisma.tireSet.count.mockResolvedValueOnce(0);
      await service.findAll('t1', { isStored: true });
      expect(mockPrisma.tireSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isStored: true }) }),
      );
    });

    it('should filter by isStored=false', async () => {
      mockPrisma.tireSet.findMany.mockResolvedValueOnce([]);
      mockPrisma.tireSet.count.mockResolvedValueOnce(5);
      await service.findAll('t1', { isStored: false });
      expect(mockPrisma.tireSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isStored: false }) }),
      );
    });

    it('should handle pagination with custom page and limit', async () => {
      const sets = [{ id: '1' }, { id: '2' }];
      mockPrisma.tireSet.findMany.mockResolvedValueOnce(sets);
      mockPrisma.tireSet.count.mockResolvedValueOnce(100);

      const result = await service.findAll('t1', { page: 3, limit: 10 });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.pages).toBe(10);
      expect(mockPrisma.tireSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should ensure tenantId is always in where clause', async () => {
      mockPrisma.tireSet.findMany.mockResolvedValueOnce([]);
      mockPrisma.tireSet.count.mockResolvedValueOnce(0);

      await service.findAll('t1', {});

      expect(mockPrisma.tireSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 't1', isActive: true }),
        }),
      );
      expect(mockPrisma.tireSet.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 't1', isActive: true }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return tire set by id', async () => {
      const tireSet = { id: '1', brand: 'Michelin' };
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce(tireSet);
      const result = await service.findById('t1', '1');
      expect(result).toEqual(tireSet);
      expect(result.id).toBe('1');
      expect(mockPrisma.tireSet.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: '1', tenantId: 't1' }) }),
      );
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce(null);
      await expect(service.findById('t1', 'x')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.tireSet.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 'x', tenantId: 't1' }) }),
      );
    });
  });

  describe('update', () => {
    it('should update a tire set', async () => {
      const existing = { id: '1', brand: 'Michelin' };
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce(existing);
      const updated = { ...existing, brand: 'Pirelli' };
      mockPrisma.tireSet.update.mockResolvedValueOnce(updated);

      const result = await service.update('t1', '1', { brand: 'Pirelli' } as never);
      expect(result).toEqual(updated);
      expect(result.brand).toBe('Pirelli');
      expect(mockPrisma.tireSet.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: '1' } }),
      );
    });

    it('should throw NotFoundException if tire set not found', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce(null);
      await expect(service.update('t1', 'x', { brand: 'X' } as never)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.tireSet.update).not.toHaveBeenCalled();
    });
  });

  describe('mount', () => {
    it('should mount tire set on vehicle', async () => {
      const existing = { id: '1', isMounted: false };
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce(existing);
      const mounted = { ...existing, isMounted: true, vehicleId: 'v1' };
      mockPrisma.tireSet.update.mockResolvedValueOnce(mounted);

      const result = await service.mount('t1', '1', 'v1');
      expect(result.isMounted).toBe(true);
      expect(result.vehicleId).toBe('v1');
      expect(mockPrisma.tireSet.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isMounted: true }) }),
      );
    });

    it('should throw if tire set not found', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce(null);
      await expect(service.mount('t1', 'x', 'v1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.tireSet.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if already mounted', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce({ id: '1', isMounted: true });
      await expect(service.mount('t1', '1', 'v1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.tireSet.update).not.toHaveBeenCalled();
    });
  });

  describe('unmount', () => {
    it('should unmount tire set from vehicle', async () => {
      const existing = { id: '1', isMounted: true };
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce(existing);
      mockPrisma.tireSet.update.mockResolvedValueOnce({ ...existing, isMounted: false });

      const result = await service.unmount('t1', '1');
      expect(result.isMounted).toBe(false);
      expect(mockPrisma.tireSet.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isMounted: false }) }),
      );
    });

    it('should throw BadRequestException if not mounted', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce({ id: '1', isMounted: false });
      await expect(service.unmount('t1', '1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.tireSet.update).not.toHaveBeenCalled();
    });
  });

  describe('store', () => {
    it('should put tire set in storage', async () => {
      const existing = { id: '1', isStored: false, isMounted: false };
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce(existing);
      mockPrisma.tireSet.update.mockResolvedValueOnce({
        ...existing,
        isStored: true,
        storageLocation: 'RACK-A3',
      });

      const result = await service.store('t1', '1', 'RACK-A3');
      expect(result.isStored).toBe(true);
      expect(result.storageLocation).toBe('RACK-A3');
      expect(mockPrisma.tireSet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isStored: true, storageLocation: 'RACK-A3' }),
        }),
      );
    });

    it('should throw BadRequestException if already stored', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce({
        id: '1',
        isStored: true,
        isMounted: false,
      });
      await expect(service.store('t1', '1', 'RACK-A3')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.tireSet.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if still mounted', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce({
        id: '1',
        isStored: false,
        isMounted: true,
      });
      await expect(service.store('t1', '1', 'RACK-A3')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.tireSet.update).not.toHaveBeenCalled();
    });
  });

  describe('retrieve', () => {
    it('should retrieve tire set from storage', async () => {
      const existing = { id: '1', isStored: true };
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce(existing);
      mockPrisma.tireSet.update.mockResolvedValueOnce({
        ...existing,
        isStored: false,
        storedAt: null,
        storageLocation: null,
      });

      const result = await service.retrieve('t1', '1');
      expect(result.isStored).toBe(false);
      expect(result.storedAt).toBe(null);
      expect(result.storageLocation).toBe(null);
      expect(mockPrisma.tireSet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isStored: false,
            storedAt: null,
            storageLocation: null,
          }),
        }),
      );
    });

    it('should throw BadRequestException if not in storage', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce({ id: '1', isStored: false });
      await expect(service.retrieve('t1', '1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.tireSet.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if tire set does not exist', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce(null);
      await expect(service.retrieve('t1', 'nonexistent')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.tireSet.update).not.toHaveBeenCalled();
    });
  });

  describe('cross-tenant isolation', () => {
    it('should ensure all queries include tenantId in where clause', async () => {
      const existing = { id: '1', tenantId: 't1' };
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce(existing);

      await service.findById('t1', '1');

      expect(mockPrisma.tireSet.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 't1', id: '1' }),
        }),
      );
      expect(mockPrisma.tireSet.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should return NotFoundException for different tenant', async () => {
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce(null);
      await expect(service.findById('t2', '1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.tireSet.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 't2' }),
        }),
      );
    });

    it('should filter findAll by tenantId and isActive', async () => {
      mockPrisma.tireSet.findMany.mockResolvedValueOnce([]);
      mockPrisma.tireSet.count.mockResolvedValueOnce(0);

      await service.findAll('t1', {});

      expect(mockPrisma.tireSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 't1', isActive: true }),
        }),
      );
      expect(mockPrisma.tireSet.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 't1', isActive: true }),
        }),
      );
    });
  });

  describe('mount/unmount/store/retrieve state transitions', () => {
    it('mount should clear storage location and stored state', async () => {
      const existing = { id: '1', isMounted: false, isStored: false };
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce(existing);
      mockPrisma.tireSet.update.mockResolvedValueOnce({
        ...existing,
        isMounted: true,
        vehicleId: 'v1',
        isStored: false,
        storedAt: null,
        storageLocation: null,
      });

      await service.mount('t1', '1', 'v1');

      expect(mockPrisma.tireSet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isStored: false,
            storedAt: null,
            storageLocation: null,
          }),
        }),
      );
      expect(mockPrisma.tireSet.update).toHaveBeenCalledTimes(1);
    });

    it('unmount should set mountedAt and unmountedAt', async () => {
      const existing = { id: '1', isMounted: true, unmountedAt: null };
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce(existing);
      const result = {
        ...existing,
        isMounted: false,
        unmountedAt: new Date('2026-05-02T12:00:00Z'),
      };
      mockPrisma.tireSet.update.mockResolvedValueOnce(result);

      await service.unmount('t1', '1');

      expect(mockPrisma.tireSet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isMounted: false,
            unmountedAt: expect.any(Date),
          }),
        }),
      );
      expect(mockPrisma.tireSet.update).toHaveBeenCalledTimes(1);
    });

    it('store should set storedAt and isStored flags', async () => {
      const existing = { id: '1', isStored: false, isMounted: false };
      mockPrisma.tireSet.findFirst.mockResolvedValueOnce(existing);
      const result = {
        ...existing,
        isStored: true,
        storedAt: new Date('2026-05-02T12:00:00Z'),
        storageLocation: 'RACK-A3',
      };
      mockPrisma.tireSet.update.mockResolvedValueOnce(result);

      const res = await service.store('t1', '1', 'RACK-A3');

      expect(res.isStored).toBe(true);
      expect(res.storageLocation).toBe('RACK-A3');
      expect(mockPrisma.tireSet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isStored: true,
            storedAt: expect.any(Date),
            storageLocation: 'RACK-A3',
          }),
        }),
      );
      expect(mockPrisma.tireSet.update).toHaveBeenCalledTimes(1);
    });
  });
});
