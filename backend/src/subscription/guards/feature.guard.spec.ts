import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  FeatureGuard,
  RequireFeature,
  REQUIRED_FEATURE_KEY,
  createFeatureGuard,
} from './feature.guard';
import { FeatureAccessService } from '../services/feature-access.service';

describe('FeatureGuard', () => {
  let guard: FeatureGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let featureAccessService: {
    canAccessFeatures: jest.Mock;
    assertCanAccessFeature: jest.Mock;
  };

  const TENANT_ID = 'tenant-uuid-001';

  const createMockContext = (
    overrides: { tenantId?: string; handler?: unknown; cls?: unknown } = {},
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ tenantId: overrides.tenantId }),
      }),
      getHandler: () => overrides.handler ?? jest.fn(),
      getClass: () => overrides.cls ?? jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    featureAccessService = {
      canAccessFeatures: jest.fn(),
      assertCanAccessFeature: jest.fn(),
    };

    guard = new FeatureGuard(
      reflector as unknown as Reflector,
      featureAccessService as unknown as FeatureAccessService,
    );
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // =========================================================================
  // canActivate — no features required
  // =========================================================================
  describe('when no features are required', () => {
    it('should return true when requiredFeatures is null', async () => {
      reflector.getAllAndOverride.mockReturnValue(null);
      const ctx = createMockContext({ tenantId: TENANT_ID });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(featureAccessService.canAccessFeatures).not.toHaveBeenCalled();
    });

    it('should return true when requiredFeatures is empty', async () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const ctx = createMockContext({ tenantId: TENANT_ID });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // canActivate — missing tenantId
  // =========================================================================
  describe('when tenantId is missing', () => {
    it('should throw ForbiddenException', async () => {
      reflector.getAllAndOverride.mockReturnValue(['AI_INSPECTIONS']);
      const ctx = createMockContext({ tenantId: undefined });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(ctx)).rejects.toThrow('Tenant ID not found in request');
    });
  });

  // =========================================================================
  // canActivate — all features allowed
  // =========================================================================
  describe('when all features are allowed', () => {
    it('should return true', async () => {
      reflector.getAllAndOverride.mockReturnValue(['AI_INSPECTIONS']);
      featureAccessService.canAccessFeatures.mockResolvedValue({
        AI_INSPECTIONS: { allowed: true },
      });
      const ctx = createMockContext({ tenantId: TENANT_ID });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(featureAccessService.canAccessFeatures).toHaveBeenCalledWith(TENANT_ID, [
        'AI_INSPECTIONS',
      ]);
    });
  });

  // =========================================================================
  // canActivate — feature not available
  // =========================================================================
  describe('when feature is not available', () => {
    it('should throw ForbiddenException with feature details', async () => {
      reflector.getAllAndOverride.mockReturnValue(['AI_INSPECTIONS']);
      featureAccessService.canAccessFeatures.mockResolvedValue({
        AI_INSPECTIONS: {
          allowed: false,
          reason: 'Requires PRO plan',
          requiredPlan: 'PRO',
          requiresAiAddon: false,
        },
      });
      const ctx = createMockContext({ tenantId: TENANT_ID });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('should include missing features in error body', async () => {
      reflector.getAllAndOverride.mockReturnValue(['AI_INSPECTIONS', 'VOICE_ASSISTANT']);
      featureAccessService.canAccessFeatures.mockResolvedValue({
        AI_INSPECTIONS: { allowed: false, reason: 'Needs upgrade', requiredPlan: 'PRO' },
        VOICE_ASSISTANT: { allowed: true },
      });
      const ctx = createMockContext({ tenantId: TENANT_ID });

      try {
        await guard.canActivate(ctx);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = (error as ForbiddenException).getResponse() as Record<string, unknown>;
        expect(response.features).toEqual(['AI_INSPECTIONS']);
        expect(response.code).toBe('FEATURE_NOT_AVAILABLE');
      }
    });

    it('should use default message when reason is not provided', async () => {
      reflector.getAllAndOverride.mockReturnValue(['SOME_FEATURE']);
      featureAccessService.canAccessFeatures.mockResolvedValue({
        SOME_FEATURE: { allowed: false, reason: undefined },
      });
      const ctx = createMockContext({ tenantId: TENANT_ID });

      try {
        await guard.canActivate(ctx);
        fail('Expected ForbiddenException');
      } catch (error) {
        const response = (error as ForbiddenException).getResponse() as Record<string, unknown>;
        expect(response.message).toContain('SOME_FEATURE');
      }
    });
  });

  // =========================================================================
  // canActivate — multiple features, some missing
  // =========================================================================
  describe('when multiple features are checked', () => {
    it('should list all missing features', async () => {
      reflector.getAllAndOverride.mockReturnValue(['FEAT_A', 'FEAT_B', 'FEAT_C']);
      featureAccessService.canAccessFeatures.mockResolvedValue({
        FEAT_A: { allowed: false, reason: 'Need PRO' },
        FEAT_B: { allowed: true },
        FEAT_C: { allowed: false, reason: 'Need Enterprise' },
      });
      const ctx = createMockContext({ tenantId: TENANT_ID });

      try {
        await guard.canActivate(ctx);
        fail('Expected ForbiddenException');
      } catch (error) {
        const response = (error as ForbiddenException).getResponse() as Record<string, unknown>;
        expect(response.features).toEqual(['FEAT_A', 'FEAT_C']);
      }
    });
  });
});

// =========================================================================
// RequireFeature decorator
// =========================================================================
describe('RequireFeature', () => {
  it('should set metadata on method descriptor', () => {
    const descriptor = { value: jest.fn() };
    const decorator = RequireFeature('AI_INSPECTIONS' as never);

    decorator({}, 'testMethod', descriptor);

    const metadata = Reflect.getMetadata(REQUIRED_FEATURE_KEY, descriptor.value);
    expect(metadata).toEqual(['AI_INSPECTIONS']);
  });

  it('should set metadata on class', () => {
    class TestClass {}
    const decorator = RequireFeature('AI_INSPECTIONS' as never);

    decorator(TestClass);

    const metadata = Reflect.getMetadata(REQUIRED_FEATURE_KEY, TestClass);
    expect(metadata).toEqual(['AI_INSPECTIONS']);
  });
});

// =========================================================================
// createFeatureGuard factory
// =========================================================================
describe('createFeatureGuard', () => {
  it('should create a guard class', () => {
    const GuardClass = createFeatureGuard('AI_INSPECTIONS' as never);
    expect(GuardClass).toBeDefined();
  });

  it('should throw ForbiddenException when tenantId missing', async () => {
    const GuardClass = createFeatureGuard('AI_INSPECTIONS' as never);
    const mockFeatureService = {
      assertCanAccessFeature: jest.fn(),
    };

    const guardInstance = new (GuardClass as new (...args: unknown[]) => {
      canActivate: (ctx: ExecutionContext) => Promise<boolean>;
    })(mockFeatureService);

    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ tenantId: undefined }) }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;

    await expect(guardInstance.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should return true when feature is accessible', async () => {
    const GuardClass = createFeatureGuard('AI_INSPECTIONS' as never);
    const mockFeatureService = {
      assertCanAccessFeature: jest.fn().mockResolvedValue(undefined),
    };

    const guardInstance = new (GuardClass as new (...args: unknown[]) => {
      canActivate: (ctx: ExecutionContext) => Promise<boolean>;
    })(mockFeatureService);

    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ tenantId: 'tenant-001' }) }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;

    const result = await guardInstance.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockFeatureService.assertCanAccessFeature).toHaveBeenCalledWith(
      'tenant-001',
      'AI_INSPECTIONS',
    );
  });
});
