import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LocationService } from './location.service';
import { PrismaService } from '../common/services/prisma.service';
import { LoggerService } from '../common/services/logger.service';

describe('LocationService', () => {
  let service: LocationService;
  let prisma: {
    location: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };
  let logger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  const TENANT_ID = 'tenant-uuid-001';
  const LOCATION_ID = 'loc-uuid-001';

  const mockLocation = {
    id: LOCATION_ID,
    tenantId: TENANT_ID,
    name: 'Sede Centrale',
    address: 'Via Roma 1',
    city: 'Milano',
    postalCode: '20100',
    country: 'IT',
    phone: '+39021234567',
    email: 'sede@example.com',
    isMain: true,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    prisma = {
      location: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };
    logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        { provide: PrismaService, useValue: prisma },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // create
  // =========================================================================
  describe('create', () => {
    it('should create a location with all fields', async () => {
      prisma.location.create.mockResolvedValue(mockLocation);

      const dto = {
        name: 'Sede Centrale',
        address: 'Via Roma 1',
        city: 'Milano',
        postalCode: '20100',
        country: 'IT',
        phone: '+39021234567',
        email: 'sede@example.com',
        isMain: true,
      };

      const result = await service.create(TENANT_ID, dto);

      expect(prisma.location.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          name: 'Sede Centrale',
          address: 'Via Roma 1',
          city: 'Milano',
          postalCode: '20100',
          country: 'IT',
          phone: '+39021234567',
          email: 'sede@example.com',
          isMain: true,
        },
      });
      expect(result).toEqual(mockLocation);
      expect(logger.log).toHaveBeenCalled();
    });

    it('should default country to IT when not provided', async () => {
      prisma.location.create.mockResolvedValue(mockLocation);

      await service.create(TENANT_ID, {
        name: 'Test',
        address: 'Via Test',
        city: 'Roma',
        postalCode: '00100',
      });

      expect(prisma.location.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ country: 'IT' }),
      });
    });

    it('should default isMain to false when not provided', async () => {
      prisma.location.create.mockResolvedValue(mockLocation);

      await service.create(TENANT_ID, {
        name: 'Test',
        address: 'Via Test',
        city: 'Roma',
        postalCode: '00100',
      });

      expect(prisma.location.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isMain: false }),
      });
    });
  });

  // =========================================================================
  // findAll
  // =========================================================================
  describe('findAll', () => {
    it('should return paginated results', async () => {
      prisma.location.findMany.mockResolvedValue([mockLocation]);
      prisma.location.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID);

      expect(result).toEqual({
        data: [mockLocation],
        total: 1,
        page: 1,
        limit: 20,
        pages: 1,
      });
    });

    it('should only return active locations', async () => {
      prisma.location.findMany.mockResolvedValue([]);
      prisma.location.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID);

      expect(prisma.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, isActive: true },
        }),
      );
    });

    it('should use default pagination', async () => {
      prisma.location.findMany.mockResolvedValue([]);
      prisma.location.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID);

      expect(prisma.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should apply custom pagination', async () => {
      prisma.location.findMany.mockResolvedValue([]);
      prisma.location.count.mockResolvedValue(50);

      const result = await service.findAll(TENANT_ID, 3, 10);

      expect(prisma.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(result.pages).toBe(5);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
    });

    it('should calculate pages correctly with remainder', async () => {
      prisma.location.findMany.mockResolvedValue([]);
      prisma.location.count.mockResolvedValue(25);

      const result = await service.findAll(TENANT_ID, 1, 10);

      expect(result.pages).toBe(3); // ceil(25/10)
    });
  });

  // =========================================================================
  // findById
  // =========================================================================
  describe('findById', () => {
    it('should return location when found', async () => {
      prisma.location.findFirst.mockResolvedValue(mockLocation);

      const result = await service.findById(TENANT_ID, LOCATION_ID);

      expect(prisma.location.findFirst).toHaveBeenCalledWith({
        where: { id: LOCATION_ID, tenantId: TENANT_ID },
      });
      expect(result).toEqual(mockLocation);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.location.findFirst.mockResolvedValue(null);

      await expect(service.findById(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findById(TENANT_ID, 'nonexistent')).rejects.toThrow(
        'Sede con ID nonexistent non trovata',
      );
    });
  });

  // =========================================================================
  // update
  // =========================================================================
  describe('update', () => {
    it('should update location', async () => {
      prisma.location.findFirst.mockResolvedValue(mockLocation);
      const updated = { ...mockLocation, name: 'Nuova Sede' };
      prisma.location.update.mockResolvedValue(updated);

      const result = await service.update(TENANT_ID, LOCATION_ID, { name: 'Nuova Sede' });

      expect(prisma.location.update).toHaveBeenCalledWith({
        where: { id: LOCATION_ID },
        data: { name: 'Nuova Sede' },
      });
      expect(result.name).toBe('Nuova Sede');
    });

    it('should throw NotFoundException if location does not exist', async () => {
      prisma.location.findFirst.mockResolvedValue(null);

      await expect(service.update(TENANT_ID, 'nonexistent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // delete (soft delete)
  // =========================================================================
  describe('delete', () => {
    it('should soft-delete by setting isActive=false', async () => {
      prisma.location.findFirst.mockResolvedValue(mockLocation);
      prisma.location.update.mockResolvedValue({ ...mockLocation, isActive: false });

      const result = await service.delete(TENANT_ID, LOCATION_ID);

      expect(prisma.location.update).toHaveBeenCalledWith({
        where: { id: LOCATION_ID },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if location does not exist', async () => {
      prisma.location.findFirst.mockResolvedValue(null);

      await expect(service.delete(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
