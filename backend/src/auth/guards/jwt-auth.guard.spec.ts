import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // =========================================================================
  // canActivate()
  // =========================================================================
  describe('canActivate', () => {
    const createMockContext = (headers: Record<string, string> = {}): ExecutionContext =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ headers }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      }) as unknown as ExecutionContext;

    it('should throw UnauthorizedException when Authorization header is missing', () => {
      const context = createMockContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Authorization header is missing');
    });

    it('should throw UnauthorizedException when Authorization header does not start with Bearer', () => {
      const context = createMockContext({ authorization: 'Basic abc123' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Invalid authorization format. Use Bearer token',
      );
    });

    it('should throw UnauthorizedException for empty Authorization header', () => {
      const context = createMockContext({ authorization: '' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Authorization header is missing');
    });

    it('should call super.canActivate when Bearer token is present', () => {
      const context = createMockContext({ authorization: 'Bearer valid-token-123' });

      // super.canActivate calls passport, which will fail in unit test,
      // but we verify our pre-validation logic does NOT throw
      const superCanActivate = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      superCanActivate.mockRestore();
    });

    it('should pass through when Authorization has Bearer prefix with space', () => {
      const context = createMockContext({ authorization: 'Bearer eyJhbGci...' });

      const superCanActivate = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockReturnValue(true);

      expect(() => guard.canActivate(context)).not.toThrow();
      superCanActivate.mockRestore();
    });
  });

  // =========================================================================
  // handleRequest()
  // =========================================================================
  describe('handleRequest', () => {
    const mockContext = {} as ExecutionContext;

    it('should return user when no error and user is valid', () => {
      const user = { userId: 'u1', email: 'test@test.com', role: 'ADMIN', tenantId: 't1' };

      const result = guard.handleRequest(null, user, undefined, mockContext);

      expect(result).toEqual(user);
    });

    it('should throw the error when err is provided', () => {
      const error = new Error('Token expired');

      expect(() => guard.handleRequest(error, null, undefined, mockContext)).toThrow(error);
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => guard.handleRequest(null, null, undefined, mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, undefined, mockContext)).toThrow(
        'Invalid or expired token',
      );
    });

    it('should throw UnauthorizedException when user is false', () => {
      expect(() => guard.handleRequest(null, false, undefined, mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, false, undefined, mockContext)).toThrow(
        'Invalid or expired token',
      );
    });

    it('should prefer the error over UnauthorizedException when both err and no user', () => {
      const error = new UnauthorizedException('Custom error');

      expect(() => guard.handleRequest(error, null, undefined, mockContext)).toThrow(
        'Custom error',
      );
    });

    it('should throw the original error even when user is provided (err takes priority)', () => {
      const error = new Error('Validation failed');
      const user = { userId: 'u1' };

      expect(() => guard.handleRequest(error, user, undefined, mockContext)).toThrow(error);
    });
  });
});
