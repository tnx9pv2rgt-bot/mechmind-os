import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';

describe('LocationController', () => {
  let controller: LocationController;
  let service: jest.Mocked<LocationService>;

  const TENANT_ID = 'tenant-001';

  const mockLocation = {
    id: 'loc-001',
    tenantId: TENANT_ID,
    name: 'Sede Principale',
    address: 'Via Roma 1',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [
        {
          provide: LocationService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LocationController>(LocationController);
    service = module.get(LocationService) as jest.Mocked<LocationService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to service with tenantId and dto', async () => {
      service.create.mockResolvedValueOnce(mockLocation as never);
      const dto = { name: 'Sede Principale', address: 'Via Roma 1' };

      const result = await controller.create(TENANT_ID, dto as never);

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(mockLocation);
      expect(result.id).toBe('loc-001');
    });

    it('should return location data from service', async () => {
      const newLocation = {
        id: 'loc-002',
        name: 'Sede Nord',
        address: 'Via Nord 5',
        tenantId: TENANT_ID,
      };
      service.create.mockResolvedValueOnce(newLocation as never);

      const result = await controller.create(TENANT_ID, {
        name: 'Sede Nord',
        address: 'Via Nord 5',
      } as never);

      expect(result).toEqual(newLocation);
      expect(service.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should delegate to service with parsed page and limit', async () => {
      const expected = { data: [mockLocation], total: 1, page: 1, limit: 20, pages: 1 };
      service.findAll.mockResolvedValueOnce(expected as never);

      const result = await controller.findAll(TENANT_ID, '1', '20');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, 1, 20);
      expect(result).toEqual(expected);
      expect(result.total).toBe(1);
      expect(result.data.length).toBe(1);
    });

    it('should pass undefined when page/limit not provided', async () => {
      const expected = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        pages: 0,
      };
      service.findAll.mockResolvedValueOnce(expected as never);

      const result = await controller.findAll(TENANT_ID);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, undefined, undefined);
      expect(result.pages).toBe(0);
    });

    it('should handle custom pagination values', async () => {
      const expected = { data: [mockLocation], total: 50, page: 2, limit: 10, pages: 5 };
      service.findAll.mockResolvedValueOnce(expected as never);

      const result = await controller.findAll(TENANT_ID, '2', '10');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, 2, 10);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.pages).toBe(5);
    });

    it('should parse numeric page string to number', async () => {
      const expected = { data: [mockLocation], total: 1, page: 1, limit: 20, pages: 1 };
      service.findAll.mockResolvedValueOnce(expected as never);

      await controller.findAll(TENANT_ID, '1', undefined as any);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, 1, undefined);
    });

    it('should parse numeric limit string to number', async () => {
      const expected = { data: [mockLocation], total: 1, page: 1, limit: 20, pages: 1 };
      service.findAll.mockResolvedValueOnce(expected as never);

      await controller.findAll(TENANT_ID, undefined as any, '20');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, undefined, 20);
    });

    it('should handle page string conversion with base 10', async () => {
      const expected = { data: [], total: 0, page: 5, limit: 20, pages: 0 };
      service.findAll.mockResolvedValueOnce(expected as never);

      await controller.findAll(TENANT_ID, '5', '20');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, 5, 20);
    });

    it('should handle limit string conversion with base 10', async () => {
      const expected = { data: [], total: 0, page: 1, limit: 50, pages: 0 };
      service.findAll.mockResolvedValueOnce(expected as never);

      await controller.findAll(TENANT_ID, '1', '50');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, 1, 50);
    });
  });

  describe('findById', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.findById.mockResolvedValueOnce(mockLocation as never);

      const result = await controller.findById(TENANT_ID, 'loc-001');

      expect(service.findById).toHaveBeenCalledWith(TENANT_ID, 'loc-001');
      expect(result).toEqual(mockLocation);
      expect(result.id).toBe('loc-001');
      expect(result.tenantId).toBe(TENANT_ID);
    });

    it('should return the found location data', async () => {
      const location = { id: 'loc-002', name: 'Altra Sede', tenantId: TENANT_ID };
      service.findById.mockResolvedValueOnce(location as never);

      const result = await controller.findById(TENANT_ID, 'loc-002');

      expect(result).toEqual(location);
      expect(service.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const updated = { ...mockLocation, name: 'Sede Aggiornata' };
      service.update.mockResolvedValueOnce(updated as never);

      const result = await controller.update(TENANT_ID, 'loc-001', {
        name: 'Sede Aggiornata',
      } as never);

      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'loc-001', {
        name: 'Sede Aggiornata',
      });
      expect(result).toEqual(updated);
      expect(result.name).toBe('Sede Aggiornata');
    });

    it('should return updated location data', async () => {
      const updated = { ...mockLocation, address: 'Via Milano 10' };
      service.update.mockResolvedValueOnce(updated as never);

      const result = await controller.update(TENANT_ID, 'loc-001', {
        address: 'Via Milano 10',
      } as never);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('should delegate to service with tenantId and id', async () => {
      const deleted = { ...mockLocation, isActive: false };
      service.delete.mockResolvedValueOnce(deleted as never);

      const result = await controller.delete(TENANT_ID, 'loc-001');

      expect(service.delete).toHaveBeenCalledWith(TENANT_ID, 'loc-001');
      expect(result).toEqual(deleted);
      expect(result.isActive).toBe(false);
    });

    it('should return soft-deleted location', async () => {
      const deleted = { ...mockLocation, isActive: false };
      service.delete.mockResolvedValueOnce(deleted as never);

      const result = await controller.delete(TENANT_ID, 'loc-001');

      expect(result.isActive).toBe(false);
      expect(service.delete).toHaveBeenCalledTimes(1);
    });
  });
});
