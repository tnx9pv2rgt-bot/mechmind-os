import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SessionService } from './session.service';
import { PrismaService } from '@common/services/prisma.service';
import { TokenBlacklistService } from './token-blacklist.service';

describe('SessionService', () => {
  let service: SessionService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let tokenBlacklist: { blacklistToken: jest.Mock; invalidateAllUserSessions: jest.Mock };

  beforeEach(async () => {
    prisma = {
      device: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    tokenBlacklist = {
      blacklistToken: jest.fn().mockResolvedValue(undefined),
      invalidateAllUserSessions: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokenBlacklistService, useValue: tokenBlacklist },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // createSession()
  // =========================================================================
  describe('createSession', () => {
    const sessionParams = {
      userId: 'u1',
      jwtToken: 'jwt-access',
      refreshToken: 'jwt-refresh',
      ipAddress: '192.168.1.1',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    it('should create a new device and session when device does not exist', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.create.mockResolvedValue({ id: 'device-1' });
      prisma.session.create.mockResolvedValue({ id: 'session-1' });

      const result = await service.createSession(sessionParams);

      expect(result).toBe('session-1');
      expect(prisma.device.findFirst).toHaveBeenCalledWith({
        where: { userId: 'u1', fingerprint: expect.any(String) },
      });
      expect(prisma.device.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          deviceName: expect.any(String),
          deviceType: 'desktop',
          fingerprint: expect.any(String),
          lastIpAddress: '192.168.1.1',
        }),
      });
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          jwtToken: 'jwt-access',
          refreshToken: 'jwt-refresh',
          deviceId: 'device-1',
          ipAddress: '192.168.1.1',
          isActive: true,
        }),
      });
    });

    it('should update existing device and create session when device already exists', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: 'device-existing' });
      prisma.device.update.mockResolvedValue({ id: 'device-existing' });
      prisma.session.create.mockResolvedValue({ id: 'session-2' });

      const result = await service.createSession(sessionParams);

      expect(result).toBe('session-2');
      expect(prisma.device.create).not.toHaveBeenCalled();
      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: 'device-existing' },
        data: expect.objectContaining({
          lastIpAddress: '192.168.1.1',
          lastLoginAt: expect.any(Date),
        }),
      });
    });

    it('should detect Chrome browser from User-Agent', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.create.mockResolvedValue({ id: 'd1' });
      prisma.session.create.mockResolvedValue({ id: 's1' });

      await service.createSession(sessionParams);

      const createCall = prisma.device.create.mock.calls[0][0].data;
      expect(createCall.deviceName).toContain('Chrome');
      expect(createCall.deviceName).toContain('macOS');
    });

    it('should detect iPhone user agent', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.create.mockResolvedValue({ id: 'd1' });
      prisma.session.create.mockResolvedValue({ id: 's1' });

      await service.createSession({
        ...sessionParams,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      });

      const createCall = prisma.device.create.mock.calls[0][0].data;
      expect(createCall.deviceType).toBe('phone');
      expect(createCall.osType).toBe('iOS');
    });

    it('should detect iPad user agent', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.create.mockResolvedValue({ id: 'd1' });
      prisma.session.create.mockResolvedValue({ id: 's1' });

      await service.createSession({
        ...sessionParams,
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
      });

      const createCall = prisma.device.create.mock.calls[0][0].data;
      expect(createCall.deviceType).toBe('tablet');
      expect(createCall.osType).toBe('iPadOS');
    });

    it('should detect Android phone user agent', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.create.mockResolvedValue({ id: 'd1' });
      prisma.session.create.mockResolvedValue({ id: 's1' });

      await service.createSession({
        ...sessionParams,
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      });

      const createCall = prisma.device.create.mock.calls[0][0].data;
      expect(createCall.deviceType).toBe('phone');
      expect(createCall.osType).toBe('Android');
    });

    it('should detect Android tablet user agent (no Mobile)', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.create.mockResolvedValue({ id: 'd1' });
      prisma.session.create.mockResolvedValue({ id: 's1' });

      await service.createSession({
        ...sessionParams,
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; SM-X800) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const createCall = prisma.device.create.mock.calls[0][0].data;
      expect(createCall.deviceType).toBe('tablet');
    });

    it('should detect Edge browser', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.create.mockResolvedValue({ id: 'd1' });
      prisma.session.create.mockResolvedValue({ id: 's1' });

      await service.createSession({
        ...sessionParams,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      });

      const createCall = prisma.device.create.mock.calls[0][0].data;
      expect(createCall.browserType).toBe('Microsoft Edge');
      expect(createCall.osType).toBe('Windows');
    });

    it('should detect Firefox browser', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.create.mockResolvedValue({ id: 'd1' });
      prisma.session.create.mockResolvedValue({ id: 's1' });

      await service.createSession({
        ...sessionParams,
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
      });

      const createCall = prisma.device.create.mock.calls[0][0].data;
      expect(createCall.browserType).toBe('Firefox');
      expect(createCall.osType).toBe('Linux');
    });

    it('should detect Opera browser', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.create.mockResolvedValue({ id: 'd1' });
      prisma.session.create.mockResolvedValue({ id: 's1' });

      await service.createSession({
        ...sessionParams,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 OPR/120.0',
      });

      const createCall = prisma.device.create.mock.calls[0][0].data;
      expect(createCall.browserType).toBe('Opera');
    });

    it('should detect Safari browser (no Chrome marker)', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.create.mockResolvedValue({ id: 'd1' });
      prisma.session.create.mockResolvedValue({ id: 's1' });

      await service.createSession({
        ...sessionParams,
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      });

      const createCall = prisma.device.create.mock.calls[0][0].data;
      expect(createCall.browserType).toBe('Safari');
    });

    it('should detect ChromeOS', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.create.mockResolvedValue({ id: 'd1' });
      prisma.session.create.mockResolvedValue({ id: 's1' });

      await service.createSession({
        ...sessionParams,
        userAgent:
          'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      });

      const createCall = prisma.device.create.mock.calls[0][0].data;
      expect(createCall.osType).toBe('ChromeOS');
    });

    it('should handle unknown browser and OS', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.create.mockResolvedValue({ id: 'd1' });
      prisma.session.create.mockResolvedValue({ id: 's1' });

      await service.createSession({
        ...sessionParams,
        userAgent: 'CustomBot/1.0',
      });

      const createCall = prisma.device.create.mock.calls[0][0].data;
      expect(createCall.browserType).toBe('Browser sconosciuto');
      expect(createCall.osType).toBe('Sistema sconosciuto');
      expect(createCall.deviceType).toBe('desktop');
    });

    it('should handle empty user agent string', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.create.mockResolvedValue({ id: 'd1' });
      prisma.session.create.mockResolvedValue({ id: 's1' });

      await service.createSession({
        ...sessionParams,
        userAgent: '',
      });

      const createCall = prisma.device.create.mock.calls[0][0].data;
      expect(createCall.deviceName).toContain('Browser sconosciuto');
    });
  });

  // =========================================================================
  // listSessions()
  // =========================================================================
  describe('listSessions', () => {
    it('should return mapped sessions with device info', async () => {
      const now = new Date();
      prisma.session.findMany.mockResolvedValue([
        {
          id: 's1',
          jwtToken: 'current-jwt',
          userAgent: 'Chrome on macOS',
          ipAddress: '1.2.3.4',
          lastUsedAt: now,
          createdAt: now,
          device: {
            deviceName: 'Chrome su macOS',
            deviceType: 'desktop',
            browserType: 'Chrome',
            osType: 'macOS',
            lastLocationCity: 'Roma',
            lastLocationCountry: 'IT',
          },
        },
      ]);

      const result = await service.listSessions('u1', 'current-jwt');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 's1',
        deviceName: 'Chrome su macOS',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'macOS',
        ipAddress: '1.2.3.4',
        city: 'Roma',
        country: 'IT',
        lastActiveAt: now,
        createdAt: now,
        isCurrent: true,
      });
    });

    it('should mark non-current session correctly', async () => {
      const now = new Date();
      prisma.session.findMany.mockResolvedValue([
        {
          id: 's1',
          jwtToken: 'other-jwt',
          userAgent: 'Firefox',
          ipAddress: '1.2.3.4',
          lastUsedAt: now,
          createdAt: now,
          device: {
            deviceName: 'Firefox su Linux',
            deviceType: 'desktop',
            browserType: 'Firefox',
            osType: 'Linux',
            lastLocationCity: null,
            lastLocationCountry: null,
          },
        },
      ]);

      const result = await service.listSessions('u1', 'current-jwt');

      expect(result[0].isCurrent).toBe(false);
    });

    it('should fallback to user-agent parsing when device is null', async () => {
      const now = new Date();
      prisma.session.findMany.mockResolvedValue([
        {
          id: 's1',
          jwtToken: 'jwt',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          ipAddress: '1.2.3.4',
          lastUsedAt: now,
          createdAt: now,
          device: null,
        },
      ]);

      const result = await service.listSessions('u1');

      expect(result[0].deviceName).toContain('Chrome');
      expect(result[0].deviceType).toBe('desktop');
      expect(result[0].browser).toBeNull();
      expect(result[0].os).toBeNull();
      expect(result[0].city).toBeNull();
      expect(result[0].country).toBeNull();
    });

    it('should return empty array when no active sessions', async () => {
      prisma.session.findMany.mockResolvedValue([]);

      const result = await service.listSessions('u1');

      expect(result).toEqual([]);
    });

    it('should query only active and non-expired sessions', async () => {
      prisma.session.findMany.mockResolvedValue([]);

      await service.listSessions('u1');

      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'u1',
          isActive: true,
          expiresAt: { gt: expect.any(Date) },
        },
        include: { device: true },
        orderBy: { lastUsedAt: 'desc' },
      });
    });
  });

  // =========================================================================
  // revokeSession()
  // =========================================================================
  describe('revokeSession', () => {
    it('should revoke session and blacklist JWT when session is found', async () => {
      // Create a mock JWT with valid base64url parts
      const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({ jti: 'jwt-id-1', exp: Math.floor(Date.now() / 1000) + 3600 }),
      ).toString('base64url');
      const signature = 'fake-sig';
      const mockJwt = `${header}.${payload}.${signature}`;

      prisma.session.findFirst.mockResolvedValue({
        id: 's1',
        jwtToken: mockJwt,
      });
      prisma.session.update.mockResolvedValue({});

      await service.revokeSession('u1', 's1');

      expect(prisma.session.findFirst).toHaveBeenCalledWith({
        where: { id: 's1', userId: 'u1', isActive: true },
      });
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
          revokedReason: 'user_revoked',
        },
      });
      expect(tokenBlacklist.blacklistToken).toHaveBeenCalledWith('jwt-id-1', expect.any(Number));
    });

    it('should throw NotFoundException when session is not found', async () => {
      prisma.session.findFirst.mockResolvedValue(null);

      await expect(service.revokeSession('u1', 's-nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.revokeSession('u1', 's-nonexistent')).rejects.toThrow(
        'Sessione non trovata',
      );
    });

    it('should not blacklist token when JWT parsing fails', async () => {
      prisma.session.findFirst.mockResolvedValue({
        id: 's1',
        jwtToken: 'not-a-valid-jwt',
      });
      prisma.session.update.mockResolvedValue({});

      // Should not throw even if JWT parsing fails
      await service.revokeSession('u1', 's1');

      expect(prisma.session.update).toHaveBeenCalled();
      // blacklistToken not called because JWT parsing failed
      expect(tokenBlacklist.blacklistToken).not.toHaveBeenCalled();
    });

    it('should not blacklist token when ttl is zero or negative (already expired)', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({ jti: 'jwt-id-1', exp: Math.floor(Date.now() / 1000) - 100 }),
      ).toString('base64url');
      const mockJwt = `${header}.${payload}.fake-sig`;

      prisma.session.findFirst.mockResolvedValue({ id: 's1', jwtToken: mockJwt });
      prisma.session.update.mockResolvedValue({});

      await service.revokeSession('u1', 's1');

      expect(tokenBlacklist.blacklistToken).not.toHaveBeenCalled();
    });

    it('should not blacklist when JWT has no jti', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
      ).toString('base64url');
      const mockJwt = `${header}.${payload}.fake-sig`;

      prisma.session.findFirst.mockResolvedValue({ id: 's1', jwtToken: mockJwt });
      prisma.session.update.mockResolvedValue({});

      await service.revokeSession('u1', 's1');

      expect(tokenBlacklist.blacklistToken).not.toHaveBeenCalled();
    });

    it('should not blacklist when JWT payload has no exp', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ jti: 'jwt-id-1' })).toString('base64url');
      const mockJwt = `${header}.${payload}.fake-sig`;

      prisma.session.findFirst.mockResolvedValue({ id: 's1', jwtToken: mockJwt });
      prisma.session.update.mockResolvedValue({});

      await service.revokeSession('u1', 's1');

      expect(tokenBlacklist.blacklistToken).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // revokeAllOtherSessions()
  // =========================================================================
  describe('revokeAllOtherSessions', () => {
    it('should deactivate all sessions except current and invalidate user tokens', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.revokeAllOtherSessions('u1', 'current-session-id');

      expect(result).toBe(3);
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'u1',
          isActive: true,
          id: { not: 'current-session-id' },
        },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
          revokedReason: 'revoke_all_others',
        },
      });
      expect(tokenBlacklist.invalidateAllUserSessions).toHaveBeenCalledWith('u1');
    });

    it('should return 0 when no other sessions exist', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.revokeAllOtherSessions('u1', 'only-session');

      expect(result).toBe(0);
    });
  });

  // =========================================================================
  // touchSession()
  // =========================================================================
  describe('touchSession', () => {
    it('should update lastUsedAt for the active session', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 1 });

      await service.touchSession('jwt-token-123');

      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { jwtToken: 'jwt-token-123', isActive: true },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should not throw when update fails (non-blocking)', async () => {
      prisma.session.updateMany.mockRejectedValue(new Error('DB error'));

      await expect(service.touchSession('jwt-token-123')).resolves.toBeUndefined();
    });
  });
});
