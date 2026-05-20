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
      updateMany: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
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
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
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
      prisma.campaign.findFirst
        .mockResolvedValueOnce(makeMockCampaign())
        .mockResolvedValueOnce(makeMockCampaign({ name: 'Updated' }));
      prisma.campaign.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.update(CAMPAIGN_ID, TENANT_ID, { name: 'Updated' });

      expect(result).toBeDefined();
      expect(prisma.campaign.updateMany).toHaveBeenCalled();
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
      prisma.campaign.deleteMany.mockResolvedValue({ count: 1 });

      await service.remove(CAMPAIGN_ID, TENANT_ID);

      expect(prisma.campaign.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: CAMPAIGN_ID, tenantId: TENANT_ID } }),
      );
    });

    it('should reject delete on non-DRAFT campaign', async () => {
      prisma.campaign.findFirst.mockResolvedValue(makeMockCampaign({ status: 'SENT' }));

      await expect(service.remove(CAMPAIGN_ID, TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('schedule', () => {
    it('should schedule a DRAFT campaign', async () => {
      prisma.campaign.findFirst
        .mockResolvedValueOnce(makeMockCampaign())
        .mockResolvedValueOnce(
          makeMockCampaign({ status: 'SCHEDULED', scheduledAt: new Date('2027-01-01T10:00:00Z') }),
        );
      const futureDate = new Date('2027-01-01T10:00:00Z');
      prisma.campaign.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.schedule(CAMPAIGN_ID, TENANT_ID, futureDate);

      expect(result).toBeDefined();
      expect(prisma.campaign.updateMany).toHaveBeenCalledWith(
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
      prisma.campaign.findFirst
        .mockResolvedValueOnce(makeMockCampaign())
        .mockResolvedValueOnce(makeMockCampaign({ status: 'SENDING' }));
      prisma.customer.count.mockResolvedValue(50);
      prisma.campaign.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.send(CAMPAIGN_ID, TENANT_ID);

      expect(result).toBeDefined();
      expect(prisma.campaign.updateMany).toHaveBeenCalledTimes(2); // SENDING then SENT
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

  describe('create — additional branches', () => {
    it('should serialize segmentFilters as JSON', async () => {
      const dto = {
        name: 'Segment Campaign',
        type: 'SMS' as const,
        template: 'Ciao {{nomeCliente}}',
        segmentFilters: { minAge: 30, city: 'Roma' },
      };
      prisma.campaign.create.mockResolvedValue(makeMockCampaign(dto));

      await service.create(TENANT_ID, dto);

      expect(prisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            segmentFilters: { minAge: 30, city: 'Roma' },
          }),
        }),
      );
    });

    it('should parse scheduledAt as Date', async () => {
      const dto = {
        name: 'Scheduled',
        type: 'EMAIL' as const,
        template: 'Test',
        scheduledAt: '2027-06-01T10:00:00Z',
      };
      prisma.campaign.create.mockResolvedValue(makeMockCampaign(dto));

      await service.create(TENANT_ID, dto);

      expect(prisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scheduledAt: new Date('2027-06-01T10:00:00Z'),
          }),
        }),
      );
    });

    it('should set subject to null when not provided', async () => {
      const dto = {
        name: 'No Subject',
        type: 'SMS' as const,
        template: 'Test',
      };
      prisma.campaign.create.mockResolvedValue(makeMockCampaign(dto));

      await service.create(TENANT_ID, dto);

      expect(prisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subject: null,
          }),
        }),
      );
    });
  });

  describe('update — additional branches', () => {
    it('should set subject to null when passed explicitly', async () => {
      prisma.campaign.findFirst
        .mockResolvedValueOnce(makeMockCampaign())
        .mockResolvedValueOnce(makeMockCampaign({ subject: null }));
      prisma.campaign.updateMany.mockResolvedValue({ count: 1 });

      await service.update(CAMPAIGN_ID, TENANT_ID, { subject: null as unknown as string });

      expect(prisma.campaign.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subject: null }),
        }),
      );
    });

    it('should set segmentFilters to undefined when null', async () => {
      prisma.campaign.findFirst
        .mockResolvedValueOnce(makeMockCampaign())
        .mockResolvedValueOnce(makeMockCampaign());
      prisma.campaign.updateMany.mockResolvedValue({ count: 1 });

      await service.update(CAMPAIGN_ID, TENANT_ID, {
        segmentFilters: null as unknown as undefined,
      });

      expect(prisma.campaign.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ segmentFilters: undefined }),
        }),
      );
    });

    it('should set segmentType to null when explicitly provided as null', async () => {
      prisma.campaign.findFirst
        .mockResolvedValueOnce(makeMockCampaign())
        .mockResolvedValueOnce(makeMockCampaign());
      prisma.campaign.updateMany.mockResolvedValue({ count: 1 });

      await service.update(CAMPAIGN_ID, TENANT_ID, { segmentType: null as unknown as string });

      expect(prisma.campaign.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ segmentType: null }),
        }),
      );
    });
  });

  describe('schedule — additional branches', () => {
    it('should reject schedule from SENT status (invalid transition)', async () => {
      prisma.campaign.findFirst.mockResolvedValue(makeMockCampaign({ status: 'SENT' }));

      const futureDate = new Date('2027-06-01T10:00:00Z');
      await expect(service.schedule(CAMPAIGN_ID, TENANT_ID, futureDate)).rejects.toThrow();
    });

    it('should reject schedule from CANCELLED status', async () => {
      prisma.campaign.findFirst.mockResolvedValue(makeMockCampaign({ status: 'CANCELLED' }));

      const futureDate = new Date('2027-06-01T10:00:00Z');
      await expect(service.schedule(CAMPAIGN_ID, TENANT_ID, futureDate)).rejects.toThrow();
    });
  });

  describe('send — additional branches', () => {
    it('should resolve recipient count with INACTIVE_6M segment', async () => {
      prisma.campaign.findFirst
        .mockResolvedValueOnce(makeMockCampaign({ segmentType: 'INACTIVE_6M' }))
        .mockResolvedValueOnce(makeMockCampaign({ status: 'SENDING' }));
      prisma.customer.count.mockResolvedValue(25);
      prisma.campaign.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.send(CAMPAIGN_ID, TENANT_ID);

      expect(result).toBeDefined();
      expect(prisma.customer.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            marketingConsent: true,
            updatedAt: expect.any(Object),
          }),
        }),
      );
    });

    it('should resolve recipient count without segment (all consented)', async () => {
      prisma.campaign.findFirst
        .mockResolvedValueOnce(makeMockCampaign({ segmentType: null }))
        .mockResolvedValueOnce(makeMockCampaign({ status: 'SENDING' }));
      prisma.customer.count.mockResolvedValue(100);
      prisma.campaign.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.send(CAMPAIGN_ID, TENANT_ID);

      expect(result).toBeDefined();
      expect(prisma.customer.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, marketingConsent: true },
        }),
      );
    });

    it('should reject send from CANCELLED status', async () => {
      prisma.campaign.findFirst.mockResolvedValue(makeMockCampaign({ status: 'CANCELLED' }));

      await expect(service.send(CAMPAIGN_ID, TENANT_ID)).rejects.toThrow();
    });
  });

  describe('findAll — additional branches', () => {
    it('should paginate with custom page and limit', async () => {
      prisma.campaign.findMany.mockResolvedValue([]);
      prisma.campaign.count.mockResolvedValue(50);

      const result = await service.findAll(TENANT_ID, undefined, 3, 10);

      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.pages).toBe(5);
      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  describe('previewRecipients — additional branches', () => {
    it('should return all consented customers when no segment', async () => {
      prisma.customer.count.mockResolvedValue(200);
      prisma.customer.findMany.mockResolvedValue([]);

      const result = await service.previewRecipients(TENANT_ID);

      expect(result.count).toBe(200);
      expect(prisma.customer.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, marketingConsent: true },
        }),
      );
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
