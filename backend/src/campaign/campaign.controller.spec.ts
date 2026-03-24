import { Test, TestingModule } from '@nestjs/testing';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';

const TENANT_ID = 'tenant-001';

describe('CampaignController', () => {
  let controller: CampaignController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    send: jest.Mock;
    schedule: jest.Mock;
    previewRecipients: jest.Mock;
    getStats: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ id: 'c1' }),
      findAll: jest
        .fn()
        .mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, pages: 0 } }),
      findOne: jest.fn().mockResolvedValue({ id: 'c1' }),
      update: jest.fn().mockResolvedValue({ id: 'c1' }),
      remove: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue({ id: 'c1', status: 'SENDING' }),
      schedule: jest.fn().mockResolvedValue({ id: 'c1', status: 'SCHEDULED' }),
      previewRecipients: jest.fn().mockResolvedValue({ count: 10, sample: [] }),
      getStats: jest.fn().mockResolvedValue({ totalSent: 100, openRate: 40 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignController],
      providers: [{ provide: CampaignService, useValue: service }],
    }).compile();

    controller = module.get<CampaignController>(CampaignController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should return success', async () => {
    const result = await controller.create(TENANT_ID, {
      name: 'Test',
      type: 'EMAIL',
      template: 'Hello',
    });
    expect(result.success).toBe(true);
    expect(service.create).toHaveBeenCalledWith(TENANT_ID, expect.any(Object));
  });

  it('findAll should return paginated data', async () => {
    const result = await controller.findAll(TENANT_ID);
    expect(result.success).toBe(true);
  });

  it('findOne should return campaign', async () => {
    const result = await controller.findOne(TENANT_ID, 'c1');
    expect(result.success).toBe(true);
  });

  it('send should invoke campaignService.send', async () => {
    const result = await controller.send(TENANT_ID, 'c1');
    expect(result.success).toBe(true);
    expect(service.send).toHaveBeenCalledWith('c1', TENANT_ID);
  });

  it('schedule should invoke campaignService.schedule', async () => {
    const result = await controller.schedule(TENANT_ID, 'c1', {
      scheduledAt: '2027-01-01T10:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('remove should invoke campaignService.remove', async () => {
    const result = await controller.remove(TENANT_ID, 'c1');
    expect(result.success).toBe(true);
  });

  it('previewRecipients should return count', async () => {
    const result = await controller.previewRecipients(TENANT_ID, 'INACTIVE_6M');
    expect(result.success).toBe(true);
    expect(result.data.count).toBe(10);
  });

  it('getStats should return campaign stats', async () => {
    const result = await controller.getStats(TENANT_ID, 'c1');
    expect(result.success).toBe(true);
  });
});
