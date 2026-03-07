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
  firstName: string;
  lastName: string;
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
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
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

    const expiresIn = parseInt(
      this.configService.get<string>('JWT_EXPIRES_IN_SECONDS', '86400'),
    );

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
        firstName: user.firstName,
        lastName: user.lastName,
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
   */
  async validateApiKey(apiKey: string): Promise<{ tenantId: string; valid: boolean }> {
    // Implementation depends on your API key storage strategy
    // This is a placeholder - implement based on your requirements
    this.logger.warn('API key validation not fully implemented');
    return { tenantId: '', valid: false };
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
  async getUserWithTwoFactorStatus(userId: string): Promise<UserWithTenant & { totpEnabled: boolean }> {
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
      firstName: user.firstName,
      lastName: user.lastName,
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
    this.logger.warn(`Admin action: ${action.action}`, {
      adminId: action.adminId,
      targetUserId: action.targetUserId,
      timestamp: action.timestamp,
      metadata: action.metadata,
    });
    // Store in audit log
    await this.prisma.mfaAuditLog.create({
      data: {
        userId: action.adminId,
        tenantId: (await this.getUserTenant(action.adminId)).tenantId,
        eventType: 'admin_action',
        eventData: action as any,
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
        failedLogins: 0,
        lockedUntil: null,
      },
    });
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { failedLogins: true },
    });

    const failedLogins = (user?.failedLogins ?? 0) + 1;
    const maxAttempts = 5;
    const lockoutMinutes = 30;

    const updates: any = { failedLogins };
    
    if (failedLogins >= maxAttempts) {
      updates.lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
      this.logger.warn(`Account locked due to failed login attempts`, { userId });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updates,
    });
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
        data: { lockedUntil: null, failedLogins: 0 },
      });
      return { locked: false };
    }

    return { locked: true, until: user.lockedUntil };
  }
}
