import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, JwtPayload } from '../services/auth.service';

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
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
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

      // Store tenant context in request for middleware
      (req as any).tenantId = tenantId;
      (req as any).userId = userId;

      return {
        userId,
        email: payload.email,
        role: payload.role,
        tenantId,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token format');
    }
  }
}
