/**
 * MechMind OS - MFA Verification Guard
 *
 * Guard that requires MFA verification for sensitive operations
 * Can be used on endpoints that need additional security beyond JWT
 */

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MfaService } from '../mfa/mfa.service';

export interface MFARequest {
  user: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
  };
  mfaVerified?: boolean;
  mfaVerifiedAt?: Date;
  headers: Record<string, string | string[]>;
}

/**
 * Decorator to mark routes that require MFA verification
 * Usage: @RequireMFA()
 */
export const RequireMFA = () => {
  return (_target: object, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('requireMFA', true, descriptor.value);
    }
    return descriptor;
  };
};

@Injectable()
export class MfaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly mfaService: MfaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if MFA is required for this route
    const requireMFA = this.reflector.getAllAndOverride<boolean>('requireMFA', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requireMFA) {
      return true;
    }

    const request = context.switchToHttp().getRequest<MFARequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check if MFA is enabled for user
    const mfaStatus = await this.mfaService.getStatus(user.userId);

    if (!mfaStatus.enabled) {
      // MFA not enabled, allow access
      return true;
    }

    // Check if MFA was verified recently (within last 10 minutes)
    if (request.mfaVerified && request.mfaVerifiedAt) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      if (new Date(request.mfaVerifiedAt) > tenMinutesAgo) {
        return true;
      }
    }

    // MFA required but not verified recently
    throw new UnauthorizedException({
      message: 'MFA verification required',
      code: 'MFA_REQUIRED',
      requiresMFA: true,
    });
  }
}

/**
 * Middleware to verify MFA session from server-side Redis token
 * Usage: X-MFA-Token: <server-generated-token>
 */
@Injectable()
export class MfaSessionMiddleware {
  constructor(private readonly mfaService: MfaService) {}

  async use(req: MFARequest, _res: unknown, next: () => void): Promise<void> {
    const mfaToken = req.headers['x-mfa-token'] as string;

    if (mfaToken) {
      const userId = await this.mfaService.validateMfaSession(mfaToken);

      if (userId && req.user && userId === req.user.userId) {
        req.mfaVerified = true;
        req.mfaVerifiedAt = new Date();
      }
    }

    next();
  }
}
