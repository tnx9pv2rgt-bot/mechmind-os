import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGIN_BLOCKED = 'login_blocked',
  MFA_REQUESTED = 'mfa_requested',
  MFA_PASSED = 'mfa_passed',
  MFA_FAILED = 'mfa_failed',
  SMS_OTP_SENT = 'sms_otp_sent',
  SMS_OTP_VERIFIED = 'sms_otp_verified',
  SMS_OTP_FAILED = 'sms_otp_failed',
  DEVICE_TRUSTED = 'device_trusted',
  DEVICE_UNTRUSTED = 'device_untrusted',
  DEVICE_COMPROMISED = 'device_compromised',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET = 'password_reset',
  PASSKEY_REGISTERED = 'passkey_registered',
  PASSKEY_REMOVED = 'passkey_removed',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  RECOVERY_CODE_USED = 'recovery_code_used',
  RECOVERY_PHONE_SET = 'recovery_phone_set',
  RECOVERY_PHONE_REMOVED = 'recovery_phone_removed',
  SESSION_REVOKED = 'session_revoked',
  ALL_SESSIONS_REVOKED = 'all_sessions_revoked',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
}

export interface SecurityEvent {
  id: string;
  action: SecurityEventType;
  status: string;
  ipAddress: string | null;
  deviceInfo: {
    os: string;
    browser: string;
    deviceType: string;
  } | null;
  location: {
    city: string;
    country: string;
  } | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

export interface SecurityActivityPage {
  events: SecurityEvent[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SecuritySummary {
  totalLogins: number;
  failedAttempts: number;
  devicesUsed: number;
  locationsUsed: string[];
  lastLogin: Date | null;
  suspiciousEvents: number;
}

@Injectable()
export class SecurityActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a security event using the AuthAuditLog table.
   */
  async logEvent(params: {
    tenantId: string;
    userId?: string;
    action: SecurityEventType;
    status: 'success' | 'failed' | 'blocked';
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.authAuditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        status: params.status,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: (params.details ?? {}) as Record<string, string>,
      },
    });
  }

  /**
   * Get paginated security activity for a user.
   */
  async getActivity(params: {
    tenantId: string;
    userId: string;
    page?: number;
    limit?: number;
    eventTypes?: SecurityEventType[];
  }): Promise<SecurityActivityPage> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId: params.tenantId,
      userId: params.userId,
    };

    if (params.eventTypes && params.eventTypes.length > 0) {
      where.action = { in: params.eventTypes };
    }

    const [logs, total] = await Promise.all([
      this.prisma.authAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.authAuditLog.count({ where }),
    ]);

    const events: SecurityEvent[] = logs.map(log => ({
      id: log.id,
      action: log.action as SecurityEventType,
      status: log.status,
      ipAddress: log.ipAddress,
      deviceInfo: this.parseDeviceInfo(log.userAgent),
      location: this.parseLocation(log.details as Record<string, unknown> | null),
      details: log.details as Record<string, unknown> | null,
      createdAt: log.createdAt,
    }));

    return {
      events,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get activity summary (last 30 days stats).
   */
  async getActivitySummary(tenantId: string, userId: string): Promise<SecuritySummary> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalLogins, failedAttempts, suspiciousEvents, devices, lastLoginLog] =
      await Promise.all([
        this.prisma.authAuditLog.count({
          where: {
            tenantId,
            userId,
            action: SecurityEventType.LOGIN_SUCCESS,
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        this.prisma.authAuditLog.count({
          where: {
            tenantId,
            userId,
            action: SecurityEventType.LOGIN_FAILED,
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        this.prisma.authAuditLog.count({
          where: {
            tenantId,
            userId,
            action: {
              in: [
                SecurityEventType.LOGIN_BLOCKED,
                SecurityEventType.DEVICE_COMPROMISED,
                SecurityEventType.ACCOUNT_LOCKED,
              ],
            },
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        this.prisma.device.findMany({
          where: { userId },
          select: { lastLocationCity: true, lastLocationCountry: true },
        }),
        this.prisma.authAuditLog.findFirst({
          where: {
            tenantId,
            userId,
            action: SecurityEventType.LOGIN_SUCCESS,
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

    const locationsSet = new Set<string>();
    for (const d of devices) {
      if (d.lastLocationCity && d.lastLocationCountry) {
        locationsSet.add(`${d.lastLocationCity}, ${d.lastLocationCountry}`);
      } else if (d.lastLocationCountry) {
        locationsSet.add(d.lastLocationCountry);
      }
    }

    return {
      totalLogins,
      failedAttempts,
      devicesUsed: devices.length,
      locationsUsed: Array.from(locationsSet),
      lastLogin: lastLoginLog?.createdAt ?? null,
      suspiciousEvents,
    };
  }

  // ── Private helpers ──

  private parseDeviceInfo(userAgent: string | null): SecurityEvent['deviceInfo'] {
    if (!userAgent) return null;

    let browser = 'unknown';
    if (userAgent.includes('Edg/')) browser = 'Edge';
    else if (userAgent.includes('Chrome/')) browser = 'Chrome';
    else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) browser = 'Safari';
    else if (userAgent.includes('Firefox/')) browser = 'Firefox';

    let os = 'unknown';
    let deviceType = 'desktop';
    if (userAgent.includes('iPhone')) {
      os = 'iOS';
      deviceType = 'phone';
    } else if (userAgent.includes('iPad')) {
      os = 'iPadOS';
      deviceType = 'tablet';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
      deviceType = userAgent.includes('Mobile') ? 'phone' : 'tablet';
    } else if (userAgent.includes('Mac OS') || userAgent.includes('macOS')) {
      os = 'macOS';
    } else if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    }

    return { os, browser, deviceType };
  }

  private parseLocation(details: Record<string, unknown> | null): SecurityEvent['location'] {
    if (!details) return null;
    const city = details['city'] as string | undefined;
    const country = details['country'] as string | undefined;
    if (!city && !country) return null;
    return {
      city: city ?? '',
      country: country ?? '',
    };
  }
}
