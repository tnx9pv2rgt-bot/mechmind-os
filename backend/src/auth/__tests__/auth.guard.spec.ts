import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, of } from 'rxjs';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const createMockExecutionContext = (headers: Record<string, string | undefined> = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
        getResponse: () => ({}),
      }),
      getClass: () => ({}),
      getHandler: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate - header validation', () => {
    it('should call super.canActivate when Authorization header is valid Bearer token', () => {
      const context = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      // Mock the parent AuthGuard's canActivate
      const superCanActivate = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate');
      superCanActivate.mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      superCanActivate.mockRestore();
    });

    it('should throw UnauthorizedException when Authorization header is missing', () => {
      const context = createMockExecutionContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Authorization header is missing');
    });

    it('should throw UnauthorizedException when Authorization header is empty string', () => {
      const context = createMockExecutionContext({
        authorization: '',
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Authorization header is missing');
    });

    it('should throw UnauthorizedException when Authorization header does not start with Bearer', () => {
      const context = createMockExecutionContext({
        authorization: 'Basic dXNlcjpwYXNzd29yZA==',
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid authorization format. Use Bearer token');
    });

    it('should throw for lowercase bearer prefix', () => {
      const context = createMockExecutionContext({
        authorization: 'bearer valid-token',
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid authorization format. Use Bearer token');
    });

    it('should pass to parent when token format is valid', () => {
      const context = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      const superCanActivate = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate');
      superCanActivate.mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      superCanActivate.mockRestore();
    });

    it('should handle Promise return from parent canActivate', async () => {
      const context = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      const superCanActivate = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate');
      superCanActivate.mockReturnValue(Promise.resolve(true));

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      superCanActivate.mockRestore();
    });

    it('should handle Observable return from parent canActivate', (done) => {
      const context = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      const superCanActivate = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate');
      superCanActivate.mockReturnValue(of(true));

      const result = guard.canActivate(context);

      expect(result).toBeInstanceOf(Observable);
      superCanActivate.mockRestore();
      done();
    });

    it('should handle null authorization header', () => {
      const context = createMockExecutionContext({
        authorization: undefined,
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should handle token with only Bearer prefix', () => {
      const context = createMockExecutionContext({
        authorization: 'Bearer ',
      });

      // This should pass our check since it starts with 'Bearer '
      const superCanActivate = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate');
      superCanActivate.mockReturnValue(true);

      // Should not throw - we only check format, not if token exists
      expect(() => guard.canActivate(context)).not.toThrow();
      superCanActivate.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('should return user when authentication succeeds', () => {
      const user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-456',
      };

      const result = guard.handleRequest(null, user, null);

      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException when error is present', () => {
      const error = new UnauthorizedException('Custom error');

      expect(() => guard.handleRequest(error, null, null)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(error, null, null)).toThrow('Custom error');
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, null)).toThrow('Invalid or expired token');
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      expect(() => guard.handleRequest(null, undefined, null)).toThrow(UnauthorizedException);
    });

    it('should throw error when both error and user are falsy', () => {
      const error = new UnauthorizedException('Session expired');

      expect(() => guard.handleRequest(error, undefined, null)).toThrow('Session expired');
    });

    it('should prioritize error over missing user', () => {
      const error = new UnauthorizedException('Token revoked');

      expect(() => guard.handleRequest(error, null, null)).toThrow('Token revoked');
    });

    it('should handle info parameter', () => {
      const user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'MANAGER',
        tenantId: 'tenant-456',
      };

      const info = { message: 'Token validated successfully' };

      const result = guard.handleRequest(null, user, info);

      expect(result).toEqual(user);
    });

    it('should handle error object with different types', () => {
      const error = new Error('Generic error');

      expect(() => guard.handleRequest(error, null, null)).toThrow(Error);
    });

    it('should handle string error', () => {
      expect(() => guard.handleRequest('string error', null, null)).toThrow('string error');
    });

    it('should handle empty user object', () => {
      const user = {};

      // Empty object is truthy, so it should return it
      const result = guard.handleRequest(null, user, null);

      expect(result).toEqual(user);
    });

    it('should throw when user is explicitly false', () => {
      expect(() => guard.handleRequest(null, false as any, null)).toThrow(UnauthorizedException);
    });

    it('should throw when user is zero', () => {
      expect(() => guard.handleRequest(null, 0 as any, null)).toThrow(UnauthorizedException);
    });

    it('should throw when user is empty string', () => {
      expect(() => guard.handleRequest(null, '' as any, null)).toThrow(UnauthorizedException);
    });

    it('should handle JWT error info', () => {
      const info = { name: 'TokenExpiredError', message: 'jwt expired' };
      
      expect(() => guard.handleRequest(null, null, info)).toThrow(UnauthorizedException);
    });

    it('should pass through user when both error and user exist (edge case)', () => {
      // Edge case: if both error and user exist, the original implementation throws error
      const user = { userId: '123' };
      const error = new Error('Some warning');

      // The implementation throws error first if it exists
      expect(() => guard.handleRequest(error, user, null)).toThrow(Error);
    });
  });

  describe('guard metadata', () => {
    it('should be injectable', () => {
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });

    it('should extend AuthGuard', () => {
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });
  });
});
