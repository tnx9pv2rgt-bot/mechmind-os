/**
 * FEATURE GUARD
 *
 * Protects routes based on subscription features
 * Usage: @UseGuards(FeatureGuard(FeatureFlag.AI_INSPECTIONS))
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlag } from '@prisma/client';
import { FeatureAccessService } from '../services/feature-access.service';

export const REQUIRED_FEATURE_KEY = 'requiredFeature';

export function RequireFeature(...features: FeatureFlag[]) {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    if (descriptor) {
      // Method decorator
      Reflect.defineMetadata(REQUIRED_FEATURE_KEY, features, descriptor.value);
    } else {
      // Class decorator
      Reflect.defineMetadata(REQUIRED_FEATURE_KEY, features, target);
    }
  };
}

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureAccessService: FeatureAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required features from method or class decorator
    const requiredFeatures = this.reflector.getAllAndOverride<FeatureFlag[]>(REQUIRED_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true; // No feature requirements
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant ID not found in request');
    }

    // Check all required features
    const checks = await this.featureAccessService.canAccessFeatures(tenantId, requiredFeatures);

    const missingFeatures = requiredFeatures.filter(feature => !checks[feature].allowed);

    if (missingFeatures.length > 0) {
      const firstMissing = missingFeatures[0];
      const check = checks[firstMissing];

      throw new ForbiddenException({
        message: check.reason || `Feature ${firstMissing} is not available`,
        features: missingFeatures,
        requiredPlan: check.requiredPlan,
        requiresAiAddon: check.requiresAiAddon,
        code: 'FEATURE_NOT_AVAILABLE',
      });
    }

    return true;
  }
}

/**
 * Factory function to create a feature guard for specific features
 */
export function createFeatureGuard(...features: FeatureFlag[]): Type<CanActivate> {
  @Injectable()
  class DynamicFeatureGuard implements CanActivate {
    constructor(private featureAccessService: FeatureAccessService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const tenantId = request.tenantId;

      if (!tenantId) {
        throw new ForbiddenException('Tenant ID not found in request');
      }

      await this.featureAccessService.assertCanAccessFeature(tenantId, features[0]);
      return true;
    }
  }

  return DynamicFeatureGuard;
}
