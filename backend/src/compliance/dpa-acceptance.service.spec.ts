import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DpaAcceptanceService, RecordDpaAcceptanceInput } from './dpa-acceptance.service';
import { PrismaService } from '@common/services/prisma.service';

const TENANT_ID = 'tenant-001';
const DPA_VERSION = '1.0';
const IP_ADDRESS = '192.168.1.1';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

function mockDpaAcceptance(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'dpa-acceptance-001',
    tenantId: TENANT_ID,
    version: DPA_VERSION,
    acceptedAt: new Date(),
    ipAddress: IP_ADDRESS,
    userAgent: USER_AGENT,
    ...overrides,
  };
}

describe('DpaAcceptanceService', () => {
  let service: DpaAcceptanceService;
  let prisma: {
    dpaAcceptance: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      dpaAcceptance: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DpaAcceptanceService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(DpaAcceptanceService);
  });

  describe('recordAcceptance', () => {
    it('should record DPA acceptance with all fields', async () => {
      const input: RecordDpaAcceptanceInput = {
        tenantId: TENANT_ID,
        version: DPA_VERSION,
        ipAddress: IP_ADDRESS,
        userAgent: USER_AGENT,
      };
      const expected = mockDpaAcceptance();
      prisma.dpaAcceptance.create.mockResolvedValue(expected);

      const result = await service.recordAcceptance(input);

      expect(result).toEqual(expected);
      expect(prisma.dpaAcceptance.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          version: DPA_VERSION,
          acceptedAt: expect.any(Date),
          ipAddress: IP_ADDRESS,
          userAgent: USER_AGENT,
        },
      });
    });

    it('should record DPA acceptance without userAgent', async () => {
      const input: RecordDpaAcceptanceInput = {
        tenantId: TENANT_ID,
        version: DPA_VERSION,
        ipAddress: IP_ADDRESS,
      };
      const expected = mockDpaAcceptance({ userAgent: null });
      prisma.dpaAcceptance.create.mockResolvedValue(expected);

      const result = await service.recordAcceptance(input);

      expect(result).toEqual(expected);
      const createCall = (prisma.dpaAcceptance.create as jest.Mock).mock.calls[0];
      expect(createCall[0].data.userAgent).toBeNull();
    });

    it('should reject if tenantId is missing', async () => {
      const input = {
        version: DPA_VERSION,
        ipAddress: IP_ADDRESS,
      } as unknown as RecordDpaAcceptanceInput;

      await expect(service.recordAcceptance(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject if version is missing', async () => {
      const input = {
        tenantId: TENANT_ID,
        ipAddress: IP_ADDRESS,
      } as unknown as RecordDpaAcceptanceInput;

      await expect(service.recordAcceptance(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject if ipAddress is missing', async () => {
      const input = {
        tenantId: TENANT_ID,
        version: DPA_VERSION,
      } as unknown as RecordDpaAcceptanceInput;

      await expect(service.recordAcceptance(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject if version is empty string', async () => {
      const input: RecordDpaAcceptanceInput = {
        tenantId: TENANT_ID,
        version: '',
        ipAddress: IP_ADDRESS,
      };

      await expect(service.recordAcceptance(input)).rejects.toThrow(BadRequestException);
    });

    it('should set acceptedAt to current timestamp', async () => {
      const input: RecordDpaAcceptanceInput = {
        tenantId: TENANT_ID,
        version: DPA_VERSION,
        ipAddress: IP_ADDRESS,
      };
      const nowBefore = Date.now();
      prisma.dpaAcceptance.create.mockResolvedValue(mockDpaAcceptance());

      await service.recordAcceptance(input);

      const createCall = (prisma.dpaAcceptance.create as jest.Mock).mock.calls[0];
      const acceptedAt = createCall[0].data.acceptedAt;
      const nowAfter = Date.now();

      expect(acceptedAt.getTime()).toBeGreaterThanOrEqual(nowBefore);
      expect(acceptedAt.getTime()).toBeLessThanOrEqual(nowAfter);
    });
  });

  describe('getLatestAcceptance', () => {
    it('should return latest DPA acceptance for tenant', async () => {
      const expected = mockDpaAcceptance({ acceptedAt: new Date() });
      prisma.dpaAcceptance.findFirst.mockResolvedValue(expected);

      const result = await service.getLatestAcceptance(TENANT_ID);

      expect(result).toEqual(expected);
      expect(prisma.dpaAcceptance.findFirst).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { acceptedAt: 'desc' },
      });
    });

    it('should return null if no acceptance found', async () => {
      prisma.dpaAcceptance.findFirst.mockResolvedValue(null);

      const result = await service.getLatestAcceptance(TENANT_ID);

      expect(result).toBeNull();
    });

    it('should reject if tenantId is missing', async () => {
      await expect(service.getLatestAcceptance('')).rejects.toThrow(BadRequestException);
    });

    it('should order by acceptedAt descending to get latest', async () => {
      const older = mockDpaAcceptance({ acceptedAt: new Date(Date.now() - 1000) });
      const newer = mockDpaAcceptance({ acceptedAt: new Date() });
      prisma.dpaAcceptance.findFirst.mockResolvedValue(newer);

      await service.getLatestAcceptance(TENANT_ID);

      const findCall = (prisma.dpaAcceptance.findFirst as jest.Mock).mock.calls[0];
      expect(findCall[0].orderBy).toEqual({ acceptedAt: 'desc' });
    });
  });

  describe('hasAcceptedVersion', () => {
    it('should return true if tenant has accepted specific version', async () => {
      const acceptance = mockDpaAcceptance({ version: '2.0' });
      prisma.dpaAcceptance.findFirst.mockResolvedValue(acceptance);

      const result = await service.hasAcceptedVersion(TENANT_ID, '2.0');

      expect(result).toBe(true);
      expect(prisma.dpaAcceptance.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          version: '2.0',
        },
      });
    });

    it('should return false if tenant has not accepted version', async () => {
      prisma.dpaAcceptance.findFirst.mockResolvedValue(null);

      const result = await service.hasAcceptedVersion(TENANT_ID, '2.0');

      expect(result).toBe(false);
    });

    it('should reject if tenantId is missing', async () => {
      await expect(service.hasAcceptedVersion('', '1.0')).rejects.toThrow(BadRequestException);
    });

    it('should reject if version is missing', async () => {
      await expect(service.hasAcceptedVersion(TENANT_ID, '')).rejects.toThrow(BadRequestException);
    });

    it('should differentiate between versions', async () => {
      prisma.dpaAcceptance.findFirst.mockResolvedValue(null);

      const result1 = await service.hasAcceptedVersion(TENANT_ID, '1.0');
      const result2 = await service.hasAcceptedVersion(TENANT_ID, '2.0');

      expect(result1).toBe(false);
      expect(result2).toBe(false);

      const call1 = (prisma.dpaAcceptance.findFirst as jest.Mock).mock.calls[0];
      const call2 = (prisma.dpaAcceptance.findFirst as jest.Mock).mock.calls[1];

      expect(call1[0].where.version).toBe('1.0');
      expect(call2[0].where.version).toBe('2.0');
    });
  });

  describe('listAcceptances', () => {
    it('should return paginated DPA acceptances for tenant', async () => {
      const acceptances = [
        mockDpaAcceptance({ id: 'dpa-001' }),
        mockDpaAcceptance({ id: 'dpa-002' }),
      ];
      prisma.dpaAcceptance.findMany.mockResolvedValue(acceptances);
      prisma.dpaAcceptance.count.mockResolvedValue(2);

      const result = await service.listAcceptances(TENANT_ID, 1, 20);

      expect(result).toEqual({
        data: acceptances,
        total: 2,
        page: 1,
        limit: 20,
      });
      expect(prisma.dpaAcceptance.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { acceptedAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should respect pagination parameters', async () => {
      prisma.dpaAcceptance.findMany.mockResolvedValue([]);
      prisma.dpaAcceptance.count.mockResolvedValue(100);

      await service.listAcceptances(TENANT_ID, 3, 10);

      const findCall = (prisma.dpaAcceptance.findMany as jest.Mock).mock.calls[0];
      expect(findCall[0].skip).toBe(20); // (3-1)*10
      expect(findCall[0].take).toBe(10);
    });

    it('should return default pagination if not specified', async () => {
      prisma.dpaAcceptance.findMany.mockResolvedValue([]);
      prisma.dpaAcceptance.count.mockResolvedValue(0);

      const result = await service.listAcceptances(TENANT_ID);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should reject if tenantId is missing', async () => {
      await expect(service.listAcceptances('')).rejects.toThrow(BadRequestException);
    });

    it('should isolate acceptances per tenant', async () => {
      const tenant1Acceptances = [mockDpaAcceptance({ tenantId: 'tenant-001' })];
      prisma.dpaAcceptance.findMany.mockResolvedValue(tenant1Acceptances);
      prisma.dpaAcceptance.count.mockResolvedValue(1);

      await service.listAcceptances('tenant-001', 1, 20);

      const findCall = (prisma.dpaAcceptance.findMany as jest.Mock).mock.calls[0];
      expect(findCall[0].where.tenantId).toBe('tenant-001');
    });

    it('should order by acceptedAt descending', async () => {
      prisma.dpaAcceptance.findMany.mockResolvedValue([]);
      prisma.dpaAcceptance.count.mockResolvedValue(0);

      await service.listAcceptances(TENANT_ID);

      const findCall = (prisma.dpaAcceptance.findMany as jest.Mock).mock.calls[0];
      expect(findCall[0].orderBy).toEqual({ acceptedAt: 'desc' });
    });

    it('should handle zero acceptances gracefully', async () => {
      prisma.dpaAcceptance.findMany.mockResolvedValue([]);
      prisma.dpaAcceptance.count.mockResolvedValue(0);

      const result = await service.listAcceptances(TENANT_ID);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('GDPR compliance (H11 fix)', () => {
    it('should track IP address for GDPR audit trail', async () => {
      const input: RecordDpaAcceptanceInput = {
        tenantId: TENANT_ID,
        version: '1.0',
        ipAddress: '203.0.113.45',
      };
      prisma.dpaAcceptance.create.mockResolvedValue(mockDpaAcceptance());

      await service.recordAcceptance(input);

      const createCall = (prisma.dpaAcceptance.create as jest.Mock).mock.calls[0];
      expect(createCall[0].data.ipAddress).toBe('203.0.113.45');
    });

    it('should track user agent for audit trail', async () => {
      const input: RecordDpaAcceptanceInput = {
        tenantId: TENANT_ID,
        version: '1.0',
        ipAddress: IP_ADDRESS,
        userAgent: 'Custom-Bot/2.0',
      };
      prisma.dpaAcceptance.create.mockResolvedValue(mockDpaAcceptance());

      await service.recordAcceptance(input);

      const createCall = (prisma.dpaAcceptance.create as jest.Mock).mock.calls[0];
      expect(createCall[0].data.userAgent).toBe('Custom-Bot/2.0');
    });

    it('should record timestamp for compliance audits', async () => {
      const input: RecordDpaAcceptanceInput = {
        tenantId: TENANT_ID,
        version: '1.0',
        ipAddress: IP_ADDRESS,
      };
      prisma.dpaAcceptance.create.mockResolvedValue(mockDpaAcceptance());

      await service.recordAcceptance(input);

      const createCall = (prisma.dpaAcceptance.create as jest.Mock).mock.calls[0];
      expect(createCall[0].data.acceptedAt).toBeInstanceOf(Date);
    });

    it('should enforce tenantId isolation for GDPR data separation', async () => {
      const tenant1Acceptance = mockDpaAcceptance({ tenantId: 'tenant-001' });
      const tenant2Acceptance = mockDpaAcceptance({ tenantId: 'tenant-002' });

      prisma.dpaAcceptance.findFirst.mockResolvedValueOnce(tenant1Acceptance);
      prisma.dpaAcceptance.findFirst.mockResolvedValueOnce(tenant2Acceptance);

      const result1 = await service.getLatestAcceptance('tenant-001');
      const result2 = await service.getLatestAcceptance('tenant-002');

      expect(result1?.tenantId).toBe('tenant-001');
      expect(result2?.tenantId).toBe('tenant-002');
      expect(result1?.tenantId).not.toBe(result2?.tenantId);
    });
  });
});
