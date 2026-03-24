import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, JwtPayload } from '../services/auth.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { JwksService } from '../services/jwks.service';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly tokenBlacklist: TokenBlacklistService,
    jwksService: JwksService,
  ) {
    const passportOptions = jwksService.getPassportJwtOptions();

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
      ...passportOptions,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<AuthenticatedUser> {
    // Validate payload structure
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: missing subject');
    }

    try {
      const userId = this.authService.extractUserIdFromPayload(payload);
      const tenantId = this.authService.extractTenantIdFromPayload(payload);

      // Check token blacklist and session validity
      if (payload.jti) {
        const isBlacklisted = await this.tokenBlacklist.isBlacklisted(payload.jti);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token revocato');
        }
      }
      const isSessionValid = await this.tokenBlacklist.isSessionValid(userId, payload.iat ?? 0);
      if (!isSessionValid) {
        throw new UnauthorizedException('Sessione invalidata');
      }

      // Store tenant context in request for middleware
      (req as Request & { tenantId?: string; userId?: string }).tenantId = tenantId;
      (req as Request & { tenantId?: string; userId?: string }).userId = userId;

      return {
        userId,
        email: payload.email,
        role: payload.role,
        tenantId,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid token format');
    }
  }
}
