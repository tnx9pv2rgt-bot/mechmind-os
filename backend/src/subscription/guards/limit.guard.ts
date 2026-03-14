/**
 * LIMIT GUARD
 *
 * Enforces plan limits on resource creation
 * Usage: @UseGuards(LimitGuard('user')) to check user limit before creating
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { FeatureAccessService } from '../services/feature-access.service';
import { PlanLimits } from '../config/pricing.config';

export const LIMIT_CHECK_KEY = 'limitCheck';

export type LimitCheckType = 'user' | 'location' | 'customer' | 'apiCall' | 'storage';

export function CheckLimit(limitType: LimitCheckType) {
  return function (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(LIMIT_CHECK_KEY, limitType, descriptor.value);
  };
}

@Injectable()
export class LimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureAccessService: FeatureAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitType = this.reflector.getAllAndOverride<LimitCheckType>(LIMIT_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!limitType) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant ID not found in request');
    }

    const limitTypeMap: Record<string, keyof PlanLimits> = {
      user: 'maxUsers',
      location: 'maxLocations',
      customer: 'maxCustomers',
      apiCall: 'maxApiCallsPerMonth',
      storage: 'maxStorageBytes',
    };

    if (limitType === 'apiCall' || limitType === 'storage') {
      // These are usage-based, check if within limit
      const check = await this.featureAccessService.checkSpecificLimit(
        tenantId,
        limitTypeMap[limitType],
      );

      if (!check.withinLimit) {
        throw new ForbiddenException({
          message: `You have exceeded your ${limitType} limit for this billing period. Please upgrade your plan.`,
          limit: check.limit,
          current: check.current,
          code: 'LIMIT_EXCEEDED',
        });
      }
    } else {
      // These are resource-based, check if we can add one more
      const check = await this.featureAccessService.canAddResource(
        tenantId,
        limitType as 'user' | 'location' | 'customer',
      );

      if (!check.withinLimit) {
        const resourceName =
          limitType === 'user' ? 'users' : limitType === 'location' ? 'locations' : 'customers';
        throw new ForbiddenException({
          message: `You have reached your ${resourceName} limit. Please upgrade your plan to add more.`,
          limit: check.limit,
          current: check.current,
          code: 'LIMIT_EXCEEDED',
        });
      }
    }

    return true;
  }
}

/**
 * Middleware to track API usage
 */
@Injectable()
export class ApiUsageMiddleware {
  constructor(private featureAccessService: FeatureAccessService) {}

  async use(req: Request & { tenantId?: string; path: string }, _res: Response, next: () => void) {
    const tenantId = req.tenantId;

    if (tenantId) {
      // Track API call asynchronously (don't wait)
      this.featureAccessService.recordApiCall(tenantId, req.path, 0).catch(() => {
        // Silently fail tracking errors
      });
    }

    next();
  }
}

/**
 * Factory function to create a limit guard for specific resource types
 */
export function createLimitGuard(
  resourceType: 'user' | 'location' | 'customer',
): Type<CanActivate> {
  @Injectable()
  class DynamicLimitGuard implements CanActivate {
    constructor(private featureAccessService: FeatureAccessService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const tenantId = request.tenantId;

      if (!tenantId) {
        throw new ForbiddenException('Tenant ID not found in request');
      }

      const check = await this.featureAccessService.canAddResource(tenantId, resourceType);

      if (!check.withinLimit) {
        const resourceName =
          resourceType === 'user'
            ? 'users'
            : resourceType === 'location'
              ? 'locations'
              : 'customers';
        throw new ForbiddenException({
          message: `You have reached your ${resourceName} limit. Please upgrade your plan to add more.`,
          limit: check.limit,
          current: check.current,
          code: 'LIMIT_EXCEEDED',
        });
      }

      return true;
    }
  }

  return DynamicLimitGuard;
}
