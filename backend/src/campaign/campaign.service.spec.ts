import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { PrismaService } from '../common/services/prisma.service';

const TENANT_ID = 'tenant-001';
const CAMPAIGN_ID = 'campaign-001';

function makeMockCampaign(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: CAMPAIGN_ID,
    tenantId: TENANT_ID,
    name: 'Promo Primavera 2026',
    type: 'EMAIL',
    status: 'DRAFT',
    template: 'Gentile {{nomeCliente}}, il tuo veicolo necessita di un tagliando.',
    subject: 'Promemoria tagliando',
    segmentType: null,
    segmentFilters: null,
    scheduledAt: null,
    sentAt: null,
    totalRecipients: 0,
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    recipients: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CampaignService', () => {
  let service: CampaignService;
  let prisma: {
    campaign: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    customer: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      campaign: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      customer: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CampaignService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
  });

  describe('create', () => {
    it('should create a campaign', async () => {
      const dto = {
        name: 'Promo Primavera',
        type: 'EMAIL' as const,
        template: 'Gentile {{nomeCliente}}...',
        subject: 'Promemoria',
      };
      prisma.campaign.create.mockResolvedValue(makeMockCampaign(dto));

      const result = await service.create(TENANT_ID, dto);

      expect(result).toBeDefined();
      expect(prisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            name: 'Promo Primavera',
            type: 'EMAIL',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated campaigns', async () => {
      prisma.campaign.findMany.mockResolvedValue([makeMockCampaign()]);
      prisma.campaign.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by status', async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      prisma.campaign.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, 'SENT');

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, status: 'SENT' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a campaign', async () => {
      prisma.campaign.findFirst.mockResolvedValue(makeMockCampaign());

      const result = await service.findOne(CAMPAIGN_ID, TENANT_ID);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException', async () => {
      prisma.campaign.findFirst.mockResolvedValue(null);

      await expect(service.findOne(CAMPAIGN_ID, TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a DRAFT campaign', async () => {
      prisma.campaign.findFirst.mockResolvedValue(makeMockCampaign());
      prisma.campaign.update.mockResolvedValue(makeMockCampaign({ name: 'Updated' }));

      const result = await service.update(CAMPAIGN_ID, TENANT_ID, { name: 'Updated' });

      expect(result).toBeDefined();
      expect(prisma.campaign.update).toHaveBeenCalled();
    });

    it('should reject update on non-DRAFT campaign', async () => {
      prisma.campaign.findFirst.mockResolvedValue(makeMockCampaign({ status: 'SENT' }));

      await expect(service.update(CAMPAIGN_ID, TENANT_ID, { name: 'Updated' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a DRAFT campaign', async () => {
      prisma.campaign.findFirst.mockResolvedValue(makeMockCampaign());
      prisma.campaign.delete.mockResolvedValue({});

      await service.remove(CAMPAIGN_ID, TENANT_ID);

      expect(prisma.campaign.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: CAMPAIGN_ID } }),
      );
    });

    it('should reject delete on non-DRAFT campaign', async () => {
      prisma.campaign.findFirst.mockResolvedValue(makeMockCampaign({ status: 'SENT' }));

      await expect(service.remove(CAMPAIGN_ID, TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('schedule', () => {
    it('should schedule a DRAFT campaign', async () => {
      prisma.campaign.findFirst.mockResolvedValue(makeMockCampaign());
      const futureDate = new Date('2027-01-01T10:00:00Z');
      prisma.campaign.update.mockResolvedValue(
        makeMockCampaign({ status: 'SCHEDULED', scheduledAt: futureDate }),
      );

      const result = await service.schedule(CAMPAIGN_ID, TENANT_ID, futureDate);

      expect(result).toBeDefined();
      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SCHEDULED' }),
        }),
      );
    });

    it('should reject past date', async () => {
      prisma.campaign.findFirst.mockResolvedValue(makeMockCampaign());
      const pastDate = new Date('2020-01-01');

      await expect(service.schedule(CAMPAIGN_ID, TENANT_ID, pastDate)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('send', () => {
    it('should send a DRAFT campaign', async () => {
      prisma.campaign.findFirst.mockResolvedValue(makeMockCampaign());
      prisma.customer.count.mockResolvedValue(50);
      prisma.campaign.update.mockResolvedValue(makeMockCampaign({ status: 'SENDING' }));

      const result = await service.send(CAMPAIGN_ID, TENANT_ID);

      expect(result).toBeDefined();
      expect(prisma.campaign.update).toHaveBeenCalledTimes(2); // SENDING then SENT
    });

    it('should reject sending already-SENT campaign', async () => {
      prisma.campaign.findFirst.mockResolvedValue(makeMockCampaign({ status: 'SENT' }));

      await expect(service.send(CAMPAIGN_ID, TENANT_ID)).rejects.toThrow();
    });
  });

  describe('previewRecipients', () => {
    it('should return recipient count and sample', async () => {
      prisma.customer.count.mockResolvedValue(100);
      prisma.customer.findMany.mockResolvedValue([{ id: '1' }, { id: '2' }]);

      const result = await service.previewRecipients(TENANT_ID);

      expect(result.count).toBe(100);
      expect(result.sample).toHaveLength(2);
    });

    it('should filter inactive customers for INACTIVE_6M', async () => {
      prisma.customer.count.mockResolvedValue(25);
      prisma.customer.findMany.mockResolvedValue([]);

      const result = await service.previewRecipients(TENANT_ID, 'INACTIVE_6M');

      expect(result.count).toBe(25);
      expect(prisma.customer.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            marketingConsent: true,
            updatedAt: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should calculate rates correctly', async () => {
      prisma.campaign.findFirst.mockResolvedValue(
        makeMockCampaign({ totalSent: 100, totalOpened: 40, totalClicked: 10 }),
      );

      const stats = await service.getStats(CAMPAIGN_ID, TENANT_ID);

      expect(stats.openRate).toBe(40);
      expect(stats.clickRate).toBe(10);
    });

    it('should return 0 rates for unsent campaign', async () => {
      prisma.campaign.findFirst.mockResolvedValue(makeMockCampaign());

      const stats = await service.getStats(CAMPAIGN_ID, TENANT_ID);

      expect(stats.openRate).toBe(0);
      expect(stats.clickRate).toBe(0);
    });
  });

  describe('tenant isolation', () => {
    it('should only query campaigns for given tenant', async () => {
      prisma.campaign.findFirst.mockResolvedValue(null);

      await expect(service.findOne(CAMPAIGN_ID, 'other-tenant')).rejects.toThrow(NotFoundException);

      expect(prisma.campaign.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'other-tenant' }),
        }),
      );
    });
  });
});
