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
      prisma.location.create.mockResolvedValueOnce(mockLocation);

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
      prisma.location.create.mockResolvedValueOnce(mockLocation);

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
      prisma.location.create.mockResolvedValueOnce(mockLocation);

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

    it('should preserve explicit country when provided', async () => {
      const locFR = { ...mockLocation, country: 'FR' };
      prisma.location.create.mockResolvedValueOnce(locFR);

      await service.create(TENANT_ID, {
        name: 'Sede Francia',
        address: 'Rue Paris 1',
        city: 'Paris',
        postalCode: '75001',
        country: 'FR',
      });

      expect(prisma.location.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ country: 'FR' }),
      });
    });

    it('should preserve explicit isMain when true', async () => {
      const mainLoc = { ...mockLocation, isMain: true };
      prisma.location.create.mockResolvedValueOnce(mainLoc);

      await service.create(TENANT_ID, {
        name: 'Principale',
        address: 'Main St',
        city: 'Milano',
        postalCode: '20100',
        isMain: true,
      });

      expect(prisma.location.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isMain: true }),
      });
    });

    it('should include tenantId in all create calls', async () => {
      prisma.location.create.mockResolvedValueOnce(mockLocation);

      await service.create(TENANT_ID, {
        name: 'Test',
        address: 'Via Test',
        city: 'Roma',
        postalCode: '00100',
      });

      expect(prisma.location.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId: TENANT_ID }),
      });
    });

    it('should log location creation with tenant context', async () => {
      prisma.location.create.mockResolvedValueOnce(mockLocation);

      await service.create(TENANT_ID, {
        name: 'Sede Milano',
        address: 'Via Roma 1',
        city: 'Milano',
        postalCode: '20100',
      });

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Creating location "Sede Milano"'),
      );
    });

    it('should handle nullable country field with default', async () => {
      const loc = { ...mockLocation, country: 'IT' };
      prisma.location.create.mockResolvedValueOnce(loc);

      await service.create(TENANT_ID, {
        name: 'Test',
        address: 'Via Test',
        city: 'Roma',
        postalCode: '00100',
        country: undefined,
      });

      expect(prisma.location.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ country: 'IT' }),
      });
    });

    it('should handle nullable isMain field with default', async () => {
      const loc = { ...mockLocation, isMain: false };
      prisma.location.create.mockResolvedValueOnce(loc);

      await service.create(TENANT_ID, {
        name: 'Test',
        address: 'Via Test',
        city: 'Roma',
        postalCode: '00100',
        isMain: undefined,
      });

      expect(prisma.location.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isMain: false }),
      });
    });

    it('should coalesce null country to IT', async () => {
      const loc = { ...mockLocation, country: 'IT' };
      prisma.location.create.mockResolvedValueOnce(loc);

      await service.create(TENANT_ID, {
        name: 'Test',
        address: 'Via Test',
        city: 'Roma',
        postalCode: '00100',
        country: null as any,
      });

      expect(prisma.location.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ country: 'IT' }),
      });
    });

    it('should coalesce null isMain to false', async () => {
      const loc = { ...mockLocation, isMain: false };
      prisma.location.create.mockResolvedValueOnce(loc);

      await service.create(TENANT_ID, {
        name: 'Test',
        address: 'Via Test',
        city: 'Roma',
        postalCode: '00100',
        isMain: null as any,
      });

      expect(prisma.location.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isMain: false }),
      });
      expect(prisma.location.create).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // findAll
  // =========================================================================
  describe('findAll', () => {
    it('should return paginated results', async () => {
      prisma.location.findMany.mockResolvedValueOnce([mockLocation]);
      prisma.location.count.mockResolvedValueOnce(1);

      const result = await service.findAll(TENANT_ID);

      expect(result).toEqual({
        data: [mockLocation],
        total: 1,
        page: 1,
        limit: 20,
        pages: 1,
      });
      expect(result.data[0].id).toBe(LOCATION_ID);
    });

    it('should only return active locations', async () => {
      prisma.location.findMany.mockResolvedValueOnce([]);
      prisma.location.count.mockResolvedValueOnce(0);

      await service.findAll(TENANT_ID);

      expect(prisma.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, isActive: true },
        }),
      );
    });

    it('should use default pagination', async () => {
      prisma.location.findMany.mockResolvedValueOnce([]);
      prisma.location.count.mockResolvedValueOnce(0);

      await service.findAll(TENANT_ID);

      expect(prisma.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should apply custom pagination', async () => {
      prisma.location.findMany.mockResolvedValueOnce([]);
      prisma.location.count.mockResolvedValueOnce(50);

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
      prisma.location.findMany.mockResolvedValueOnce([]);
      prisma.location.count.mockResolvedValueOnce(25);

      const result = await service.findAll(TENANT_ID, 1, 10);

      expect(result.pages).toBe(3); // ceil(25/10)
      expect(result.total).toBe(25);
    });

    it('should handle multiple locations in results', async () => {
      const locations = [mockLocation, { ...mockLocation, id: 'loc-002', name: 'Sede 2' }];
      prisma.location.findMany.mockResolvedValueOnce(locations);
      prisma.location.count.mockResolvedValueOnce(2);

      const result = await service.findAll(TENANT_ID, 1, 10);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should handle empty results', async () => {
      prisma.location.findMany.mockResolvedValueOnce([]);
      prisma.location.count.mockResolvedValueOnce(0);

      const result = await service.findAll(TENANT_ID);

      expect(result.data).toEqual([]);
      expect(result.pages).toBe(0);
    });

    it('should order results by createdAt descending', async () => {
      prisma.location.findMany.mockResolvedValueOnce([]);
      prisma.location.count.mockResolvedValueOnce(0);

      await service.findAll(TENANT_ID);

      expect(prisma.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(prisma.location.count).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // findById
  // =========================================================================
  describe('findById', () => {
    it('should return location when found', async () => {
      prisma.location.findFirst.mockResolvedValueOnce(mockLocation);

      const result = await service.findById(TENANT_ID, LOCATION_ID);

      expect(prisma.location.findFirst).toHaveBeenCalledWith({
        where: { id: LOCATION_ID, tenantId: TENANT_ID },
      });
      expect(result).toEqual(mockLocation);
      expect(result.id).toBe(LOCATION_ID);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.location.findFirst.mockResolvedValueOnce(null);

      await expect(service.findById(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findById(TENANT_ID, 'nonexistent')).rejects.toThrow(
        'Sede con ID nonexistent non trovata',
      );
    });

    it('should enforce tenant isolation - return not found for different tenant', async () => {
      prisma.location.findFirst.mockResolvedValueOnce(null);

      await expect(service.findById('other-tenant', LOCATION_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.location.findFirst).toHaveBeenCalledWith({
        where: { id: LOCATION_ID, tenantId: 'other-tenant' },
      });
    });

    it('should call Prisma findFirst with correct tenant filter', async () => {
      prisma.location.findFirst.mockResolvedValueOnce(mockLocation);

      await service.findById(TENANT_ID, LOCATION_ID);

      expect(prisma.location.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.location.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });
  });

  // =========================================================================
  // update
  // =========================================================================
  describe('update', () => {
    it('should update location with tenantId isolation', async () => {
      prisma.location.findFirst.mockResolvedValueOnce(mockLocation);
      const updated = { ...mockLocation, name: 'Nuova Sede' };
      prisma.location.update.mockResolvedValueOnce(updated);

      const result = await service.update(TENANT_ID, LOCATION_ID, { name: 'Nuova Sede' });

      expect(prisma.location.update).toHaveBeenCalledWith({
        where: { id: LOCATION_ID, tenantId: TENANT_ID },
        data: { name: 'Nuova Sede' },
      });
      expect(result.name).toBe('Nuova Sede');
    });

    it('should throw NotFoundException if location does not exist', async () => {
      prisma.location.findFirst.mockResolvedValueOnce(null);

      await expect(service.update(TENANT_ID, 'nonexistent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should enforce cross-tenant isolation on update', async () => {
      prisma.location.findFirst.mockResolvedValueOnce(null);

      await expect(service.update('other-tenant', LOCATION_ID, { name: 'Hack' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.location.findFirst).toHaveBeenCalledWith({
        where: { id: LOCATION_ID, tenantId: 'other-tenant' },
      });
      expect(prisma.location.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // delete (soft delete)
  // =========================================================================
  describe('delete', () => {
    it('should soft-delete by setting isActive=false with tenantId isolation', async () => {
      prisma.location.findFirst.mockResolvedValueOnce(mockLocation);
      prisma.location.update.mockResolvedValueOnce({ ...mockLocation, isActive: false });

      const result = await service.delete(TENANT_ID, LOCATION_ID);

      expect(prisma.location.update).toHaveBeenCalledWith({
        where: { id: LOCATION_ID, tenantId: TENANT_ID },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if location does not exist', async () => {
      prisma.location.findFirst.mockResolvedValueOnce(null);

      await expect(service.delete(TENANT_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should enforce cross-tenant isolation on delete', async () => {
      prisma.location.findFirst.mockResolvedValueOnce(null);

      await expect(service.delete('other-tenant', LOCATION_ID)).rejects.toThrow(NotFoundException);
      expect(prisma.location.findFirst).toHaveBeenCalledWith({
        where: { id: LOCATION_ID, tenantId: 'other-tenant' },
      });
      expect(prisma.location.update).not.toHaveBeenCalled();
    });
  });
});
