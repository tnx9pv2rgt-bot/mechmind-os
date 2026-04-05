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
      service.create.mockResolvedValue(mockLocation as never);
      const dto = { name: 'Sede Principale', address: 'Via Roma 1' };

      const result = await controller.create(TENANT_ID, dto as never);

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(mockLocation);
    });
  });

  describe('findAll', () => {
    it('should delegate to service with parsed page and limit', async () => {
      const expected = { data: [mockLocation], total: 1, page: 1, limit: 20, pages: 1 };
      service.findAll.mockResolvedValue(expected as never);

      const result = await controller.findAll(TENANT_ID, '1', '20');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, 1, 20);
      expect(result).toEqual(expected);
    });

    it('should pass undefined when page/limit not provided', async () => {
      service.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        pages: 0,
      } as never);

      await controller.findAll(TENANT_ID);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, undefined, undefined);
    });
  });

  describe('findById', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.findById.mockResolvedValue(mockLocation as never);

      const result = await controller.findById(TENANT_ID, 'loc-001');

      expect(service.findById).toHaveBeenCalledWith(TENANT_ID, 'loc-001');
      expect(result).toEqual(mockLocation);
    });
  });

  describe('update', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const updated = { ...mockLocation, name: 'Sede Aggiornata' };
      service.update.mockResolvedValue(updated as never);

      const result = await controller.update(TENANT_ID, 'loc-001', {
        name: 'Sede Aggiornata',
      } as never);

      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'loc-001', {
        name: 'Sede Aggiornata',
      });
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('should delegate to service with tenantId and id', async () => {
      const deleted = { ...mockLocation, isActive: false };
      service.delete.mockResolvedValue(deleted as never);

      const result = await controller.delete(TENANT_ID, 'loc-001');

      expect(service.delete).toHaveBeenCalledWith(TENANT_ID, 'loc-001');
      expect(result).toEqual(deleted);
    });
  });
});
