import { Test, TestingModule } from '@nestjs/testing';
import { CannedJobController } from './canned-job.controller';
import { CannedJobService } from './canned-job.service';

describe('CannedJobController', () => {
  let controller: CannedJobController;
  let service: jest.Mocked<CannedJobService>;

  const TENANT_ID = 'tenant-001';

  const mockCannedJob = {
    id: 'cj-001',
    tenantId: TENANT_ID,
    name: 'Tagliando 30k',
    isActive: true,
    lines: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CannedJobController],
      providers: [
        {
          provide: CannedJobService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            applyToEstimate: jest.fn(),
            applyToWorkOrder: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CannedJobController>(CannedJobController);
    service = module.get(CannedJobService) as jest.Mocked<CannedJobService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to service and wrap in success response', async () => {
      const dto = { name: 'Tagliando 30k' };
      service.create.mockResolvedValue(mockCannedJob as never);

      const result = await controller.create(TENANT_ID, dto as never);

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual({ success: true, data: mockCannedJob });
    });
  });

  describe('findAll', () => {
    it('should delegate to service with parsed filters', async () => {
      const paginated = { data: [mockCannedJob], total: 1, page: 1, limit: 20, pages: 1 };
      service.findAll.mockResolvedValue(paginated as never);

      const result = await controller.findAll(TENANT_ID, 'Manutenzione', 'true');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        category: 'Manutenzione',
        isActive: true,
        page: undefined,
        limit: undefined,
      });
      expect(result).toEqual({
        success: true,
        data: [mockCannedJob],
        meta: { total: 1, page: 1, limit: 20, pages: 1 },
      });
    });

    it('should handle undefined filters', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 20, pages: 0 };
      service.findAll.mockResolvedValue(paginated as never);

      const result = await controller.findAll(TENANT_ID);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        category: undefined,
        isActive: undefined,
        page: undefined,
        limit: undefined,
      });
      expect(result).toEqual({
        success: true,
        data: [],
        meta: { total: 0, page: 1, limit: 20, pages: 0 },
      });
    });

    it('should parse isActive=false correctly', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 20, pages: 0 };
      service.findAll.mockResolvedValue(paginated as never);

      await controller.findAll(TENANT_ID, undefined, 'false');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        category: undefined,
        isActive: false,
        page: undefined,
        limit: undefined,
      });
    });

    it('should parse page and limit as integers', async () => {
      const paginated = { data: [mockCannedJob], total: 10, page: 2, limit: 5, pages: 2 };
      service.findAll.mockResolvedValue(paginated as never);

      const result = await controller.findAll(TENANT_ID, undefined, undefined, '2', '5');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        category: undefined,
        isActive: undefined,
        page: 2,
        limit: 5,
      });
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
    });

    it('should handle isActive as non-boolean string (default to undefined)', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 20, pages: 0 };
      service.findAll.mockResolvedValue(paginated as never);

      await controller.findAll(TENANT_ID, undefined, 'maybe');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        category: undefined,
        isActive: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should handle category with filters and pagination', async () => {
      const paginated = { data: [mockCannedJob], total: 5, page: 1, limit: 10, pages: 1 };
      service.findAll.mockResolvedValue(paginated as never);

      const result = await controller.findAll(TENANT_ID, 'Riparazioni', 'false', '1', '10');

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        category: 'Riparazioni',
        isActive: false,
        page: 1,
        limit: 10,
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should delegate to service and wrap in success response', async () => {
      service.findById.mockResolvedValue(mockCannedJob as never);

      const result = await controller.findById(TENANT_ID, 'cj-001');

      expect(service.findById).toHaveBeenCalledWith(TENANT_ID, 'cj-001');
      expect(result).toEqual({ success: true, data: mockCannedJob });
    });
  });

  describe('update', () => {
    it('should delegate to service with tenantId, id, and dto', async () => {
      const dto = { name: 'Updated' };
      const updated = { ...mockCannedJob, name: 'Updated' };
      service.update.mockResolvedValue(updated as never);

      const result = await controller.update(TENANT_ID, 'cj-001', dto as never);

      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'cj-001', dto);
      expect(result).toEqual({ success: true, data: updated });
    });
  });

  describe('remove', () => {
    it('should delegate to service and wrap in success response', async () => {
      const removed = { ...mockCannedJob, isActive: false };
      service.remove.mockResolvedValue(removed as never);

      const result = await controller.remove(TENANT_ID, 'cj-001');

      expect(service.remove).toHaveBeenCalledWith(TENANT_ID, 'cj-001');
      expect(result).toEqual({ success: true, data: removed });
    });
  });

  describe('applyToEstimate', () => {
    it('should delegate to service and return created count', async () => {
      service.applyToEstimate.mockResolvedValue({ created: 3 });

      const result = await controller.applyToEstimate(TENANT_ID, 'cj-001', 'est-001');

      expect(service.applyToEstimate).toHaveBeenCalledWith(TENANT_ID, 'cj-001', 'est-001');
      expect(result).toEqual({ success: true, data: { created: 3 } });
    });
  });

  describe('applyToWorkOrder', () => {
    it('should delegate to service and return updated flag', async () => {
      service.applyToWorkOrder.mockResolvedValue({ updated: true });

      const result = await controller.applyToWorkOrder(TENANT_ID, 'cj-001', 'wo-001');

      expect(service.applyToWorkOrder).toHaveBeenCalledWith(TENANT_ID, 'cj-001', 'wo-001');
      expect(result).toEqual({ success: true, data: { updated: true } });
    });
  });
});
