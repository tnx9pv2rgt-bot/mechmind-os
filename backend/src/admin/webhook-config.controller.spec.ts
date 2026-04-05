import { Test, TestingModule } from '@nestjs/testing';
import { WebhookConfigController } from './webhook-config.controller';

describe('WebhookConfigController', () => {
  let controller: WebhookConfigController;

  const mockReq = {
    user: { userId: 'user-1', tenantId: 'tenant-1', email: 'test@test.com', role: 'ADMIN' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookConfigController],
    }).compile();

    controller = module.get<WebhookConfigController>(WebhookConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return empty array', () => {
      const result = controller.findAll(mockReq);

      expect(result).toEqual({ success: true, data: [] });
    });
  });
});
