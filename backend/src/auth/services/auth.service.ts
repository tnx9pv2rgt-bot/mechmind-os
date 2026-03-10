import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

export interface JwtPayload {
  sub: string; // userId:tenantId format
  email: string;
  role: string;
  tenantId: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TwoFactorTempToken {
  tempToken: string;
  requiresTwoFactor: true;
  userId: string;
}

export interface AdminAction {
  adminId: string;
  action: string;
  targetUserId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface UserWithMFAStatus extends UserWithTenant {
  totpEnabled: boolean;
}

export interface UserWithTenant {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  tenantId: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Validate user credentials and return user with tenant info
   */
  async validateUser(email: string, password: string, tenantSlug: string): Promise<UserWithTenant> {
    // Find tenant first
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Invalid tenant or tenant is inactive');
    }

    // Find user within tenant
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        tenantId: tenant.id,
      },
      include: {
        tenant: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash || '');

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      tenantId: user.tenantId,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
      },
    };
  }

  /**
   * Generate JWT tokens for authenticated user
   */
  async generateTokens(user: UserWithTenant): Promise<AuthTokens> {
    // Create compound subject: userId:tenantId
    const subject = `${user.id}:${user.tenantId}`;

    const payload: JwtPayload = {
      sub: subject,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '24h'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    const expiresIn = parseInt(this.configService.get<string>('JWT_EXPIRES_IN_SECONDS', '86400'));

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Extract user and tenant from subject
      const [userId, tenantId] = payload.sub.split(':');

      // Verify user still exists and is active
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          tenantId: tenantId,
          isActive: true,
        },
        include: {
          tenant: true,
        },
      });

      if (!user || !user.tenant.isActive) {
        throw new UnauthorizedException('User or tenant is no longer active');
      }

      const userWithTenant: UserWithTenant = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        tenantId: user.tenantId,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          isActive: user.tenant.isActive,
        },
      };

      return this.generateTokens(userWithTenant);
    } catch (error) {
      this.logger.error('Token refresh failed', error.stack);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Extract tenant ID from JWT payload
   */
  extractTenantIdFromPayload(payload: JwtPayload): string {
    // First check explicit tenantId field
    if (payload.tenantId) {
      return payload.tenantId;
    }

    // Fallback to parsing from subject
    const parts = payload.sub.split(':');
    if (parts.length >= 2) {
      return parts[1];
    }

    throw new UnauthorizedException('Invalid token: tenant ID not found');
  }

  /**
   * Extract user ID from JWT payload
   */
  extractUserIdFromPayload(payload: JwtPayload): string {
    const parts = payload.sub.split(':');
    return parts[0];
  }

  /**
   * Hash password for new user
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Validate API key for voice webhooks
   * API keys are stored hashed in the tenant record.
   */
  async validateApiKey(apiKey: string): Promise<{ tenantId: string; valid: boolean }> {
    if (!apiKey) {
      return { tenantId: '', valid: false };
    }

    // API key format: prefix_tenantId_secret
    const parts = apiKey.split('_');
    if (parts.length < 3 || parts[0] !== 'mk') {
      return { tenantId: '', valid: false };
    }

    const tenantId = parts[1];
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, isActive: true, apiKeyHash: true },
    });

    if (!tenant || !tenant.isActive || !tenant.apiKeyHash) {
      return { tenantId: '', valid: false };
    }

    const isValid = await bcrypt.compare(apiKey, tenant.apiKeyHash);
    return { tenantId: isValid ? tenant.id : '', valid: isValid };
  }

  // ============== 2FA SUPPORT METHODS ==============

  /**
   * Generate temporary token for 2FA flow
   * Called when password is correct but 2FA is required
   */
  async generateTwoFactorTempToken(userId: string): Promise<string> {
    const payload = {
      sub: userId,
      type: '2fa_pending',
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_2FA_SECRET'),
      expiresIn: '5m', // Short-lived token
    });
  }

  /**
   * Verify temporary 2FA token
   */
  async verifyTwoFactorTempToken(tempToken: string): Promise<string> {
    try {
      const payload = await this.jwtService.verifyAsync(tempToken, {
        secret: this.configService.get<string>('JWT_2FA_SECRET'),
      });

      if (payload.type !== '2fa_pending') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload.sub; // userId
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired 2FA token');
    }
  }

  /**
   * Get user with 2FA status for verification
   */
  async getUserWithTwoFactorStatus(
    userId: string,
  ): Promise<UserWithTenant & { totpEnabled: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.isActive || !user.tenant.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      tenantId: user.tenantId,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        isActive: user.tenant.isActive,
      },
      totpEnabled: user.totpEnabled,
    };
  }

  /**
   * Verify password against hash (for 2FA disable)
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Log admin action for audit
   */
  async logAdminAction(action: AdminAction): Promise<void> {
    this.logger.warn(
      `Admin action: ${action.action} by admin ${action.adminId}${action.targetUserId ? ` on user ${action.targetUserId}` : ''}`,
    );
    // Store in auth audit log
    const tenantId = (await this.getUserTenant(action.adminId)).tenantId;
    await this.prisma.authAuditLog.create({
      data: {
        userId: action.adminId,
        tenantId: tenantId,
        action: 'admin_action',
        status: 'success',
        details: action as any,
      },
    });
  }

  /**
   * Get user with tenant info by ID
   */
  private async getUserTenant(userId: string): Promise<{ tenantId: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  /**
   * Update user's last login info
   */
  async updateLastLogin(userId: string, ip?: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });
  }

  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;

  /**
   * Record failed login attempt and lock account if threshold exceeded
   */
  async recordFailedLogin(userId: string): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: { increment: 1 } },
      select: { failedAttempts: true },
    });

    this.logger.warn(
      `Failed login attempt for user ${userId} (attempt ${user.failedAttempts}/${this.MAX_FAILED_ATTEMPTS})`,
    );

    if (user.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000);
      await this.prisma.user.update({
        where: { id: userId },
        data: { lockedUntil },
      });
      this.logger.warn(`Account locked for user ${userId} until ${lockedUntil.toISOString()}`);
    }
  }

  /**
   * Reset failed login attempts on successful login
   */
  async resetFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  }

  /**
   * Log auth event to audit log
   */
  async logAuthEvent(params: {
    userId?: string;
    tenantId: string;
    action: string;
    status: 'success' | 'failed' | 'blocked';
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.authAuditLog.create({
        data: {
          userId: params.userId,
          tenantId: params.tenantId,
          action: params.action,
          status: params.status,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          details: (params.details ?? {}) as Record<string, string>,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log auth event', error.stack);
    }
  }

  /**
   * Find user by email and tenant ID (for passkey/magic-link flows)
   */
  async findUserByEmailAndTenant(email: string, tenantId: string): Promise<UserWithTenant | null> {
    const user = await this.prisma.user.findFirst({
      where: { email, tenantId, isActive: true },
      include: { tenant: true },
    });

    if (!user || !user.tenant.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      tenantId: user.tenantId,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        isActive: user.tenant.isActive,
      },
    };
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(userId: string): Promise<{ locked: boolean; until?: Date }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lockedUntil: true },
    });

    if (!user?.lockedUntil) {
      return { locked: false };
    }

    if (user.lockedUntil < new Date()) {
      // Lock expired, clear it
      await this.prisma.user.update({
        where: { id: userId },
        data: { lockedUntil: null },
      });
      return { locked: false };
    }

    return { locked: true, until: user.lockedUntil };
  }
}
