/**
 * auth.spec.ts — Tests for auth middleware (token verification, roles, CORS)
 */

// Set required env vars before import
process.env.JWT_SECRET = 'test-jwt-secret-must-be-long-enough-for-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-must-be-long-enough-32';

import { Request, Response, NextFunction } from 'express';
import { generateAccessToken, generateRefreshToken } from '../services/jwtService';
import {
  extractTokenFromHeader,
  extractTokenFromCookie,
  verifyToken,
  requireAuth,
  extractUser,
  requireRoles,
  requireTenant,
  requireAuthWithRole,
  verifyRefreshTokenMiddleware,
  tenantCorsMiddleware,
  auditLogMiddleware,
  authErrorHandler,
} from './auth';

const samplePayload = {
  sub: 'user-123',
  email: 'test@mechmind.io',
  role: 'admin',
  tenantId: 'tenant-abc',
};

function createMockReqResNext(overrides: Partial<Request> = {}): {
  req: Request;
  res: Response;
  next: NextFunction;
} {
  const req = {
    headers: {},
    cookies: {},
    body: {},
    method: 'GET',
    path: '/test',
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as unknown as Request;

  const jsonFn = jest.fn();
  const sendStatusFn = jest.fn();
  const headerFn = jest.fn();
  const res = {
    status: jest.fn().mockReturnValue({ json: jsonFn }),
    json: jsonFn,
    sendStatus: sendStatusFn,
    header: headerFn,
    statusCode: 200,
    on: jest.fn(),
  } as unknown as Response;

  const next = jest.fn() as unknown as NextFunction;

  return { req, res, next };
}

describe('Auth Middleware', () => {
  describe('extractTokenFromHeader', () => {
    it('should extract Bearer token from Authorization header', () => {
      const req = { headers: { authorization: 'Bearer my-token-123' } } as Request;
      expect(extractTokenFromHeader(req)).toBe('my-token-123');
    });

    it('should return null when no Authorization header', () => {
      const req = { headers: {} } as Request;
      expect(extractTokenFromHeader(req)).toBeNull();
    });

    it('should return null for non-Bearer scheme', () => {
      const req = { headers: { authorization: 'Basic abc123' } } as Request;
      expect(extractTokenFromHeader(req)).toBeNull();
    });

    it('should return null for malformed header', () => {
      const req = { headers: { authorization: 'Bearer' } } as Request;
      expect(extractTokenFromHeader(req)).toBeNull();
    });

    it('should return null for header with extra parts', () => {
      const req = { headers: { authorization: 'Bearer token extra' } } as Request;
      expect(extractTokenFromHeader(req)).toBeNull();
    });
  });

  describe('extractTokenFromCookie', () => {
    it('should extract token from default cookie name', () => {
      const req = { cookies: { accessToken: 'cookie-token' } } as unknown as Request;
      expect(extractTokenFromCookie(req)).toBe('cookie-token');
    });

    it('should extract token from custom cookie name', () => {
      const req = { cookies: { myToken: 'custom-token' } } as unknown as Request;
      expect(extractTokenFromCookie(req, 'myToken')).toBe('custom-token');
    });

    it('should return null when cookie is missing', () => {
      const req = { cookies: {} } as unknown as Request;
      expect(extractTokenFromCookie(req)).toBeNull();
    });

    it('should return null when cookies object is undefined', () => {
      const req = {} as Request;
      expect(extractTokenFromCookie(req)).toBeNull();
    });
  });

  describe('verifyToken', () => {
    it('should set req.user for valid access token', () => {
      const token = generateAccessToken(samplePayload);
      const { req, res, next } = createMockReqResNext({
        headers: { authorization: `Bearer ${token}` },
      } as Partial<Request>);

      verifyToken()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.userId).toBe('user-123');
      expect(req.tenantId).toBe('tenant-abc');
    });

    it('should return 401 when no token and not optional', () => {
      const { req, res, next } = createMockReqResNext();

      verifyToken()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next when no token and optional', () => {
      const { req, res, next } = createMockReqResNext();

      verifyToken({ optional: true })(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 401 for invalid token', () => {
      const { req, res, next } = createMockReqResNext({
        headers: { authorization: 'Bearer invalid-token' },
      } as Partial<Request>);

      verifyToken()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 for expired token by default', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ ...samplePayload, type: 'access' }, process.env.JWT_SECRET, {
        expiresIn: '-1s',
      });

      const { req, res, next } = createMockReqResNext({
        headers: { authorization: `Bearer ${token}` },
      } as Partial<Request>);

      verifyToken()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should allow expired token when allowExpired is true', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ ...samplePayload, type: 'access' }, process.env.JWT_SECRET, {
        expiresIn: '-1s',
      });

      const { req, res, next } = createMockReqResNext({
        headers: { authorization: `Bearer ${token}` },
      } as Partial<Request>);

      verifyToken({ allowExpired: true })(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
    });

    it('should check requireTenant option', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { sub: 'user-1', email: 'a@b.com', role: 'admin', type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' },
      );

      const { req, res, next } = createMockReqResNext({
        headers: { authorization: `Bearer ${token}` },
      } as Partial<Request>);

      verifyToken({ requireTenant: true })(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should try cookie when header is missing', () => {
      const token = generateAccessToken(samplePayload);
      const { req, res, next } = createMockReqResNext({
        cookies: { accessToken: token },
      } as Partial<Request>);

      verifyToken()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe('user-123');
    });
  });

  describe('requireAuth', () => {
    it('should be verifyToken with optional=false', () => {
      const { req, res, next } = createMockReqResNext();

      requireAuth()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('extractUser', () => {
    it('should set user data when valid token present', () => {
      const token = generateAccessToken(samplePayload);
      const { req, res, next } = createMockReqResNext({
        headers: { authorization: `Bearer ${token}` },
      } as Partial<Request>);

      extractUser(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe('user-123');
    });

    it('should call next even when no token', () => {
      const { req, res, next } = createMockReqResNext();

      extractUser(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should call next with invalid token (no error)', () => {
      const { req, res, next } = createMockReqResNext({
        headers: { authorization: 'Bearer bad-token' },
      } as Partial<Request>);

      extractUser(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRoles', () => {
    it('should allow user with matching role', () => {
      const { req, res, next } = createMockReqResNext();
      req.user = { ...samplePayload, type: 'access', iat: 0, exp: 0 };

      requireRoles('admin', 'superadmin')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject user with non-matching role', () => {
      const { req, res, next } = createMockReqResNext();
      req.user = { ...samplePayload, role: 'viewer', type: 'access', iat: 0, exp: 0 };

      requireRoles('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 401 when no user', () => {
      const { req, res, next } = createMockReqResNext();

      requireRoles('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requireTenant', () => {
    it('should allow user with tenantId', () => {
      const { req, res, next } = createMockReqResNext();
      req.user = { ...samplePayload, type: 'access', iat: 0, exp: 0 };

      requireTenant(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject when no tenantId', () => {
      const { req, res, next } = createMockReqResNext();
      req.user = { ...samplePayload, tenantId: '', type: 'access', iat: 0, exp: 0 };

      requireTenant(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 when no user', () => {
      const { req, res, next } = createMockReqResNext();

      requireTenant(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requireAuthWithRole', () => {
    it('should allow authenticated user with correct role', () => {
      const token = generateAccessToken(samplePayload);
      const { req, res, next } = createMockReqResNext({
        headers: { authorization: `Bearer ${token}` },
      } as Partial<Request>);

      requireAuthWithRole('admin')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      const { req, res, next } = createMockReqResNext();

      requireAuthWithRole('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('verifyRefreshTokenMiddleware', () => {
    it('should verify refresh token from body', () => {
      const token = generateRefreshToken(samplePayload);
      const { req, res, next } = createMockReqResNext({
        body: { refreshToken: token },
      } as Partial<Request>);

      verifyRefreshTokenMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
    });

    it('should verify refresh token from header', () => {
      const token = generateRefreshToken(samplePayload);
      const { req, res, next } = createMockReqResNext({
        headers: { authorization: `Bearer ${token}` },
      } as Partial<Request>);

      verifyRefreshTokenMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 401 when no token', () => {
      const { req, res, next } = createMockReqResNext();

      verifyRefreshTokenMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 for invalid refresh token', () => {
      const { req, res, next } = createMockReqResNext({
        body: { refreshToken: 'invalid' },
      } as Partial<Request>);

      verifyRefreshTokenMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('tenantCorsMiddleware', () => {
    it('should allow requests without origin', () => {
      const { req, res, next } = createMockReqResNext();

      tenantCorsMiddleware(['https://app.mechmind.io'])(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow localhost origin', () => {
      const { req, res, next } = createMockReqResNext({
        headers: { origin: 'http://localhost:3000' },
      } as Partial<Request>);

      tenantCorsMiddleware(['https://app.mechmind.io'])(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow postman origin', () => {
      const { req, res, next } = createMockReqResNext({
        headers: { origin: 'https://postman.example.com' },
      } as Partial<Request>);

      tenantCorsMiddleware(['https://app.mechmind.io'])(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow matching origin', () => {
      const { req, res, next } = createMockReqResNext({
        headers: { origin: 'https://app.mechmind.io' },
      } as Partial<Request>);

      tenantCorsMiddleware(['https://app.mechmind.io'])(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject non-matching origin', () => {
      const { req, res, next } = createMockReqResNext({
        headers: { origin: 'https://evil.com' },
      } as Partial<Request>);

      tenantCorsMiddleware(['https://app.mechmind.io'])(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should allow all when no origins configured', () => {
      const { req, res, next } = createMockReqResNext({
        headers: { origin: 'https://any.com' },
      } as Partial<Request>);

      tenantCorsMiddleware([])(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle OPTIONS preflight', () => {
      const { req, res, next } = createMockReqResNext({
        headers: { origin: 'https://app.mechmind.io' },
        method: 'OPTIONS',
      } as Partial<Request>);

      tenantCorsMiddleware(['https://app.mechmind.io'])(req, res, next);

      expect(res.sendStatus).toHaveBeenCalledWith(200);
    });

    it('should support wildcard origins', () => {
      const { req, res, next } = createMockReqResNext({
        headers: { origin: 'https://sub.mechmind.io' },
      } as Partial<Request>);

      tenantCorsMiddleware(['*.mechmind.io'])(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('auditLogMiddleware', () => {
    it('should log after response finish', () => {
      const { req, res, next } = createMockReqResNext();
      req.userId = 'user-1';
      req.tenantId = 'tenant-1';

      auditLogMiddleware('test-action')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  describe('authErrorHandler', () => {
    it('should handle UnauthorizedError', () => {
      const err = new Error('Unauthorized') as Error & { name: string };
      err.name = 'UnauthorizedError';

      const { req, res, next } = createMockReqResNext();

      authErrorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should pass non-auth errors to next', () => {
      const err = new Error('Something else');

      const { req, res, next } = createMockReqResNext();

      authErrorHandler(err, req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
