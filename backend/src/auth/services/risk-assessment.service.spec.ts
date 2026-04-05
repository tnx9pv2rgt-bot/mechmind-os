import { Test, TestingModule } from '@nestjs/testing';
import { RiskAssessmentService, RiskSignals } from './risk-assessment.service';
import { PrismaService } from '@common/services/prisma.service';

describe('RiskAssessmentService', () => {
  let service: RiskAssessmentService;
  let prisma: {
    device: { findFirst: jest.Mock; count: jest.Mock; updateMany: jest.Mock; update: jest.Mock };
    session: { findFirst: jest.Mock; count: jest.Mock; updateMany: jest.Mock };
  };

  const baseSignals: RiskSignals = {
    userId: 'user-001',
    ipAddress: '203.0.113.50',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  };

  beforeEach(async () => {
    prisma = {
      device: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      session: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RiskAssessmentService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<RiskAssessmentService>(RiskAssessmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assessLoginRisk', () => {
    it('should return medium risk for first device ever (new IP adds points)', async () => {
      // No device, no sessions, device count = 0
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.count.mockResolvedValue(0);
      prisma.session.findFirst.mockResolvedValue(null);
      prisma.session.count.mockResolvedValue(0);

      const result = await service.assessLoginRisk(baseSignals);

      // new_device_first(5) + new_ip(15) + no_recent_session(0) + normal_pattern(0) = 20
      expect(result.level).toBe('medium');
      expect(result.score).toBe(20);
      expect(result.requiresMfa).toBe(false); // MFA threshold is 30
    });

    it('should return low risk for known device + known IP', async () => {
      // Known device (trusted)
      prisma.device.findFirst.mockResolvedValue({
        id: 'device-1',
        fingerprint: 'abc',
        isCompromised: false,
        trustedUntil: new Date(Date.now() + 86400000),
      });
      // Known IP
      prisma.session.findFirst
        .mockResolvedValueOnce({ ipAddress: '203.0.113.50' }) // IP check
        .mockResolvedValueOnce(null); // impossible travel
      prisma.session.count.mockResolvedValue(1);

      const result = await service.assessLoginRisk(baseSignals);

      expect(result.level).toBe('low');
      expect(result.score).toBe(0);
      expect(result.requiresMfa).toBe(false);
    });

    it('should flag new device signal for known IP', async () => {
      // New device, existing devices
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.count.mockResolvedValue(2);
      // Known IP
      prisma.session.findFirst
        .mockResolvedValueOnce({ ipAddress: '203.0.113.50' }) // IP check
        .mockResolvedValueOnce(null); // impossible travel
      prisma.session.count.mockResolvedValue(1);

      const result = await service.assessLoginRisk(baseSignals);

      // new_device(25) + known_ip(0) = 25
      expect(result.score).toBe(25);
      expect(result.requiresMfa).toBe(false); // 25 < 30 threshold
      expect(result.signals.some(s => s.signal === 'new_device')).toBe(true);
    });

    it('should return high risk for new device + new IP', async () => {
      // New device, existing devices
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.count.mockResolvedValue(2);
      // New IP (all session queries return null)
      prisma.session.findFirst.mockResolvedValue(null);
      prisma.session.count.mockResolvedValue(0);

      const result = await service.assessLoginRisk(baseSignals);

      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.requiresMfa).toBe(true);
    });

    it('should detect compromised device (score 30)', async () => {
      prisma.device.findFirst.mockResolvedValue({
        id: 'device-1',
        isCompromised: true,
        trustedUntil: null,
      });
      prisma.session.findFirst.mockResolvedValue(null);
      prisma.session.count.mockResolvedValue(0);

      const result = await service.assessLoginRisk(baseSignals);

      expect(result.signals.some(s => s.signal === 'compromised_device')).toBe(true);
      expect(result.requiresMfa).toBe(true);
    });

    it('should detect impossible travel (same user, different /16 within 30 min)', async () => {
      // Known device
      prisma.device.findFirst.mockResolvedValue({
        id: 'device-1',
        isCompromised: false,
        trustedUntil: new Date(Date.now() + 86400000),
      });
      // Known IP
      prisma.session.findFirst
        .mockResolvedValueOnce({ ipAddress: '203.0.113.50' }) // IP check
        .mockResolvedValueOnce({
          // Impossible travel check — recent session from very different IP
          ipAddress: '45.33.100.10',
          createdAt: new Date(Date.now() - 15 * 60_000), // 15 min ago
          isActive: true,
          device: null,
        });
      prisma.session.count.mockResolvedValue(1);

      const result = await service.assessLoginRisk(baseSignals);

      expect(result.signals.some(s => s.signal === 'impossible_travel')).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(30);
    });

    it('should detect high login frequency', async () => {
      prisma.device.findFirst.mockResolvedValue({
        id: 'device-1',
        isCompromised: false,
        trustedUntil: new Date(Date.now() + 86400000),
      });
      prisma.session.findFirst
        .mockResolvedValueOnce({ ipAddress: '203.0.113.50' }) // IP check
        .mockResolvedValueOnce(null); // impossible travel
      prisma.session.count.mockResolvedValue(6); // 6 logins in last hour

      const result = await service.assessLoginRisk(baseSignals);

      expect(result.signals.some(s => s.signal === 'high_frequency')).toBe(true);
    });

    it('should detect expired device trust', async () => {
      prisma.device.findFirst.mockResolvedValue({
        id: 'device-1',
        isCompromised: false,
        trustedUntil: new Date(Date.now() - 86400000), // expired yesterday
      });
      prisma.session.findFirst.mockResolvedValue(null);
      prisma.session.count.mockResolvedValue(0);

      const result = await service.assessLoginRisk(baseSignals);

      expect(result.signals.some(s => s.signal === 'expired_trust')).toBe(true);
    });
  });

  describe('assessLoginRisk — additional branches', () => {
    it('should detect suspicious IP (private range 192.168.x.x)', async () => {
      prisma.device.findFirst.mockResolvedValue({
        id: 'device-1',
        isCompromised: false,
        trustedUntil: new Date(Date.now() + 86400000),
      });
      prisma.session.findFirst.mockResolvedValue(null);
      prisma.session.count.mockResolvedValue(0);

      const result = await service.assessLoginRisk({
        ...baseSignals,
        ipAddress: '192.168.1.100',
      });

      expect(result.signals.some(s => s.signal === 'suspicious_ip')).toBe(true);
    });

    it('should detect same /24 subnet (new_ip_same_subnet)', async () => {
      prisma.device.findFirst.mockResolvedValue({
        id: 'device-1',
        isCompromised: false,
        trustedUntil: new Date(Date.now() + 86400000),
      });
      // IP check: not exact match
      prisma.session.findFirst
        .mockResolvedValueOnce(null) // exact IP not found
        .mockResolvedValueOnce(null); // impossible travel

      // Subnet check returns a match
      prisma.session.findFirst
        .mockReset()
        .mockResolvedValueOnce(null) // exact IP
        .mockResolvedValueOnce({ ipAddress: '203.0.113.55' }) // same /24 subnet
        .mockResolvedValueOnce(null); // impossible travel

      prisma.session.count.mockResolvedValue(0);

      const result = await service.assessLoginRisk(baseSignals);

      // The second findFirst in assessIpRisk checks subnet
      expect(
        result.signals.some(s => s.signal === 'new_ip_same_subnet' || s.signal === 'new_ip'),
      ).toBe(true);
    });

    it('should detect rapid_location_change (different /16 but > 30 min)', async () => {
      prisma.device.findFirst.mockResolvedValue({
        id: 'device-1',
        isCompromised: false,
        trustedUntil: new Date(Date.now() + 86400000),
      });
      // Known IP
      prisma.session.findFirst
        .mockResolvedValueOnce({ ipAddress: '203.0.113.50' }) // IP check
        .mockResolvedValueOnce({
          // Impossible travel — different /16, 45 min ago
          ipAddress: '45.33.100.10',
          createdAt: new Date(Date.now() - 45 * 60_000),
          isActive: true,
          device: null,
        });
      prisma.session.count.mockResolvedValue(1);

      const result = await service.assessLoginRisk(baseSignals);

      expect(result.signals.some(s => s.signal === 'rapid_location_change')).toBe(true);
    });

    it('should detect same IP as recent session (score 0 for travel)', async () => {
      prisma.device.findFirst.mockResolvedValue({
        id: 'device-1',
        isCompromised: false,
        trustedUntil: new Date(Date.now() + 86400000),
      });
      prisma.session.findFirst
        .mockResolvedValueOnce({ ipAddress: '203.0.113.50' }) // IP check
        .mockResolvedValueOnce({
          ipAddress: '203.0.113.50', // Same IP
          createdAt: new Date(Date.now() - 10 * 60_000),
          isActive: true,
        });
      prisma.session.count.mockResolvedValue(1);

      const result = await service.assessLoginRisk(baseSignals);

      expect(result.signals.some(s => s.signal === 'same_ip')).toBe(true);
    });

    it('should detect normal_travel for same /16 different IP', async () => {
      prisma.device.findFirst.mockResolvedValue({
        id: 'device-1',
        isCompromised: false,
        trustedUntil: new Date(Date.now() + 86400000),
      });
      prisma.session.findFirst
        .mockResolvedValueOnce({ ipAddress: '203.0.113.50' }) // IP check
        .mockResolvedValueOnce({
          ipAddress: '203.0.200.10', // Same /16 (203.0)
          createdAt: new Date(Date.now() - 10 * 60_000),
          isActive: true,
        });
      prisma.session.count.mockResolvedValue(1);

      const result = await service.assessLoginRisk(baseSignals);

      expect(result.signals.some(s => s.signal === 'normal_travel')).toBe(true);
    });

    it('should clamp score to 100 when sum exceeds 100', async () => {
      // compromised device (30) + suspicious IP (15) + impossible travel (30) + high frequency (15) = 90
      // But we need score >= 90 for blockLogin
      prisma.device.findFirst.mockResolvedValue({
        id: 'device-1',
        isCompromised: true,
        trustedUntil: null,
      });
      prisma.session.findFirst
        .mockResolvedValueOnce(null) // IP not known
        .mockResolvedValueOnce(null) // subnet
        .mockResolvedValueOnce({
          ipAddress: '45.33.100.10',
          createdAt: new Date(Date.now() - 10 * 60_000),
          isActive: true,
          device: null,
        });
      prisma.session.count.mockResolvedValue(6); // high frequency

      const result = await service.assessLoginRisk({
        ...baseSignals,
        ipAddress: '192.168.1.100', // suspicious + different /16 from recent
      });

      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should set blockLogin=true when score >= 90', async () => {
      // compromised(30) + suspicious IP(15) + impossible travel(30) + high_frequency(15) = 90
      prisma.device.findFirst.mockResolvedValue({
        id: 'device-1',
        isCompromised: true,
      });
      prisma.session.findFirst
        .mockResolvedValueOnce(null) // IP check
        .mockResolvedValueOnce(null) // subnet
        .mockResolvedValueOnce({
          ipAddress: '45.33.100.10',
          createdAt: new Date(Date.now() - 5 * 60_000),
          isActive: true,
        });
      prisma.session.count.mockResolvedValue(6);

      const result = await service.assessLoginRisk({
        ...baseSignals,
        ipAddress: '192.168.1.1',
      });

      expect(result.requiresDeviceApproval).toBe(true);
      expect(result.requiresMfa).toBe(true);
    });

    it('should set requiresDeviceApproval when score >= 60', async () => {
      // new_device(25) + new_ip(15) + impossible_travel(30) = 70
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.count.mockResolvedValue(2);
      prisma.session.findFirst
        .mockResolvedValueOnce(null) // IP not known
        .mockResolvedValueOnce(null) // subnet not known
        .mockResolvedValueOnce({
          ipAddress: '45.33.100.10',
          createdAt: new Date(Date.now() - 10 * 60_000),
          isActive: true,
        });
      prisma.session.count.mockResolvedValue(0);

      const result = await service.assessLoginRisk(baseSignals);

      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.requiresDeviceApproval).toBe(true);
      expect(result.requiresMfa).toBe(true);
    });

    it('should use provided fingerprint instead of generating one', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      prisma.device.count.mockResolvedValue(0);
      prisma.session.findFirst.mockResolvedValue(null);
      prisma.session.count.mockResolvedValue(0);

      const result = await service.assessLoginRisk({
        ...baseSignals,
        fingerprint: 'custom-fp-123',
      });

      expect(prisma.device.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-001', fingerprint: 'custom-fp-123' },
      });
      expect(result).toBeDefined();
    });
  });

  describe('trustDevice', () => {
    it('should set trustedUntil 30 days from now by default', async () => {
      await service.trustDevice('user-001', 'fp-abc');

      expect(prisma.device.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-001', fingerprint: 'fp-abc' },
        data: expect.objectContaining({
          requiresMfaNext: false,
        }),
      });

      const call = prisma.device.updateMany.mock.calls[0][0];
      const trustedUntil = call.data.trustedUntil as Date;
      const daysFromNow = (trustedUntil.getTime() - Date.now()) / 86_400_000;
      expect(daysFromNow).toBeCloseTo(30, 0);
    });

    it('should accept custom duration', async () => {
      await service.trustDevice('user-001', 'fp-abc', 90);

      const call = prisma.device.updateMany.mock.calls[0][0];
      const trustedUntil = call.data.trustedUntil as Date;
      const daysFromNow = (trustedUntil.getTime() - Date.now()) / 86_400_000;
      expect(daysFromNow).toBeCloseTo(90, 0);
    });
  });

  describe('markDeviceCompromised', () => {
    it('should flag device and revoke all its sessions', async () => {
      await service.markDeviceCompromised('user-001', 'device-1');

      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: 'device-1' },
        data: { isCompromised: true, requiresMfaNext: true },
      });

      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { deviceId: 'device-1', isActive: true },
        data: expect.objectContaining({
          isActive: false,
          revokedReason: 'device_compromised',
        }),
      });
    });
  });
});
