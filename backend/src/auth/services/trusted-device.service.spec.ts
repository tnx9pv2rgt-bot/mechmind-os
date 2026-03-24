import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TrustedDeviceService } from './trusted-device.service';
import { PrismaService } from '@common/services/prisma.service';

describe('TrustedDeviceService', () => {
  let service: TrustedDeviceService;
  let prisma: {
    device: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    session: {
      updateMany: jest.Mock;
    };
  };

  const mockUserId = 'user-123';
  const mockDeviceId = 'device-456';
  const chromeOnMacUA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const firefoxOnWindowsUA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0';

  beforeEach(async () => {
    prisma = {
      device: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      session: {
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TrustedDeviceService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<TrustedDeviceService>(TrustedDeviceService);
  });

  describe('generateFingerprint', () => {
    it('should generate same hash for same input', () => {
      const fp1 = service.generateFingerprint(chromeOnMacUA, '1.2.3.4');
      const fp2 = service.generateFingerprint(chromeOnMacUA, '1.2.3.4');
      expect(fp1).toBe(fp2);
    });

    it('should generate different hash for different browser', () => {
      const fp1 = service.generateFingerprint(chromeOnMacUA, '1.2.3.4');
      const fp2 = service.generateFingerprint(firefoxOnWindowsUA, '1.2.3.4');
      expect(fp1).not.toBe(fp2);
    });

    it('should NOT vary by IP (IP is too volatile)', () => {
      const fp1 = service.generateFingerprint(chromeOnMacUA, '1.2.3.4');
      const fp2 = service.generateFingerprint(chromeOnMacUA, '5.6.7.8');
      expect(fp1).toBe(fp2);
    });

    it('should return a 32-char hex string', () => {
      const fp = service.generateFingerprint(chromeOnMacUA, '1.2.3.4');
      expect(fp).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should include extra fields in hash if provided', () => {
      const fp1 = service.generateFingerprint(chromeOnMacUA, '1.2.3.4');
      const fp2 = service.generateFingerprint(chromeOnMacUA, '1.2.3.4', {
        timezone: 'Europe/Rome',
      });
      expect(fp1).not.toBe(fp2);
    });
  });

  describe('findOrCreateDevice', () => {
    it('should return existing device if fingerprint matches', async () => {
      prisma.device.findFirst.mockResolvedValue({
        id: mockDeviceId,
        lastLocationCity: 'Roma',
        lastLocationCountry: 'IT',
        browserType: 'Chrome',
      });
      prisma.device.update.mockResolvedValue({});

      const result = await service.findOrCreateDevice({
        userId: mockUserId,
        userAgent: chromeOnMacUA,
        ipAddress: '1.2.3.4',
      });

      expect(result.isNew).toBe(false);
      expect(result.id).toBe(mockDeviceId);
      expect(prisma.device.update).toHaveBeenCalled();
    });

    it('should create new device if fingerprint not found', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.create.mockResolvedValue({
        id: 'new-device',
        fingerprint: 'abc123',
      });

      const result = await service.findOrCreateDevice({
        userId: mockUserId,
        userAgent: chromeOnMacUA,
        ipAddress: '1.2.3.4',
        locationCity: 'Milano',
        locationCountry: 'IT',
      });

      expect(result.isNew).toBe(true);
      expect(result.id).toBe('new-device');
      expect(prisma.device.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            osType: 'macOS',
            browserType: 'Chrome',
            deviceType: 'desktop',
            lastLocationCity: 'Milano',
            lastLocationCountry: 'IT',
          }),
        }),
      );
    });
  });

  describe('trustDevice', () => {
    it('should trust device for 30 days by default', async () => {
      prisma.device.findFirst.mockResolvedValue({
        id: mockDeviceId,
        isCompromised: false,
      });
      prisma.device.update.mockImplementation(({ data }) => {
        return Promise.resolve({ id: mockDeviceId, trustedUntil: data.trustedUntil });
      });

      const result = await service.trustDevice(mockDeviceId, mockUserId);

      expect(result.trustedUntil).toBeInstanceOf(Date);
      const diffDays = (result.trustedUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(30, 0);
    });

    it('should clamp days to max 90', async () => {
      prisma.device.findFirst.mockResolvedValue({
        id: mockDeviceId,
        isCompromised: false,
      });
      prisma.device.update.mockImplementation(({ data }) => {
        return Promise.resolve({ id: mockDeviceId, trustedUntil: data.trustedUntil });
      });

      const result = await service.trustDevice(mockDeviceId, mockUserId, 365);

      const diffDays = (result.trustedUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(90, 0);
    });

    it('should throw NotFoundException if device not found', async () => {
      prisma.device.findFirst.mockResolvedValue(null);

      await expect(service.trustDevice(mockDeviceId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if device is compromised', async () => {
      prisma.device.findFirst.mockResolvedValue({
        id: mockDeviceId,
        isCompromised: true,
      });

      await expect(service.trustDevice(mockDeviceId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('isDeviceTrusted', () => {
    it('should return true if trustedUntil is in the future', async () => {
      prisma.device.findFirst.mockResolvedValue({
        isCompromised: false,
        trustedUntil: new Date(Date.now() + 1000 * 60 * 60),
      });

      const result = await service.isDeviceTrusted(mockUserId, 'fp123');
      expect(result).toBe(true);
    });

    it('should return false if trustedUntil is in the past (expired)', async () => {
      prisma.device.findFirst.mockResolvedValue({
        isCompromised: false,
        trustedUntil: new Date(Date.now() - 1000),
      });

      const result = await service.isDeviceTrusted(mockUserId, 'fp123');
      expect(result).toBe(false);
    });

    it('should return false if device is compromised', async () => {
      prisma.device.findFirst.mockResolvedValue({
        isCompromised: true,
        trustedUntil: new Date(Date.now() + 1000 * 60 * 60),
      });

      const result = await service.isDeviceTrusted(mockUserId, 'fp123');
      expect(result).toBe(false);
    });

    it('should return false if trustedUntil is null', async () => {
      prisma.device.findFirst.mockResolvedValue({
        isCompromised: false,
        trustedUntil: null,
      });

      const result = await service.isDeviceTrusted(mockUserId, 'fp123');
      expect(result).toBe(false);
    });

    it('should return false if device not found', async () => {
      prisma.device.findFirst.mockResolvedValue(null);

      const result = await service.isDeviceTrusted(mockUserId, 'fp-unknown');
      expect(result).toBe(false);
    });
  });

  describe('listDevices', () => {
    it('should return devices with isTrusted flag computed', async () => {
      const now = new Date();
      prisma.device.findMany.mockResolvedValue([
        {
          id: 'd1',
          deviceName: 'Chrome su macOS',
          deviceType: 'desktop',
          osType: 'macOS',
          browserType: 'Chrome',
          lastLoginAt: now,
          lastIpAddress: '1.2.3.4',
          lastLocationCity: 'Roma',
          lastLocationCountry: 'IT',
          trustedUntil: new Date(now.getTime() + 86400000),
          isCompromised: false,
          createdAt: now,
        },
        {
          id: 'd2',
          deviceName: 'Firefox su Windows',
          deviceType: 'desktop',
          osType: 'Windows',
          browserType: 'Firefox',
          lastLoginAt: now,
          lastIpAddress: '5.6.7.8',
          lastLocationCity: null,
          lastLocationCountry: null,
          trustedUntil: null,
          isCompromised: false,
          createdAt: now,
        },
      ]);

      const devices = await service.listDevices(mockUserId);

      expect(devices).toHaveLength(2);
      expect(devices[0].isTrusted).toBe(true);
      expect(devices[1].isTrusted).toBe(false);
    });
  });

  describe('untrustDevice', () => {
    it('should set trustedUntil to null', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: mockDeviceId });
      prisma.device.update.mockResolvedValue({});

      await service.untrustDevice(mockDeviceId, mockUserId);

      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: mockDeviceId },
        data: { trustedUntil: null },
      });
    });

    it('should throw NotFoundException if device not found', async () => {
      prisma.device.findFirst.mockResolvedValue(null);

      await expect(service.untrustDevice(mockDeviceId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('untrustAllDevices', () => {
    it('should untrust all devices and return count', async () => {
      prisma.device.updateMany.mockResolvedValue({ count: 3 });

      const count = await service.untrustAllDevices(mockUserId);
      expect(count).toBe(3);
      expect(prisma.device.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: { trustedUntil: null },
      });
    });
  });

  describe('markCompromised', () => {
    it('should mark device compromised and revoke sessions', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: mockDeviceId });
      prisma.device.update.mockResolvedValue({});
      prisma.session.updateMany.mockResolvedValue({ count: 2 });

      await service.markCompromised(mockDeviceId, mockUserId);

      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: mockDeviceId },
        data: {
          isCompromised: true,
          trustedUntil: null,
          requiresMfaNext: true,
        },
      });
      expect(prisma.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deviceId: mockDeviceId, isActive: true },
        }),
      );
    });

    it('should throw NotFoundException if device not found', async () => {
      prisma.device.findFirst.mockResolvedValue(null);

      await expect(service.markCompromised(mockDeviceId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('recordLogin', () => {
    it('should update device login info', async () => {
      prisma.device.update.mockResolvedValue({});

      await service.recordLogin(mockDeviceId, '1.2.3.4', 'Roma', 'IT');

      expect(prisma.device.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockDeviceId },
          data: expect.objectContaining({
            lastIpAddress: '1.2.3.4',
            lastLocationCity: 'Roma',
            lastLocationCountry: 'IT',
          }),
        }),
      );
    });
  });
});
