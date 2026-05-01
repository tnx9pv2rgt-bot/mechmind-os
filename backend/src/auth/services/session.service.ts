import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '@common/services/prisma.service';
import { TokenBlacklistService } from './token-blacklist.service';

export interface SessionInfo {
  id: string;
  deviceName: string;
  deviceType: string;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  city: string | null;
  country: string | null;
  lastActiveAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenBlacklist: TokenBlacklistService,
  ) {}

  /**
   * Create a new session record on login.
   * Parses User-Agent for device info (Google Security Checkup style).
   */
  async createSession(params: {
    userId: string;
    jwtToken: string;
    refreshToken: string;
    ipAddress: string;
    userAgent: string;
    expiresAt: Date;
  }): Promise<string> {
    const { userId, jwtToken, refreshToken, ipAddress, userAgent, expiresAt } = params;

    const { deviceName, deviceType, browser, os } = this.parseUserAgent(userAgent);

    // Find or create device
    const fingerprint = this.generateFingerprint(userAgent, ipAddress);
    let device = await this.prisma.device.findFirst({
      where: { userId, fingerprint },
    });

    if (!device) {
      device = await this.prisma.device.create({
        data: {
          userId,
          deviceName,
          deviceType,
          osType: os,
          browserType: browser,
          fingerprint,
          lastIpAddress: ipAddress,
          lastLoginAt: new Date(),
        },
      });
    } else {
      await this.prisma.device.update({
        where: { id: device.id },
        data: {
          lastIpAddress: ipAddress,
          lastLoginAt: new Date(),
          browserType: browser,
        },
      });
    }

    const session = await this.prisma.session.create({
      data: {
        userId,
        jwtToken,
        refreshToken,
        deviceId: device.id,
        ipAddress,
        userAgent,
        expiresAt,
        isActive: true,
      },
    });

    return session.id;
  }

  /**
   * List all active sessions for a user (Google Security Checkup style).
   */
  async listSessions(userId: string, currentJwtToken?: string): Promise<SessionInfo[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        device: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    return sessions.map(s => ({
      id: s.id,
      deviceName: s.device?.deviceName || this.parseUserAgent(s.userAgent || '').deviceName,
      deviceType: s.device?.deviceType || 'desktop',
      browser: s.device?.browserType || null,
      os: s.device?.osType || null,
      ipAddress: s.ipAddress,
      city: s.device?.lastLocationCity || null,
      country: s.device?.lastLocationCountry || null,
      lastActiveAt: s.lastUsedAt,
      createdAt: s.createdAt,
      isCurrent: s.jwtToken === currentJwtToken,
    }));
  }

  /**
   * Revoke a specific session (sign out a device).
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId, isActive: true },
    });

    if (!session) {
      throw new NotFoundException('Sessione non trovata');
    }

    // Mark session as revoked
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'user_revoked',
      },
    });

    // Blacklist the JWT so it can't be used anymore
    try {
      const parts = session.jwtToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        if (payload.jti && payload.exp) {
          const ttl = payload.exp - Math.floor(Date.now() / 1000);
          if (ttl > 0) {
            await this.tokenBlacklist.blacklistToken(payload.jti, ttl);
          }
        }
      }
    } catch {
      // Token parsing failed — session still revoked in DB
    }

    this.logger.log(`Session ${sessionId} revoked for user ${userId}`);
  }

  /**
   * Revoke all sessions except the current one.
   */
  async revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        isActive: true,
        id: { not: currentSessionId },
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'revoke_all_others',
      },
    });

    // Invalidate all user tokens via timestamp (faster than individual blacklisting)
    await this.tokenBlacklist.invalidateAllUserSessions(userId);

    this.logger.log(`${result.count} sessions revoked for user ${userId}`);
    return result.count;
  }

  /**
   * Update last active timestamp for a session (called on each authenticated request).
   */
  async touchSession(jwtToken: string): Promise<void> {
    await this.prisma.session
      .updateMany({
        where: { jwtToken, isActive: true },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        /* non-blocking */
      });
  }

  /**
   * Parse User-Agent to extract device info (like Google does).
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  private parseUserAgent(ua: string): {
    deviceName: string;
    deviceType: string;
    browser: string;
    os: string;
  } {
    // Browser detection
    let browser = 'Browser sconosciuto';
    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';
    else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
    else if (ua.includes('Firefox/')) browser = 'Firefox';

    // OS detection
    let os = 'Sistema sconosciuto';
    let deviceType = 'desktop';
    if (ua.includes('iPhone')) {
      os = 'iOS';
      deviceType = 'phone';
    } else if (ua.includes('iPad')) {
      os = 'iPadOS';
      deviceType = 'tablet';
    } else if (ua.includes('Android')) {
      os = 'Android';
      deviceType = ua.includes('Mobile') ? 'phone' : 'tablet';
    } else if (ua.includes('Mac OS X') || ua.includes('macOS')) os = 'macOS';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('CrOS')) os = 'ChromeOS';

    const deviceName = `${browser} su ${os}`;

    return { deviceName, deviceType, browser, os };
  }

  /**
   * Generate a device fingerprint from User-Agent and IP.
   */
  private generateFingerprint(userAgent: string, ip: string): string {
    // Use only the stable parts (browser family + OS, not version numbers)
    const { browser, os } = this.parseUserAgent(userAgent);
    return createHash('sha256').update(`${browser}:${os}:${ip}`).digest('hex').substring(0, 32);
  }
}
