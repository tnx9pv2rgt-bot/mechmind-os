import { Test, TestingModule } from '@nestjs/testing';
import { WebhookConfigController } from './webhook-config.controller';

const mockReq = (tenantId = 'tenant-001') => ({
  user: { userId: 'user-001', tenantId },
});

describe('WebhookConfigController', () => {
  let controller: WebhookConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookConfigController],
    }).compile();

    controller = module.get(WebhookConfigController);
  });

  describe('findAll', () => {
    it('should return success true', () => {
      const result = controller.findAll(mockReq());

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return empty data array (feature not yet implemented)', () => {
      const result = controller.findAll(mockReq());

      expect(result.data).toEqual([]);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should work regardless of tenantId (pure stub)', () => {
      const r1 = controller.findAll(mockReq('tenant-001'));
      const r2 = controller.findAll(mockReq('tenant-xyz'));

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r1.data).toHaveLength(0);
      expect(r2.data).toHaveLength(0);
    });
  });
});
