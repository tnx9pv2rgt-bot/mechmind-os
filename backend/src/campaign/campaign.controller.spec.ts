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

  describe('Parameter parsing and edge cases', () => {
    it('findAll with numeric page string should parse to integer', async () => {
      const result = await controller.findAll(TENANT_ID, undefined, '2', '10');
      expect(result.success).toBe(true);
      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, undefined, 2, 10);
    });

    it('findAll with page/limit undefined should use defaults', async () => {
      const result = await controller.findAll(TENANT_ID, undefined, undefined, undefined);
      expect(result.success).toBe(true);
      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, undefined, undefined, undefined);
    });

    it('findAll with status filter should pass to service', async () => {
      const result = await controller.findAll(TENANT_ID, 'SCHEDULED', '1', '20');
      expect(result.success).toBe(true);
      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, 'SCHEDULED', 1, 20);
    });

    it('findAll with status SENT should filter correctly', async () => {
      const result = await controller.findAll(TENANT_ID, 'SENT');
      expect(result.success).toBe(true);
      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, 'SENT', undefined, undefined);
    });

    it('findAll with status CANCELLED should filter correctly', async () => {
      const result = await controller.findAll(TENANT_ID, 'CANCELLED');
      expect(result.success).toBe(true);
      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, 'CANCELLED', undefined, undefined);
    });

    it('previewRecipients with no segmentType should call service without segment', async () => {
      const result = await controller.previewRecipients(TENANT_ID, undefined);
      expect(result.success).toBe(true);
      expect(service.previewRecipients).toHaveBeenCalledWith(TENANT_ID, undefined);
    });

    it('previewRecipients with segmentType INACTIVE_6M should pass segment to service', async () => {
      const result = await controller.previewRecipients(TENANT_ID, 'INACTIVE_6M');
      expect(result.success).toBe(true);
      expect(service.previewRecipients).toHaveBeenCalledWith(TENANT_ID, 'INACTIVE_6M');
    });

    it('update should pass all parameters to service', async () => {
      const dto = { name: 'Updated Campaign' };
      const result = await controller.update(TENANT_ID, 'c1', dto);
      expect(result.success).toBe(true);
      expect(service.update).toHaveBeenCalledWith('c1', TENANT_ID, dto);
    });

    it('schedule should parse ScheduleCampaignDto correctly', async () => {
      const dto = { scheduledAt: '2027-06-01T15:30:00Z' };
      const result = await controller.schedule(TENANT_ID, 'c1', dto);
      expect(result.success).toBe(true);
      expect(service.schedule).toHaveBeenCalledWith('c1', TENANT_ID, expect.any(Date));
    });

    it('create should call service with CreateCampaignDto', async () => {
      const dto = {
        name: 'Marketing Q2',
        type: 'BOTH' as const,
        template: 'Q2 template',
        subject: 'Q2 Campaign',
        segmentType: 'INACTIVE_6M',
      };
      const result = await controller.create(TENANT_ID, dto);
      expect(result.success).toBe(true);
      expect(service.create).toHaveBeenCalledWith(TENANT_ID, expect.any(Object));
      expect(result.data).toBeDefined();
    });

    it('findAll with all parameters should construct correct pagination', async () => {
      service.findAll.mockResolvedValueOnce({
        data: [{ id: 'c1', name: 'Campaign 1' }],
        meta: { total: 50, page: 3, limit: 15, pages: 4 },
      });
      const result = await controller.findAll(TENANT_ID, 'DRAFT', '3', '15');
      expect(result.success).toBe(true);
      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(15);
      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, 'DRAFT', 3, 15);
    });

    it('findOne should invoke service with correct parameters', async () => {
      service.findOne.mockResolvedValueOnce({
        id: 'c123',
        name: 'Campaign',
        status: 'SENT',
      });
      const result = await controller.findOne(TENANT_ID, 'c123');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('c123');
      expect(service.findOne).toHaveBeenCalledWith('c123', TENANT_ID);
    });

    it('send should return campaign with SENDING status', async () => {
      service.send.mockResolvedValueOnce({
        id: 'c1',
        status: 'SENDING',
        totalRecipients: 500,
      });
      const result = await controller.send(TENANT_ID, 'c1');
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('SENDING');
      expect(service.send).toHaveBeenCalledWith('c1', TENANT_ID);
    });

    it('remove should return success message', async () => {
      service.remove.mockResolvedValueOnce(undefined);
      const result = await controller.remove(TENANT_ID, 'c1');
      expect(result.success).toBe(true);
      expect(result.message).toContain('eliminata');
      expect(service.remove).toHaveBeenCalledWith('c1', TENANT_ID);
    });

    it('getStats should return stats object with rates', async () => {
      service.getStats.mockResolvedValueOnce({
        totalRecipients: 1000,
        totalSent: 800,
        totalOpened: 320,
        totalClicked: 64,
        openRate: 40,
        clickRate: 8,
      });
      const result = await controller.getStats(TENANT_ID, 'c1');
      expect(result.success).toBe(true);
      expect(result.data.openRate).toBe(40);
      expect(result.data.clickRate).toBe(8);
      expect(service.getStats).toHaveBeenCalledWith('c1', TENANT_ID);
    });
  });
});
