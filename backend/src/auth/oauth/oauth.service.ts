import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';
import { AuthService, AuthTokens, UserWithTenant } from '../services/auth.service';
import * as jose from 'jose';

interface GoogleTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

@Injectable()
export class OAuthService {
  private readonly googleClientId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID', '');
  }

  /**
   * Verify Google ID token and login the user
   */
  async loginWithGoogle(credential: string, tenantSlug?: string, ip?: string): Promise<AuthTokens> {
    if (!this.googleClientId) {
      throw new BadRequestException('Google OAuth not configured');
    }

    const payload = await this.verifyGoogleToken(credential);

    if (!payload.email_verified) {
      throw new UnauthorizedException('Google email not verified');
    }

    const user = await this.findUserByOAuthEmail(payload.email, tenantSlug);

    // Update last login
    await this.authService.updateLastLogin(user.id, ip);

    // Log auth event
    await this.authService.logAuthEvent({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'oauth_google_login',
      status: 'success',
      ipAddress: ip,
    });

    return this.authService.generateTokens(user);
  }

  /**
   * Verify Google ID token using Google's JWKS
   */
  private async verifyGoogleToken(credential: string): Promise<GoogleTokenPayload> {
    try {
      const JWKS = jose.createRemoteJWKSet(
        new URL('https://www.googleapis.com/oauth2/v3/certs'),
      );

      const { payload } = await jose.jwtVerify(credential, JWKS, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: this.googleClientId,
      });

      return payload as unknown as GoogleTokenPayload;
    } catch (error) {
      this.logger.error('Google token verification failed', (error as Error).stack);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  /**
   * Find user by email from OAuth provider.
   * For multi-tenant: searches across tenants or within specific tenant.
   */
  private async findUserByOAuthEmail(
    email: string,
    tenantSlug?: string,
  ): Promise<UserWithTenant> {
    if (tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: tenantSlug },
      });

      if (!tenant || !tenant.isActive) {
        throw new UnauthorizedException('Tenant not found or inactive');
      }

      await this.prisma.setTenantContext(tenant.id);

      const user = await this.prisma.user.findFirst({
        where: { email, tenantId: tenant.id, isActive: true },
        include: { tenant: true },
      });

      if (!user) {
        throw new UnauthorizedException(
          'No account found with this email. Contact your administrator.',
        );
      }

      return this.mapUserWithTenant(user);
    }

    // No tenant specified: find user by email across all tenants
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true },
      include: { tenant: true },
    });

    if (!user || !user.tenant.isActive) {
      throw new UnauthorizedException(
        'No account found with this email. Contact your administrator.',
      );
    }

    return this.mapUserWithTenant(user);
  }

  private mapUserWithTenant(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    tenantId: string;
    tenant: { id: string; name: string; slug: string; isActive: boolean };
  }): UserWithTenant {
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
}
