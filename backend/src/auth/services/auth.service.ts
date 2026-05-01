import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';
import { MetricsService } from '@common/metrics/metrics.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { PasswordPolicyService } from './password-policy.service';
import { JwksService } from './jwks.service';

export interface JwtPayload {
  sub: string; // userId:tenantId format
  email: string;
  role: string;
  tenantId: string;
  jti?: string; // JWT ID for token revocation
  familyId?: string; // Refresh token family for rotation/reuse detection
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

export interface RegisterTenantInput {
  shopName: string;
  slug: string;
  name: string;
  email: string;
  password: string;
}

export interface RegisterTenantResult {
  tokens: AuthTokens;
  tenant: { id: string; name: string; slug: string };
  user: { id: string; email: string; name: string; role: string };
}

export interface AdminAction {
  adminId: string;
  action: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
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
    private readonly tokenBlacklist: TokenBlacklistService,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly jwksService: JwksService,
    private readonly metrics: MetricsService,
  ) {}

  /**
   * Register a new tenant with its first admin user.
   * Creates tenant + user in a single transaction, returns JWT tokens.
   */
  async registerTenant(input: RegisterTenantInput): Promise<RegisterTenantResult> {
    const { shopName, slug, name, email, password } = input;

    // NIST 800-63B password validation (no complexity rules, breach screening)
    await this.passwordPolicy.validatePassword(password, { email, name, shopName });

    // Check slug uniqueness
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });
    if (existingTenant) {
      throw new ConflictException('Questo slug è già in uso');
    }

    // Hash password (bcrypt, 12 rounds)
    const passwordHash = await this.hashPassword(password);

    // Create tenant + admin user in a single transaction
    const result = await this.prisma.$transaction(async tx => {
      const tenant = await tx.tenant.create({
        data: {
          name: shopName.trim(),
          slug,
          isActive: true,
          settings: {},
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: email.toLowerCase().trim(),
          name: name.trim(),
          passwordHash,
          role: 'ADMIN',
          isActive: true,
        },
      });

      return { tenant, user };
    });

    // Generate JWT tokens
    const userWithTenant: UserWithTenant = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      isActive: true,
      tenantId: result.tenant.id,
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        isActive: true,
      },
    };

    const tokens = await this.generateTokens(userWithTenant);

    // Audit log
    await this.logAuthEvent({
      userId: result.user.id,
      tenantId: result.tenant.id,
      action: 'register',
      status: 'success',
      details: { slug, shopName },
    }).catch(() => {
      /* non-blocking */
    });

    this.logger.log(`New tenant registered: ${slug} (${result.tenant.id})`);

    return {
      tokens,
      tenant: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug },
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    };
  }

  /**
   * Validate user credentials and return user with tenant info
   */
  async validateUser(email: string, password: string, tenantSlug: string): Promise<UserWithTenant> {
    // Find tenant first
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant || !tenant.isActive) {
      this.metrics.authFailuresTotal.inc({ reason: 'invalid_tenant' });
      throw new UnauthorizedException('Invalid tenant or tenant is inactive');
    }

    // Set tenant context for RLS before querying users
    await this.prisma.setTenantContext(tenant.id);

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
      this.metrics.authFailuresTotal.inc({ reason: 'invalid_credentials' });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password (supports bcrypt → argon2id transparent migration)
    const { valid: isPasswordValid, newHash } = await this.verifyAndMigratePassword(
      password,
      user.passwordHash || '',
    );

    if (!isPasswordValid) {
      this.metrics.authFailuresTotal.inc({ reason: 'invalid_password' });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Transparent migration: rehash bcrypt → argon2id on successful login
    if (newHash) {
      await this.prisma.user
        .update({
          where: { id: user.id },
          data: { passwordHash: newHash },
        })
        .catch(() => {
          /* non-blocking migration */
        });
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
   * Generate JWT tokens for authenticated user.
   * Access token: 15 min (short-lived).
   * Refresh token: 7 days, includes familyId for rotation tracking.
   * On first login, a new familyId is created. On refresh, the existing familyId is reused.
   */
  async generateTokens(user: UserWithTenant, familyId?: string): Promise<AuthTokens> {
    // Create compound subject: userId:tenantId
    const subject = `${user.id}:${user.tenantId}`;

    const accessPayload: JwtPayload = {
      sub: subject,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      jti: randomUUID(),
    };

    // Refresh token gets its own JTI and a familyId for rotation tracking
    const refreshFamilyId = familyId || randomUUID();
    const refreshPayload: JwtPayload = {
      sub: subject,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      jti: randomUUID(),
      familyId: refreshFamilyId,
    };

    // Use ES256 asymmetric signing if configured, otherwise HS256
    const signingOpts = this.jwksService.getSigningOptions();
    const accessSignOpts: Record<string, unknown> = {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    };
    const refreshSignOpts: Record<string, unknown> = {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    };

    if (signingOpts.algorithm === 'ES256') {
      // Asymmetric: sign with private key, include kid in header
      accessSignOpts.algorithm = 'ES256';
      accessSignOpts.privateKey = signingOpts.privateKey;
      accessSignOpts.header = { ...signingOpts.header, alg: 'ES256', typ: 'JWT' };
      refreshSignOpts.algorithm = 'ES256';
      refreshSignOpts.privateKey = signingOpts.privateKey;
      refreshSignOpts.header = { ...signingOpts.header, alg: 'ES256', typ: 'JWT' };
    } else {
      // Symmetric: use secrets
      accessSignOpts.secret = this.configService.get<string>('JWT_SECRET');
      refreshSignOpts.secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, accessSignOpts),
      this.jwtService.signAsync(refreshPayload, refreshSignOpts),
    ]);

    const expiresIn = parseInt(this.configService.get<string>('JWT_EXPIRES_IN_SECONDS', '900'));

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Refresh access token using refresh token.
   * Implements rotation: each refresh issues a new refresh token and blacklists the old one.
   * Reuse detection: if a previously-used refresh token is presented again,
   * ALL sessions for that user are invalidated (stolen token scenario).
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { jti, familyId, sub } = payload;
    const [userId, tenantId] = sub.split(':');

    // 1. Check if the refresh token family has been revoked
    if (familyId) {
      const familyRevoked = await this.tokenBlacklist.isRefreshFamilyRevoked(familyId);
      if (familyRevoked) {
        this.logger.warn(
          `Refresh attempt on revoked family ${familyId.slice(0, 8)}... by user ${userId}`,
        );
        throw new UnauthorizedException('Session revoked — please log in again');
      }
    }

    // 2. Check if this specific refresh token was already used (reuse detection)
    if (jti && familyId) {
      const isReuse = await this.tokenBlacklist.markRefreshTokenUsed(jti, familyId);
      if (isReuse) {
        // REUSE DETECTED — invalidate entire family + all user sessions
        this.logger.warn(
          `Refresh token reuse detected for user ${userId} — invalidating all sessions`,
        );
        await this.tokenBlacklist.invalidateRefreshFamily(familyId);
        await this.tokenBlacklist.invalidateAllUserSessions(userId);

        await this.logAuthEvent({
          userId,
          tenantId,
          action: 'refresh_token_reuse',
          status: 'blocked',
          details: { familyId, jti },
        }).catch(() => {
          /* non-blocking */
        });

        throw new UnauthorizedException('Token reuse detected — all sessions invalidated');
      }
    }

    // 3. Verify user still exists and is active
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

    // 4. Generate new token pair with the SAME familyId (rotation)
    return this.generateTokens(userWithTenant, familyId);
  }

  /**
   * Logout: blacklist access token + revoke refresh family + deactivate session.
   * Big tech pattern: logout invalidates ALL tokens in the family chain,
   * preventing stolen refresh tokens from being used after logout.
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async logout(token: string, refreshToken?: string): Promise<void> {
    try {
      // 1. Blacklist the access token
      const payload = this.jwtService.decode(token) as JwtPayload;
      if (payload?.jti && payload?.exp) {
        const ttl = payload.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.tokenBlacklist.blacklistToken(payload.jti, ttl);
        }
      }

      // 2. Revoke the refresh token family (prevents reuse of stolen refresh tokens)
      if (refreshToken) {
        try {
          const refreshPayload = this.jwtService.decode(refreshToken) as JwtPayload;
          if (refreshPayload?.familyId) {
            await this.tokenBlacklist.invalidateRefreshFamily(refreshPayload.familyId);
          }
          if (refreshPayload?.jti && refreshPayload?.exp) {
            const refreshTtl = refreshPayload.exp - Math.floor(Date.now() / 1000);
            if (refreshTtl > 0) {
              await this.tokenBlacklist.blacklistToken(refreshPayload.jti, refreshTtl);
            }
          }
        } catch {
          // Refresh token parsing failed — continue with access token blacklist only
        }
      }

      // 3. Deactivate the session in DB
      if (payload?.sub) {
        const userId = this.extractUserIdFromPayload(payload);
        await this.prisma.session
          .updateMany({
            where: { jwtToken: token, userId, isActive: true },
            data: { isActive: false, revokedAt: new Date(), revokedReason: 'logout' },
          })
          .catch(() => {});
      }
    } catch {
      // Token already invalid, nothing to blacklist
    }
  }

  /**
   * Invalidate all sessions for a user (e.g., on password change)
   */
  async invalidateAllSessions(userId: string): Promise<void> {
    await this.tokenBlacklist.invalidateAllUserSessions(userId);
  }

  /**
   * Check if a token is still valid (not blacklisted, session not invalidated)
   */
  async isTokenValid(payload: JwtPayload): Promise<boolean> {
    if (payload.jti) {
      const blacklisted = await this.tokenBlacklist.isBlacklisted(payload.jti);
      if (blacklisted) return false;
    }
    const userId = this.extractUserIdFromPayload(payload);
    const isValid = await this.tokenBlacklist.isSessionValid(userId, payload.iat ?? 0);
    return isValid;
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
   * Hash password with Argon2id (OWASP 2024 recommendation).
   * Parameters: m=47104 KiB (46 MiB), t=1 iteration, p=1 parallelism.
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 47104, // 46 MiB
      timeCost: 1,
      parallelism: 1,
      hashLength: 32,
    });
  }

  /**
   * Verify password against stored hash.
   * Supports both Argon2id and legacy bcrypt hashes.
   * On successful bcrypt verification, returns the new Argon2id hash for migration.
   */
  async verifyAndMigratePassword(
    password: string,
    storedHash: string,
  ): Promise<{ valid: boolean; newHash?: string }> {
    if (!storedHash) return { valid: false };

    // Legacy bcrypt hash ($2b$ or $2a$)
    if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
      const valid = await bcrypt.compare(password, storedHash);
      if (valid) {
        // Rehash with Argon2id for migration
        const newHash = await this.hashPassword(password);
        return { valid: true, newHash };
      }
      return { valid: false };
    }

    // Argon2id hash ($argon2id$)
    const valid = await argon2.verify(storedHash, password);
    return { valid };
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
    } catch (_error) {
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
   * Verify password against hash (for 2FA disable).
   * Supports both Argon2id and legacy bcrypt.
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!hash) return false;
    if (hash.startsWith('$argon2')) {
      return argon2.verify(hash, password);
    }
    return bcrypt.compare(password, hash);
  }

  /**
   * Log admin action for audit
   */
  async logAdminAction(action: AdminAction): Promise<void> {
    this.logger.warn(
      // eslint-disable-next-line sonarjs/no-nested-template-literals
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
        details: action as unknown as Prisma.InputJsonValue,
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
