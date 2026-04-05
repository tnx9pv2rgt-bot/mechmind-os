import { Test, TestingModule } from '@nestjs/testing';
import { CannedResponseController } from './canned-response.controller';
import { CannedResponseService } from './canned-response.service';

describe('CannedResponseController', () => {
  let controller: CannedResponseController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const TENANT_ID = 'tenant-001';

  const mockResponse = {
    id: 'cr-001',
    tenantId: TENANT_ID,
    title: 'Tagliando standard',
    body: 'Il suo veicolo necessita di un tagliando.',
    category: 'MAINTENANCE',
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CannedResponseController],
      providers: [{ provide: CannedResponseService, useValue: service }],
    }).compile();

    controller = module.get<CannedResponseController>(CannedResponseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to service and wrap in success response', async () => {
      const dto = { title: 'Test', body: 'Body', category: 'GENERAL' };
      service.create.mockResolvedValue(mockResponse);

      const result = await controller.create(TENANT_ID, dto as never);

      expect(result).toEqual({ success: true, data: mockResponse });
      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto);
    });
  });

  describe('findAll', () => {
    it('should return all responses without filter', async () => {
      service.findAll.mockResolvedValue([mockResponse]);

      const result = await controller.findAll(TENANT_ID);

      expect(result).toEqual({ success: true, data: [mockResponse] });
      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, { category: undefined });
    });

    it('should pass category filter to service', async () => {
      service.findAll.mockResolvedValue([mockResponse]);

      const result = await controller.findAll(TENANT_ID, 'MAINTENANCE');

      expect(result).toEqual({ success: true, data: [mockResponse] });
      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, { category: 'MAINTENANCE' });
    });

    it('should return empty array when no responses match', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll(TENANT_ID, 'NONEXISTENT');

      expect(result).toEqual({ success: true, data: [] });
    });
  });

  describe('findById', () => {
    it('should return a canned response by ID', async () => {
      service.findById.mockResolvedValue(mockResponse);

      const result = await controller.findById(TENANT_ID, 'cr-001');

      expect(result).toEqual({ success: true, data: mockResponse });
      expect(service.findById).toHaveBeenCalledWith(TENANT_ID, 'cr-001');
    });

    it('should propagate NotFoundException from service', async () => {
      service.findById.mockRejectedValue(new Error('Not found'));

      await expect(controller.findById(TENANT_ID, 'nonexistent')).rejects.toThrow('Not found');
    });
  });

  describe('update', () => {
    it('should delegate update to service', async () => {
      const dto = { title: 'Updated' };
      const updated = { ...mockResponse, title: 'Updated' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(TENANT_ID, 'cr-001', dto as never);

      expect(result).toEqual({ success: true, data: updated });
      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'cr-001', dto);
    });

    it('should propagate errors from service', async () => {
      service.update.mockRejectedValue(new Error('Not found'));

      await expect(controller.update(TENANT_ID, 'cr-001', {} as never)).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should delegate remove to service', async () => {
      const deactivated = { ...mockResponse, isActive: false };
      service.remove.mockResolvedValue(deactivated);

      const result = await controller.remove(TENANT_ID, 'cr-001');

      expect(result).toEqual({ success: true, data: deactivated });
      expect(service.remove).toHaveBeenCalledWith(TENANT_ID, 'cr-001');
    });

    it('should propagate errors from service', async () => {
      service.remove.mockRejectedValue(new Error('Not found'));

      await expect(controller.remove(TENANT_ID, 'nonexistent')).rejects.toThrow();
    });
  });

  describe('tenant isolation', () => {
    it('should pass tenant ID from decorator to all service methods', async () => {
      service.create.mockResolvedValue(mockResponse);
      service.findAll.mockResolvedValue([]);
      service.findById.mockResolvedValue(mockResponse);
      service.update.mockResolvedValue(mockResponse);
      service.remove.mockResolvedValue(mockResponse);

      await controller.create(TENANT_ID, { title: 'T', body: 'B' } as never);
      await controller.findAll(TENANT_ID);
      await controller.findById(TENANT_ID, 'cr-001');
      await controller.update(TENANT_ID, 'cr-001', {} as never);
      await controller.remove(TENANT_ID, 'cr-001');

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, expect.anything());
      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, expect.anything());
      expect(service.findById).toHaveBeenCalledWith(TENANT_ID, 'cr-001');
      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'cr-001', expect.anything());
      expect(service.remove).toHaveBeenCalledWith(TENANT_ID, 'cr-001');
    });
  });
});
