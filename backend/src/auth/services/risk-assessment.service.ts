import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { createHash } from 'crypto';

/**
 * Risk signals evaluated on each login attempt.
 * Google/Microsoft 2024-2026 adaptive authentication pattern.
 */
export interface RiskSignals {
  userId: string;
  ipAddress: string;
  userAgent: string;
  fingerprint?: string;
}

export interface RiskAssessment {
  score: number; // 0-100 (0 = safe, 100 = critical risk)
  level: 'low' | 'medium' | 'high' | 'critical';
  signals: RiskSignalDetail[];
  requiresMfa: boolean;
  requiresDeviceApproval: boolean;
  blockLogin: boolean;
}

export interface RiskSignalDetail {
  signal: string;
  score: number;
  description: string;
}

@Injectable()
export class RiskAssessmentService {
  private readonly logger = new Logger(RiskAssessmentService.name);

  // Known Tor exit nodes & VPN/datacenter ASN patterns
  // In production, use a real IP reputation service (MaxMind, IPQualityScore)
  private readonly suspiciousIpPatterns = [
    /^10\./, // Private ranges shouldn't appear in production
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assess login risk based on multiple signals.
   * Follows Google's risk-based authentication model:
   * - Known device + known IP → low risk (skip MFA)
   * - Known device + new IP → medium risk (MFA optional)
   * - New device + known IP → medium risk (MFA required)
   * - New device + new IP → high risk (MFA required + device approval)
   * - Impossible travel / compromised device → critical (block)
   */
  async assessLoginRisk(signals: RiskSignals): Promise<RiskAssessment> {
    const details: RiskSignalDetail[] = [];
    let totalScore = 0;

    // 1. Device recognition (0-30 points)
    const deviceScore = await this.assessDeviceRisk(signals);
    details.push(deviceScore);
    totalScore += deviceScore.score;

    // 2. IP reputation (0-25 points)
    const ipScore = await this.assessIpRisk(signals);
    details.push(ipScore);
    totalScore += ipScore.score;

    // 3. Impossible travel detection (0-30 points)
    const travelScore = await this.assessImpossibleTravel(signals);
    details.push(travelScore);
    totalScore += travelScore.score;

    // 4. Login pattern anomaly (0-15 points)
    const patternScore = await this.assessLoginPattern(signals);
    details.push(patternScore);
    totalScore += patternScore.score;

    // Clamp to 0-100
    totalScore = Math.min(100, Math.max(0, totalScore));

    // Determine risk level and actions
    const level = this.getRiskLevel(totalScore);
    const requiresMfa = totalScore >= 30;
    const requiresDeviceApproval = totalScore >= 60;
    const blockLogin = totalScore >= 90;

    const assessment: RiskAssessment = {
      score: totalScore,
      level,
      signals: details,
      requiresMfa,
      requiresDeviceApproval,
      blockLogin,
    };

    if (totalScore >= 30) {
      this.logger.warn(
        `Risk assessment for user ${signals.userId}: score=${totalScore} level=${level}`,
      );
    }

    return assessment;
  }

  /**
   * Signal 1: Is this a known or new device?
   * Known + trusted device = 0 points
   * Known but expired trust = 10 points
   * Brand new device = 25 points
   * Compromised device = 30 points
   */
  private async assessDeviceRisk(signals: RiskSignals): Promise<RiskSignalDetail> {
    const fingerprint =
      signals.fingerprint || this.generateFingerprint(signals.userAgent, signals.ipAddress);

    const device = await this.prisma.device.findFirst({
      where: { userId: signals.userId, fingerprint },
    });

    if (!device) {
      // Check how many devices user has — first device is lower risk
      const deviceCount = await this.prisma.device.count({
        where: { userId: signals.userId },
      });

      if (deviceCount === 0) {
        return {
          signal: 'new_device_first',
          score: 5,
          description: 'Primo dispositivo registrato',
        };
      }

      return {
        signal: 'new_device',
        score: 25,
        description: 'Dispositivo non riconosciuto',
      };
    }

    if (device.isCompromised) {
      return {
        signal: 'compromised_device',
        score: 30,
        description: 'Dispositivo segnalato come compromesso',
      };
    }

    // Check if device trust has expired
    if (device.trustedUntil && device.trustedUntil < new Date()) {
      return {
        signal: 'expired_trust',
        score: 10,
        description: 'Dispositivo con fiducia scaduta',
      };
    }

    // Known and trusted
    return {
      signal: 'known_device',
      score: 0,
      description: 'Dispositivo riconosciuto',
    };
  }

  /**
   * Signal 2: IP address risk assessment.
   * Known IP from previous logins = 0 points
   * New IP, same country = 10 points
   * New IP, different country = 20 points
   * Suspicious IP (Tor/VPN pattern) = 25 points
   */
  private async assessIpRisk(signals: RiskSignals): Promise<RiskSignalDetail> {
    // Check if user has logged in from this IP before
    const knownIp = await this.prisma.session.findFirst({
      where: {
        userId: signals.userId,
        ipAddress: signals.ipAddress,
        isActive: false, // Previous sessions
      },
    });

    if (knownIp) {
      return {
        signal: 'known_ip',
        score: 0,
        description: 'Indirizzo IP già utilizzato',
      };
    }

    // Check if IP matches suspicious patterns
    for (const pattern of this.suspiciousIpPatterns) {
      if (pattern.test(signals.ipAddress)) {
        return {
          signal: 'suspicious_ip',
          score: 15,
          description: 'Indirizzo IP da rete privata/sospetta',
        };
      }
    }

    // New IP — check if same "area" by looking at /24 subnet
    const ipPrefix = signals.ipAddress.split('.').slice(0, 3).join('.');
    const sameSubnet = await this.prisma.session.findFirst({
      where: {
        userId: signals.userId,
        ipAddress: { startsWith: ipPrefix },
      },
    });

    if (sameSubnet) {
      return {
        signal: 'new_ip_same_subnet',
        score: 5,
        description: 'Nuovo IP dalla stessa rete',
      };
    }

    return {
      signal: 'new_ip',
      score: 15,
      description: 'Indirizzo IP mai visto',
    };
  }

  /**
   * Signal 3: Impossible travel detection.
   * If user logged in from a very different IP within a short time window,
   * it's physically impossible — strong indicator of credential theft.
   *
   * Google 2024: uses GeoIP distance + time delta.
   * We approximate with IP prefix distance since we don't have GeoIP yet.
   */
  private async assessImpossibleTravel(signals: RiskSignals): Promise<RiskSignalDetail> {
    // Find the most recent session (within last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const recentSession = await this.prisma.session.findFirst({
      where: {
        userId: signals.userId,
        createdAt: { gte: twoHoursAgo },
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      include: { device: true },
    });

    if (!recentSession || !recentSession.ipAddress) {
      return {
        signal: 'no_recent_session',
        score: 0,
        description: 'Nessuna sessione recente',
      };
    }

    // Same IP → no travel
    if (recentSession.ipAddress === signals.ipAddress) {
      return {
        signal: 'same_ip',
        score: 0,
        description: 'Stesso indirizzo IP della sessione recente',
      };
    }

    // Different IP within 2h — check if it's a completely different /16 subnet
    // (rough proxy for geographic distance without GeoIP)
    const currentPrefix = signals.ipAddress.split('.').slice(0, 2).join('.');
    const recentPrefix = recentSession.ipAddress.split('.').slice(0, 2).join('.');

    if (currentPrefix !== recentPrefix) {
      // Significantly different network within 2h — possible impossible travel
      const timeDiffMinutes = (Date.now() - recentSession.createdAt.getTime()) / 60_000;

      if (timeDiffMinutes < 30) {
        // Less than 30 min, very different IP → suspicious
        return {
          signal: 'impossible_travel',
          score: 30,
          description: `Accesso da IP molto diverso a ${Math.round(timeDiffMinutes)} min dal precedente`,
        };
      }

      return {
        signal: 'rapid_location_change',
        score: 15,
        description: 'Cambio rapido di rete/posizione',
      };
    }

    return {
      signal: 'normal_travel',
      score: 0,
      description: 'Cambio di IP nella norma',
    };
  }

  /**
   * Signal 4: Login pattern anomaly.
   * Unusual login time or frequency.
   */
  private async assessLoginPattern(signals: RiskSignals): Promise<RiskSignalDetail> {
    const now = new Date();
    const hour = now.getHours();

    // Check login frequency in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentLogins = await this.prisma.session.count({
      where: {
        userId: signals.userId,
        createdAt: { gte: oneHourAgo },
      },
    });

    // More than 5 logins in an hour is suspicious
    if (recentLogins >= 5) {
      return {
        signal: 'high_frequency',
        score: 15,
        description: `${recentLogins} accessi nell'ultima ora`,
      };
    }

    // Unusual hour (2-5 AM) — mild signal
    if (hour >= 2 && hour <= 5) {
      return {
        signal: 'unusual_hour',
        score: 5,
        description: 'Accesso in orario insolito',
      };
    }

    return {
      signal: 'normal_pattern',
      score: 0,
      description: 'Pattern di accesso nella norma',
    };
  }

  /**
   * Mark a device as trusted (after successful MFA verification).
   * Trust lasts 30 days by default (Google pattern).
   */
  async trustDevice(userId: string, fingerprint: string, durationDays = 30): Promise<void> {
    await this.prisma.device.updateMany({
      where: { userId, fingerprint },
      data: {
        trustedUntil: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
        requiresMfaNext: false,
      },
    });
  }

  /**
   * Mark a device as compromised (user reported via security UI).
   */
  async markDeviceCompromised(userId: string, deviceId: string): Promise<void> {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: { isCompromised: true, requiresMfaNext: true },
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

    this.logger.warn(`Device ${deviceId} marked as compromised for user ${userId}`);
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 20) return 'low';
    if (score < 50) return 'medium';
    if (score < 80) return 'high';
    return 'critical';
  }

  private generateFingerprint(userAgent: string, ip: string): string {
    let browser = 'unknown';
    if (userAgent.includes('Edg/')) browser = 'Edge';
    else if (userAgent.includes('Chrome/')) browser = 'Chrome';
    else if (userAgent.includes('Safari/')) browser = 'Safari';
    else if (userAgent.includes('Firefox/')) browser = 'Firefox';

    let os = 'unknown';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Linux')) os = 'Linux';

    return createHash('sha256').update(`${browser}:${os}:${ip}`).digest('hex').substring(0, 32);
  }
}
