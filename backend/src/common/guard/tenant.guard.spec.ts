import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';

describe('TenantGuard', () => {
  let guard: TenantGuard;

  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
  const ANOTHER_UUID = '660e8400-e29b-41d4-a716-446655440000';

  const createMockContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    guard = new TenantGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // =========================================================================
  // Missing tenantId
  // =========================================================================
  describe('when tenantId is missing', () => {
    it('should throw UnauthorizedException for undefined tenantId', () => {
      const ctx = createMockContext({ tenantId: undefined });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(ctx)).toThrow('Tenant ID is required');
    });

    it('should throw UnauthorizedException for null tenantId', () => {
      const ctx = createMockContext({ tenantId: null });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for empty string tenantId', () => {
      const ctx = createMockContext({ tenantId: '' });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // Invalid UUID format
  // =========================================================================
  describe('when tenantId has invalid UUID format', () => {
    it('should throw ForbiddenException for non-UUID string', () => {
      const ctx = createMockContext({ tenantId: 'not-a-uuid' });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(ctx)).toThrow('Invalid tenant ID format');
    });

    it('should throw ForbiddenException for UUID with wrong version', () => {
      // Version 6 is not in [1-5] range
      const ctx = createMockContext({ tenantId: '550e8400-e29b-61d4-a716-446655440000' });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for too-short UUID', () => {
      const ctx = createMockContext({ tenantId: '550e8400-e29b-41d4' });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for UUID with invalid characters', () => {
      const ctx = createMockContext({ tenantId: '550e8400-e29b-41d4-a716-44665544000g' });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // Valid tenant — no user
  // =========================================================================
  describe('when tenantId is valid and no user is present', () => {
    it('should return true', () => {
      const ctx = createMockContext({ tenantId: VALID_UUID });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should store validated tenantId on request', () => {
      const request = { tenantId: VALID_UUID };
      const ctx = createMockContext(request);

      guard.canActivate(ctx);

      expect(request.tenantId).toBe(VALID_UUID);
    });
  });

  // =========================================================================
  // Valid tenant — user present and matching
  // =========================================================================
  describe('when user is present and tenant matches', () => {
    it('should return true', () => {
      const ctx = createMockContext({
        tenantId: VALID_UUID,
        user: { tenantId: VALID_UUID },
      });

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // =========================================================================
  // Valid tenant — user present, tenant mismatch
  // =========================================================================
  describe('when user tenant does not match', () => {
    it('should throw ForbiddenException', () => {
      const ctx = createMockContext({
        tenantId: VALID_UUID,
        user: { tenantId: ANOTHER_UUID },
      });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(ctx)).toThrow('User does not have access to this tenant');
    });
  });

  // =========================================================================
  // Valid tenant — user without tenantId
  // =========================================================================
  describe('when user is present but has no tenantId', () => {
    it('should return true (no tenant check needed)', () => {
      const ctx = createMockContext({
        tenantId: VALID_UUID,
        user: { sub: 'user-001' },
      });

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // =========================================================================
  // UUID format edge cases
  // =========================================================================
  describe('UUID format edge cases', () => {
    it('should accept lowercase UUIDs', () => {
      const ctx = createMockContext({ tenantId: '550e8400-e29b-41d4-a716-446655440000' });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should accept uppercase UUIDs', () => {
      const ctx = createMockContext({ tenantId: '550E8400-E29B-41D4-A716-446655440000' });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should accept mixed case UUIDs', () => {
      const ctx = createMockContext({ tenantId: '550e8400-E29B-41d4-A716-446655440000' });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });
});
