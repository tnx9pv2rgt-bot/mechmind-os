import { Test, TestingModule } from '@nestjs/testing';
import { TireController } from './tire.controller';
import { TireService } from '../services/tire.service';

describe('TireController', () => {
  let controller: TireController;
  let service: jest.Mocked<TireService>;

  const TENANT_ID = 'tenant-001';

  const mockTireSet = {
    id: 'tire-001',
    tenantId: TENANT_ID,
    vehicleId: 'veh-001',
    brand: 'Michelin',
    model: 'Pilot Sport 4',
    size: '225/45R17',
    season: 'SUMMER',
    isStored: false,
    storageLocation: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TireController],
      providers: [
        {
          provide: TireService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            mount: jest.fn(),
            unmount: jest.fn(),
            store: jest.fn(),
            retrieve: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TireController>(TireController);
    service = module.get(TireService) as jest.Mocked<TireService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to service with tenantId and dto', async () => {
      service.create.mockResolvedValue(mockTireSet as never);
      const dto = {
        brand: 'Michelin',
        model: 'Pilot Sport 4',
        size: '225/45R17',
        season: 'SUMMER',
      };

      const result = await controller.create(TENANT_ID, dto as never);

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(mockTireSet);
    });
  });

  describe('findAll', () => {
    it('should delegate to service with tenantId and query filters', async () => {
      service.findAll.mockResolvedValue([mockTireSet] as never);
      const query = { vehicleId: 'veh-001', season: 'SUMMER', isStored: false };

      const result = await controller.findAll(TENANT_ID, query as never);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        vehicleId: 'veh-001',
        season: 'SUMMER',
        isStored: false,
      });
      expect(result).toEqual([mockTireSet]);
    });
  });

  describe('findById', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.findById.mockResolvedValue(mockTireSet as never);

      const result = await controller.findById(TENANT_ID, 'tire-001');

      expect(service.findById).toHaveBeenCalledWith(TENANT_ID, 'tire-001');
      expect(result).toEqual(mockTireSet);
    });
  });

  describe('update', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const updated = { ...mockTireSet, brand: 'Continental' };
      service.update.mockResolvedValue(updated as never);
      const dto = { brand: 'Continental' };

      const result = await controller.update(TENANT_ID, 'tire-001', dto as never);

      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'tire-001', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('mount', () => {
    it('should delegate to service with tenantId, id, and vehicleId from dto', async () => {
      const mounted = { ...mockTireSet, vehicleId: 'veh-002' };
      service.mount.mockResolvedValue(mounted as never);
      const dto = { vehicleId: 'veh-002' };

      const result = await controller.mount(TENANT_ID, 'tire-001', dto as never);

      expect(service.mount).toHaveBeenCalledWith(TENANT_ID, 'tire-001', 'veh-002');
      expect(result).toEqual(mounted);
    });
  });

  describe('unmount', () => {
    it('should delegate to service with tenantId and id', async () => {
      const unmounted = { ...mockTireSet, vehicleId: null };
      service.unmount.mockResolvedValue(unmounted as never);

      const result = await controller.unmount(TENANT_ID, 'tire-001');

      expect(service.unmount).toHaveBeenCalledWith(TENANT_ID, 'tire-001');
      expect(result).toEqual(unmounted);
    });
  });

  describe('store', () => {
    it('should delegate to service with tenantId, id, and storageLocation from dto', async () => {
      const stored = { ...mockTireSet, isStored: true, storageLocation: 'Rack A-3' };
      service.store.mockResolvedValue(stored as never);
      const dto = { storageLocation: 'Rack A-3' };

      const result = await controller.store(TENANT_ID, 'tire-001', dto as never);

      expect(service.store).toHaveBeenCalledWith(TENANT_ID, 'tire-001', 'Rack A-3');
      expect(result).toEqual(stored);
    });
  });

  describe('retrieve', () => {
    it('should delegate to service with tenantId and id', async () => {
      const retrieved = { ...mockTireSet, isStored: false, storageLocation: null };
      service.retrieve.mockResolvedValue(retrieved as never);

      const result = await controller.retrieve(TENANT_ID, 'tire-001');

      expect(service.retrieve).toHaveBeenCalledWith(TENANT_ID, 'tire-001');
      expect(result).toEqual(retrieved);
    });
  });
});
