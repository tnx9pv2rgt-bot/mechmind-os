import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  LimitGuard,
  CheckLimit,
  LIMIT_CHECK_KEY,
  ApiUsageMiddleware,
  createLimitGuard,
} from './limit.guard';
import { FeatureAccessService } from '../services/feature-access.service';
import { Request, Response } from 'express';

describe('LimitGuard', () => {
  let guard: LimitGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let featureAccessService: {
    checkSpecificLimit: jest.Mock;
    canAddResource: jest.Mock;
    recordApiCall: jest.Mock;
  };

  const TENANT_ID = 'tenant-uuid-001';

  const createMockContext = (overrides: { tenantId?: string } = {}): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ tenantId: overrides.tenantId }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    featureAccessService = {
      checkSpecificLimit: jest.fn(),
      canAddResource: jest.fn(),
      recordApiCall: jest.fn(),
    };

    guard = new LimitGuard(
      reflector as unknown as Reflector,
      featureAccessService as unknown as FeatureAccessService,
    );
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // =========================================================================
  // No limit check configured
  // =========================================================================
  describe('when no limit check is configured', () => {
    it('should return true when limitType is null', async () => {
      reflector.getAllAndOverride.mockReturnValue(null);
      const ctx = createMockContext({ tenantId: TENANT_ID });

      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('should return true when limitType is undefined', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const ctx = createMockContext({ tenantId: TENANT_ID });

      expect(await guard.canActivate(ctx)).toBe(true);
    });
  });

  // =========================================================================
  // Missing tenantId
  // =========================================================================
  describe('when tenantId is missing', () => {
    it('should throw ForbiddenException', async () => {
      reflector.getAllAndOverride.mockReturnValue('user');
      const ctx = createMockContext({ tenantId: undefined });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(ctx)).rejects.toThrow('Tenant ID not found in request');
    });
  });

  // =========================================================================
  // Resource-based limits (user, location, customer)
  // =========================================================================
  describe('resource-based limits', () => {
    it.each(['user', 'location', 'customer'] as const)(
      'should return true when %s limit is not exceeded',
      async resourceType => {
        reflector.getAllAndOverride.mockReturnValue(resourceType);
        featureAccessService.canAddResource.mockResolvedValue({
          withinLimit: true,
          limit: 10,
          current: 5,
        });
        const ctx = createMockContext({ tenantId: TENANT_ID });

        expect(await guard.canActivate(ctx)).toBe(true);
        expect(featureAccessService.canAddResource).toHaveBeenCalledWith(TENANT_ID, resourceType);
      },
    );

    it('should throw ForbiddenException when user limit exceeded', async () => {
      reflector.getAllAndOverride.mockReturnValue('user');
      featureAccessService.canAddResource.mockResolvedValue({
        withinLimit: false,
        limit: 5,
        current: 5,
      });
      const ctx = createMockContext({ tenantId: TENANT_ID });

      try {
        await guard.canActivate(ctx);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = (error as ForbiddenException).getResponse() as Record<string, unknown>;
        expect(response.code).toBe('LIMIT_EXCEEDED');
        expect(response.limit).toBe(5);
        expect(response.current).toBe(5);
        expect(response.message as string).toContain('users');
      }
    });

    it('should use "locations" in error message for location type', async () => {
      reflector.getAllAndOverride.mockReturnValue('location');
      featureAccessService.canAddResource.mockResolvedValue({
        withinLimit: false,
        limit: 3,
        current: 3,
      });
      const ctx = createMockContext({ tenantId: TENANT_ID });

      try {
        await guard.canActivate(ctx);
        fail('Expected ForbiddenException');
      } catch (error) {
        const response = (error as ForbiddenException).getResponse() as Record<string, unknown>;
        expect(response.message as string).toContain('locations');
      }
    });

    it('should use "customers" in error message for customer type', async () => {
      reflector.getAllAndOverride.mockReturnValue('customer');
      featureAccessService.canAddResource.mockResolvedValue({
        withinLimit: false,
        limit: 100,
        current: 100,
      });
      const ctx = createMockContext({ tenantId: TENANT_ID });

      try {
        await guard.canActivate(ctx);
        fail('Expected ForbiddenException');
      } catch (error) {
        const response = (error as ForbiddenException).getResponse() as Record<string, unknown>;
        expect(response.message as string).toContain('customers');
      }
    });
  });

  // =========================================================================
  // Usage-based limits (apiCall, storage)
  // =========================================================================
  describe('usage-based limits', () => {
    it('should return true when apiCall limit is not exceeded', async () => {
      reflector.getAllAndOverride.mockReturnValue('apiCall');
      featureAccessService.checkSpecificLimit.mockResolvedValue({
        withinLimit: true,
        limit: 10000,
        current: 5000,
      });
      const ctx = createMockContext({ tenantId: TENANT_ID });

      expect(await guard.canActivate(ctx)).toBe(true);
      expect(featureAccessService.checkSpecificLimit).toHaveBeenCalledWith(
        TENANT_ID,
        'maxApiCallsPerMonth',
      );
    });

    it('should throw ForbiddenException when apiCall limit exceeded', async () => {
      reflector.getAllAndOverride.mockReturnValue('apiCall');
      featureAccessService.checkSpecificLimit.mockResolvedValue({
        withinLimit: false,
        limit: 10000,
        current: 10001,
      });
      const ctx = createMockContext({ tenantId: TENANT_ID });

      try {
        await guard.canActivate(ctx);
        fail('Expected ForbiddenException');
      } catch (error) {
        const response = (error as ForbiddenException).getResponse() as Record<string, unknown>;
        expect(response.code).toBe('LIMIT_EXCEEDED');
        expect(response.message as string).toContain('apiCall');
      }
    });

    it('should check storage limit correctly', async () => {
      reflector.getAllAndOverride.mockReturnValue('storage');
      featureAccessService.checkSpecificLimit.mockResolvedValue({
        withinLimit: false,
        limit: 1073741824,
        current: 1073741825,
      });
      const ctx = createMockContext({ tenantId: TENANT_ID });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      expect(featureAccessService.checkSpecificLimit).toHaveBeenCalledWith(
        TENANT_ID,
        'maxStorageBytes',
      );
    });
  });
});

// =========================================================================
// CheckLimit decorator
// =========================================================================
describe('CheckLimit', () => {
  it('should set metadata on method descriptor', () => {
    const descriptor = { value: jest.fn() };
    const decorator = CheckLimit('user');

    decorator({}, 'testMethod', descriptor);

    const metadata = Reflect.getMetadata(LIMIT_CHECK_KEY, descriptor.value);
    expect(metadata).toBe('user');
  });
});

// =========================================================================
// ApiUsageMiddleware
// =========================================================================
describe('ApiUsageMiddleware', () => {
  let middleware: ApiUsageMiddleware;
  let featureAccessService: { recordApiCall: jest.Mock };

  beforeEach(() => {
    featureAccessService = {
      recordApiCall: jest.fn().mockResolvedValue(undefined),
    };
    middleware = new ApiUsageMiddleware(featureAccessService as unknown as FeatureAccessService);
  });

  it('should call next()', () => {
    const next = jest.fn();
    const req = { tenantId: 'tenant-001', path: '/api/v1/test' } as unknown as Request & {
      tenantId?: string;
      path: string;
    };
    const res = {} as Response;

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should record API call when tenantId is present', () => {
    const next = jest.fn();
    const req = { tenantId: 'tenant-001', path: '/api/v1/test' } as unknown as Request & {
      tenantId?: string;
      path: string;
    };

    middleware.use(req, {} as Response, next);

    expect(featureAccessService.recordApiCall).toHaveBeenCalledWith(
      'tenant-001',
      '/api/v1/test',
      0,
    );
  });

  it('should not record API call when tenantId is absent', () => {
    const next = jest.fn();
    const req = { path: '/health' } as unknown as Request & {
      tenantId?: string;
      path: string;
    };

    middleware.use(req, {} as Response, next);

    expect(featureAccessService.recordApiCall).not.toHaveBeenCalled();
  });

  it('should silently swallow tracking errors', () => {
    const next = jest.fn();
    featureAccessService.recordApiCall.mockRejectedValue(new Error('Redis down'));
    const req = { tenantId: 'tenant-001', path: '/test' } as unknown as Request & {
      tenantId?: string;
      path: string;
    };

    // Should not throw
    expect(() => middleware.use(req, {} as Response, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });
});

// =========================================================================
// createLimitGuard factory
// =========================================================================
describe('createLimitGuard', () => {
  it('should create a guard class for each resource type', () => {
    for (const type of ['user', 'location', 'customer'] as const) {
      const GuardClass = createLimitGuard(type);
      expect(GuardClass).toBeDefined();
    }
  });

  it('should throw ForbiddenException when tenantId missing', async () => {
    const GuardClass = createLimitGuard('user');
    const mockService = { canAddResource: jest.fn() };
    const instance = new (GuardClass as new (...args: unknown[]) => {
      canActivate: (ctx: ExecutionContext) => Promise<boolean>;
    })(mockService);

    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ tenantId: undefined }) }),
    } as unknown as ExecutionContext;

    await expect(instance.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should return true when within limit', async () => {
    const GuardClass = createLimitGuard('user');
    const mockService = {
      canAddResource: jest.fn().mockResolvedValue({ withinLimit: true }),
    };
    const instance = new (GuardClass as new (...args: unknown[]) => {
      canActivate: (ctx: ExecutionContext) => Promise<boolean>;
    })(mockService);

    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ tenantId: 'tenant-001' }) }),
    } as unknown as ExecutionContext;

    expect(await instance.canActivate(ctx)).toBe(true);
  });

  it('should throw when limit exceeded', async () => {
    const GuardClass = createLimitGuard('location');
    const mockService = {
      canAddResource: jest.fn().mockResolvedValue({
        withinLimit: false,
        limit: 3,
        current: 3,
      }),
    };
    const instance = new (GuardClass as new (...args: unknown[]) => {
      canActivate: (ctx: ExecutionContext) => Promise<boolean>;
    })(mockService);

    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ tenantId: 'tenant-001' }) }),
    } as unknown as ExecutionContext;

    try {
      await instance.canActivate(ctx);
      fail('Expected ForbiddenException');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      const response = (error as ForbiddenException).getResponse() as Record<string, unknown>;
      expect(response.message as string).toContain('locations');
    }
  });

  it('should show "customers" for customer type', async () => {
    const GuardClass = createLimitGuard('customer');
    const mockService = {
      canAddResource: jest.fn().mockResolvedValue({
        withinLimit: false,
        limit: 100,
        current: 100,
      }),
    };
    const instance = new (GuardClass as new (...args: unknown[]) => {
      canActivate: (ctx: ExecutionContext) => Promise<boolean>;
    })(mockService);

    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ tenantId: 'tenant-001' }) }),
    } as unknown as ExecutionContext;

    try {
      await instance.canActivate(ctx);
      fail('Expected ForbiddenException');
    } catch (error) {
      const response = (error as ForbiddenException).getResponse() as Record<string, unknown>;
      expect(response.message as string).toContain('customers');
    }
  });
});
