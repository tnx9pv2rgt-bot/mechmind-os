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

    it('should handle device with only country (no city)', async () => {
      prisma.authAuditLog.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      prisma.device.findMany.mockResolvedValue([
        { lastLocationCity: null, lastLocationCountry: 'DE' },
      ]);
      prisma.authAuditLog.findFirst.mockResolvedValue({ createdAt: new Date() });

      const result = await service.getActivitySummary(mockTenantId, mockUserId);

      expect(result.locationsUsed).toEqual(['DE']);
    });

    it('should skip device with both city and country null', async () => {
      prisma.authAuditLog.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      prisma.device.findMany.mockResolvedValue([
        { lastLocationCity: null, lastLocationCountry: null },
      ]);
      prisma.authAuditLog.findFirst.mockResolvedValue({ createdAt: new Date() });

      const result = await service.getActivitySummary(mockTenantId, mockUserId);

      expect(result.locationsUsed).toEqual([]);
    });
  });

  // ============== parseDeviceInfo branches ==============

  describe('getActivity — parseDeviceInfo branches', () => {
    beforeEach(() => {
      prisma.authAuditLog.count.mockResolvedValue(1);
    });

    const makeLog = (userAgent: string | null) => ({
      id: 'log-x',
      action: 'login_success',
      status: 'success',
      ipAddress: '1.2.3.4',
      userAgent,
      details: null,
      createdAt: new Date(),
    });

    it('should detect Edge browser', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([
        makeLog('Mozilla/5.0 (Windows NT 10.0; Win64) Edg/120.0.0.0'),
      ]);

      const result = await service.getActivity({ tenantId: mockTenantId, userId: mockUserId });

      expect(result.events[0].deviceInfo).toEqual({
        os: 'Windows',
        browser: 'Edge',
        deviceType: 'desktop',
      });
    });

    it('should detect Safari browser (without Chrome)', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([
        makeLog('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'),
      ]);

      const result = await service.getActivity({ tenantId: mockTenantId, userId: mockUserId });

      expect(result.events[0].deviceInfo).toEqual({
        os: 'macOS',
        browser: 'Safari',
        deviceType: 'desktop',
      });
    });

    it('should detect Firefox browser', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([
        makeLog('Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Firefox/120.0'),
      ]);

      const result = await service.getActivity({ tenantId: mockTenantId, userId: mockUserId });

      expect(result.events[0].deviceInfo).toEqual({
        os: 'Linux',
        browser: 'Firefox',
        deviceType: 'desktop',
      });
    });

    it('should detect iPhone (iOS, phone)', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([
        makeLog('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1'),
      ]);

      const result = await service.getActivity({ tenantId: mockTenantId, userId: mockUserId });

      expect(result.events[0].deviceInfo).toEqual({
        os: 'iOS',
        browser: 'Safari',
        deviceType: 'phone',
      });
    });

    it('should detect iPad (iPadOS, tablet)', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([
        makeLog('Mozilla/5.0 (iPad; CPU OS 17_0) Safari/604.1'),
      ]);

      const result = await service.getActivity({ tenantId: mockTenantId, userId: mockUserId });

      expect(result.events[0].deviceInfo).toEqual({
        os: 'iPadOS',
        browser: 'Safari',
        deviceType: 'tablet',
      });
    });

    it('should detect Android phone (Mobile)', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([
        makeLog('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Chrome/120.0'),
      ]);

      const result = await service.getActivity({ tenantId: mockTenantId, userId: mockUserId });

      expect(result.events[0].deviceInfo).toEqual({
        os: 'Android',
        browser: 'Chrome',
        deviceType: 'phone',
      });
    });

    it('should detect Android tablet (no Mobile)', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([
        makeLog('Mozilla/5.0 (Linux; Android 14; SM-T970) Chrome/120.0'),
      ]);

      const result = await service.getActivity({ tenantId: mockTenantId, userId: mockUserId });

      expect(result.events[0].deviceInfo).toEqual({
        os: 'Android',
        browser: 'Chrome',
        deviceType: 'tablet',
      });
    });

    it('should detect Windows OS', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([
        makeLog('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'),
      ]);

      const result = await service.getActivity({ tenantId: mockTenantId, userId: mockUserId });

      expect(result.events[0].deviceInfo?.os).toBe('Windows');
    });

    it('should return unknown browser for unrecognized UA', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([makeLog('curl/7.81.0')]);

      const result = await service.getActivity({ tenantId: mockTenantId, userId: mockUserId });

      expect(result.events[0].deviceInfo).toEqual({
        os: 'unknown',
        browser: 'unknown',
        deviceType: 'desktop',
      });
    });
  });

  // ============== parseLocation branches ==============

  describe('getActivity — parseLocation branches', () => {
    beforeEach(() => {
      prisma.authAuditLog.count.mockResolvedValue(1);
    });

    it('should parse location from details with city and country', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([
        {
          id: 'log-loc',
          action: 'login_success',
          status: 'success',
          ipAddress: '1.2.3.4',
          userAgent: null,
          details: { city: 'Roma', country: 'IT' },
          createdAt: new Date(),
        },
      ]);

      const result = await service.getActivity({ tenantId: mockTenantId, userId: mockUserId });

      expect(result.events[0].location).toEqual({ city: 'Roma', country: 'IT' });
    });

    it('should return location with empty city when only country is present', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([
        {
          id: 'log-loc2',
          action: 'login_success',
          status: 'success',
          ipAddress: '1.2.3.4',
          userAgent: null,
          details: { country: 'DE' },
          createdAt: new Date(),
        },
      ]);

      const result = await service.getActivity({ tenantId: mockTenantId, userId: mockUserId });

      expect(result.events[0].location).toEqual({ city: '', country: 'DE' });
    });

    it('should return location with empty country when only city is present', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([
        {
          id: 'log-loc3',
          action: 'login_success',
          status: 'success',
          ipAddress: '1.2.3.4',
          userAgent: null,
          details: { city: 'Milano' },
          createdAt: new Date(),
        },
      ]);

      const result = await service.getActivity({ tenantId: mockTenantId, userId: mockUserId });

      expect(result.events[0].location).toEqual({ city: 'Milano', country: '' });
    });

    it('should return null location when details has neither city nor country', async () => {
      prisma.authAuditLog.findMany.mockResolvedValue([
        {
          id: 'log-loc4',
          action: 'login_success',
          status: 'success',
          ipAddress: '1.2.3.4',
          userAgent: null,
          details: { reason: 'something' },
          createdAt: new Date(),
        },
      ]);

      const result = await service.getActivity({ tenantId: mockTenantId, userId: mockUserId });

      expect(result.events[0].location).toBeNull();
    });
  });

  // ============== page/limit clamping ==============

  describe('getActivity — page/limit clamping', () => {
    beforeEach(() => {
      prisma.authAuditLog.findMany.mockResolvedValue([]);
      prisma.authAuditLog.count.mockResolvedValue(0);
    });

    it('should clamp page to minimum 1 when page < 1', async () => {
      const result = await service.getActivity({
        tenantId: mockTenantId,
        userId: mockUserId,
        page: -5,
      });

      expect(result.page).toBe(1);
      expect(prisma.authAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });

    it('should clamp limit to minimum 1 when limit < 1', async () => {
      await service.getActivity({
        tenantId: mockTenantId,
        userId: mockUserId,
        limit: 0,
      });

      expect(prisma.authAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });

    it('should skip eventTypes filter when array is empty', async () => {
      await service.getActivity({
        tenantId: mockTenantId,
        userId: mockUserId,
        eventTypes: [],
      });

      const callArg = prisma.authAuditLog.findMany.mock.calls[0][0];
      expect(callArg.where.action).toBeUndefined();
    });
  });
});
