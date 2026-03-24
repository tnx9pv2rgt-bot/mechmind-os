import { Test, TestingModule } from '@nestjs/testing';
import { SecurityActivityService, SecurityEventType } from './security-activity.service';
import { PrismaService } from '@common/services/prisma.service';

describe('SecurityActivityService', () => {
  let service: SecurityActivityService;
  let prisma: {
    authAuditLog: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
    };
    device: {
      findMany: jest.Mock;
    };
  };

  const mockTenantId = 'tenant-abc';
  const mockUserId = 'user-123';

  beforeEach(async () => {
    prisma = {
      authAuditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      device: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityActivityService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<SecurityActivityService>(SecurityActivityService);
  });

  describe('logEvent', () => {
    it('should create an audit log entry', async () => {
      prisma.authAuditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.logEvent({
        tenantId: mockTenantId,
        userId: mockUserId,
        action: SecurityEventType.LOGIN_SUCCESS,
        status: 'success',
        ipAddress: '1.2.3.4',
        userAgent: 'Chrome/120',
      });

      expect(prisma.authAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          userId: mockUserId,
          action: 'login_success',
          status: 'success',
          ipAddress: '1.2.3.4',
          userAgent: 'Chrome/120',
        }),
      });
    });

    it('should log event without userId', async () => {
      prisma.authAuditLog.create.mockResolvedValue({ id: 'log-2' });

      await service.logEvent({
        tenantId: mockTenantId,
        action: SecurityEventType.LOGIN_FAILED,
        status: 'failed',
      });

      expect(prisma.authAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          userId: undefined,
          action: 'login_failed',
          status: 'failed',
        }),
      });
    });

    it('should include details as JSON', async () => {
      prisma.authAuditLog.create.mockResolvedValue({ id: 'log-3' });

      await service.logEvent({
        tenantId: mockTenantId,
        userId: mockUserId,
        action: SecurityEventType.DEVICE_TRUSTED,
        status: 'success',
        details: { deviceId: 'dev-1', days: 30 },
      });

      expect(prisma.authAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: { deviceId: 'dev-1', days: 30 },
        }),
      });
    });
  });

  describe('getActivity', () => {
    const mockLogs = [
      {
        id: 'log-1',
        action: 'login_success',
        status: 'success',
        ipAddress: '1.2.3.4',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
        details: null,
        createdAt: new Date('2026-03-20T10:00:00Z'),
      },
      {
        id: 'log-2',
        action: 'login_failed',
        status: 'failed',
        ipAddress: '5.6.7.8',
        userAgent: null,
        details: { reason: 'invalid_password' },
        createdAt: new Date('2026-03-19T10:00:00Z'),
      },
    ];

    it('should return paginated events', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue(mockLogs);
      prisma.authAuditLog.count.mockResolvedValue(2);

      const result = await service.getActivity({
        tenantId: mockTenantId,
        userId: mockUserId,
        page: 1,
        limit: 20,
      });

      expect(result.events).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should parse device info from user agent', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([mockLogs[0]]);
      prisma.authAuditLog.count.mockResolvedValue(1);

      const result = await service.getActivity({
        tenantId: mockTenantId,
        userId: mockUserId,
      });

      expect(result.events[0].deviceInfo).toEqual({
        os: 'macOS',
        browser: 'Chrome',
        deviceType: 'desktop',
      });
    });

    it('should handle null user agent', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([mockLogs[1]]);
      prisma.authAuditLog.count.mockResolvedValue(1);

      const result = await service.getActivity({
        tenantId: mockTenantId,
        userId: mockUserId,
      });

      expect(result.events[0].deviceInfo).toBeNull();
    });

    it('should filter by event types', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([]);
      prisma.authAuditLog.count.mockResolvedValue(0);

      await service.getActivity({
        tenantId: mockTenantId,
        userId: mockUserId,
        eventTypes: [SecurityEventType.LOGIN_SUCCESS],
      });

      expect(prisma.authAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { in: [SecurityEventType.LOGIN_SUCCESS] },
          }),
        }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([]);
      prisma.authAuditLog.count.mockResolvedValue(55);

      const result = await service.getActivity({
        tenantId: mockTenantId,
        userId: mockUserId,
        page: 1,
        limit: 20,
      });

      expect(result.totalPages).toBe(3);
    });

    it('should default to page 1 and limit 20', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([]);
      prisma.authAuditLog.count.mockResolvedValue(0);

      const result = await service.getActivity({
        tenantId: mockTenantId,
        userId: mockUserId,
      });

      expect(result.page).toBe(1);
      expect(prisma.authAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should clamp limit to max 100', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([]);
      prisma.authAuditLog.count.mockResolvedValue(0);

      await service.getActivity({
        tenantId: mockTenantId,
        userId: mockUserId,
        limit: 500,
      });

      expect(prisma.authAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  describe('getActivitySummary', () => {
    it('should return summary stats for last 30 days', async () => {
      prisma.authAuditLog.count
        .mockResolvedValueOnce(15) // totalLogins
        .mockResolvedValueOnce(3) // failedAttempts
        .mockResolvedValueOnce(1); // suspiciousEvents
      prisma.device.findMany.mockResolvedValue([
        { lastLocationCity: 'Roma', lastLocationCountry: 'IT' },
        { lastLocationCity: 'Milano', lastLocationCountry: 'IT' },
      ]);
      prisma.authAuditLog.findFirst.mockResolvedValue({
        createdAt: new Date('2026-03-20T10:00:00Z'),
      });

      const result = await service.getActivitySummary(mockTenantId, mockUserId);

      expect(result.totalLogins).toBe(15);
      expect(result.failedAttempts).toBe(3);
      expect(result.devicesUsed).toBe(2);
      expect(result.locationsUsed).toContain('Roma, IT');
      expect(result.locationsUsed).toContain('Milano, IT');
      expect(result.lastLogin).toEqual(new Date('2026-03-20T10:00:00Z'));
      expect(result.suspiciousEvents).toBe(1);
    });

    it('should return null lastLogin if no login events', async () => {
      prisma.authAuditLog.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      prisma.device.findMany.mockResolvedValue([]);
      prisma.authAuditLog.findFirst.mockResolvedValue(null);

      const result = await service.getActivitySummary(mockTenantId, mockUserId);

      expect(result.totalLogins).toBe(0);
      expect(result.lastLogin).toBeNull();
      expect(result.locationsUsed).toEqual([]);
    });

    it('should deduplicate locations', async () => {
      prisma.authAuditLog.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      prisma.device.findMany.mockResolvedValue([
        { lastLocationCity: 'Roma', lastLocationCountry: 'IT' },
        { lastLocationCity: 'Roma', lastLocationCountry: 'IT' },
        { lastLocationCity: null, lastLocationCountry: 'IT' },
      ]);
      prisma.authAuditLog.findFirst.mockResolvedValue({
        createdAt: new Date(),
      });

      const result = await service.getActivitySummary(mockTenantId, mockUserId);

      expect(result.locationsUsed).toEqual(['Roma, IT', 'IT']);
    });
  });
});
