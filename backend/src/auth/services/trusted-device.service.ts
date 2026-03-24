import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '@common/services/prisma.service';
import { DeviceListItem } from '../dto/device.dto';

@Injectable()
export class TrustedDeviceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate device fingerprint from request context.
   * SHA-256 hash of normalized: OS + browser (NOT IP, too volatile).
   */
  generateFingerprint(userAgent: string, _ip: string, extra?: Record<string, string>): string {
    const browser = this.parseBrowser(userAgent);
    const os = this.parseOs(userAgent);

    let raw = `${os}:${browser}`;
    if (extra) {
      const sortedKeys = Object.keys(extra).sort();
      for (const key of sortedKeys) {
        raw += `:${key}=${extra[key]}`;
      }
    }

    return createHash('sha256').update(raw).digest('hex').substring(0, 32);
  }

  /**
   * Find or create device record for this login.
   */
  async findOrCreateDevice(params: {
    userId: string;
    userAgent: string;
    ipAddress: string;
    locationCity?: string;
    locationCountry?: string;
  }): Promise<{ id: string; fingerprint: string; isNew: boolean }> {
    const fingerprint = this.generateFingerprint(params.userAgent, params.ipAddress);
    const browser = this.parseBrowser(params.userAgent);
    const os = this.parseOs(params.userAgent);
    const deviceType = this.parseDeviceType(params.userAgent);
    const deviceName = `${browser} su ${os}`;

    const existing = await this.prisma.device.findFirst({
      where: { userId: params.userId, fingerprint },
    });

    if (existing) {
      await this.prisma.device.update({
        where: { id: existing.id },
        data: {
          lastIpAddress: params.ipAddress,
          lastLoginAt: new Date(),
          lastLocationCity: params.locationCity ?? existing.lastLocationCity,
          lastLocationCountry: params.locationCountry ?? existing.lastLocationCountry,
          browserType: browser,
        },
      });
      return { id: existing.id, fingerprint, isNew: false };
    }

    const device = await this.prisma.device.create({
      data: {
        userId: params.userId,
        deviceName,
        deviceType,
        osType: os,
        browserType: browser,
        fingerprint,
        lastIpAddress: params.ipAddress,
        lastLoginAt: new Date(),
        lastLocationCity: params.locationCity,
        lastLocationCountry: params.locationCountry,
      },
    });

    return { id: device.id, fingerprint, isNew: true };
  }

  /**
   * Mark device as trusted (skip MFA for N days).
   * Default: 30 days. Max: 90 days.
   */
  async trustDevice(
    deviceId: string,
    userId: string,
    daysToTrust = 30,
  ): Promise<{ id: string; trustedUntil: Date }> {
    const clampedDays = Math.min(Math.max(daysToTrust, 1), 90);

    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundException('Dispositivo non trovato');
    }

    if (device.isCompromised) {
      throw new BadRequestException(
        'Impossibile fidarsi di un dispositivo segnalato come compromesso',
      );
    }

    const trustedUntil = new Date(Date.now() + clampedDays * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        trustedUntil,
        requiresMfaNext: false,
      },
    });

    return { id: updated.id, trustedUntil };
  }

  /**
   * Check if device is currently trusted.
   * Returns true if trustedUntil > now AND !isCompromised.
   */
  async isDeviceTrusted(userId: string, fingerprint: string): Promise<boolean> {
    const device = await this.prisma.device.findFirst({
      where: { userId, fingerprint },
    });

    if (!device) {
      return false;
    }

    if (device.isCompromised) {
      return false;
    }

    if (!device.trustedUntil) {
      return false;
    }

    return device.trustedUntil > new Date();
  }

  /**
   * List all devices for a user.
   */
  async listDevices(userId: string): Promise<DeviceListItem[]> {
    const devices = await this.prisma.device.findMany({
      where: { userId },
      orderBy: { lastLoginAt: 'desc' },
    });

    const now = new Date();

    return devices.map(d => ({
      id: d.id,
      deviceName: d.deviceName,
      deviceType: d.deviceType,
      osType: d.osType,
      browserType: d.browserType,
      lastLoginAt: d.lastLoginAt,
      lastIpAddress: d.lastIpAddress,
      lastLocationCity: d.lastLocationCity,
      lastLocationCountry: d.lastLocationCountry,
      isTrusted: !d.isCompromised && d.trustedUntil !== null && d.trustedUntil > now,
      isCompromised: d.isCompromised,
      createdAt: d.createdAt,
    }));
  }

  /**
   * Revoke trust for a specific device.
   * Sets trustedUntil = null.
   */
  async untrustDevice(deviceId: string, userId: string): Promise<void> {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundException('Dispositivo non trovato');
    }

    await this.prisma.device.update({
      where: { id: deviceId },
      data: { trustedUntil: null },
    });
  }

  /**
   * Revoke all devices (panic button).
   * Sets trustedUntil = null on ALL user devices.
   */
  async untrustAllDevices(userId: string): Promise<number> {
    const result = await this.prisma.device.updateMany({
      where: { userId },
      data: { trustedUntil: null },
    });

    return result.count;
  }

  /**
   * Mark device as compromised.
   * isCompromised = true, trustedUntil = null, requiresMfaNext = true.
   */
  async markCompromised(deviceId: string, userId: string): Promise<void> {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundException('Dispositivo non trovato');
    }

    await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        isCompromised: true,
        trustedUntil: null,
        requiresMfaNext: true,
      },
    });

    // Revoke all sessions for this device
    await this.prisma.session.updateMany({
      where: { deviceId, isActive: true },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'device_compromised',
      },
    });
  }

  /**
   * Update device info on each login.
   */
  async recordLogin(
    deviceId: string,
    ipAddress: string,
    city?: string,
    country?: string,
  ): Promise<void> {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        lastIpAddress: ipAddress,
        lastLoginAt: new Date(),
        ...(city !== undefined && { lastLocationCity: city }),
        ...(country !== undefined && { lastLocationCountry: country }),
      },
    });
  }

  // ── Private helpers ──

  private parseBrowser(ua: string): string {
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
    if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome';
    if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
    if (ua.includes('Firefox/')) return 'Firefox';
    return 'unknown';
  }

  private parseOs(ua: string): string {
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Mac OS') || ua.includes('macOS')) return 'macOS';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('CrOS')) return 'ChromeOS';
    return 'unknown';
  }

  private parseDeviceType(ua: string): string {
    if (ua.includes('iPhone')) return 'phone';
    if (ua.includes('iPad')) return 'tablet';
    if (ua.includes('Android')) {
      return ua.includes('Mobile') ? 'phone' : 'tablet';
    }
    return 'desktop';
  }
}
