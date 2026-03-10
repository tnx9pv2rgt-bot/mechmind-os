import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
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
  });

  describe('unmount', () => {
    it('should unmount tire set from vehicle', async () => {
      const existing = { id: '1', isMounted: true };
      mockPrisma.tireSet.findFirst.mockResolvedValue(existing);
      mockPrisma.tireSet.update.mockResolvedValue({ ...existing, isMounted: false });

      const result = await service.unmount('t1', '1');
      expect(result.isMounted).toBe(false);
    });
  });

  describe('store', () => {
    it('should put tire set in storage', async () => {
      const existing = { id: '1', isStored: false };
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
  });
});
