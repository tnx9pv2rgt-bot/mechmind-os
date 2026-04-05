import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Test, TestingModule } from '@nestjs/testing';
import { WsJwtGuard } from './ws-jwt.guard';

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    jwtService = {
      verifyAsync: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsJwtGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    guard = module.get<WsJwtGuard>(WsJwtGuard);
  });

  const createMockWsContext = (client: Record<string, unknown>): ExecutionContext =>
    ({
      switchToWs: () => ({
        getClient: () => client,
      }),
    }) as unknown as ExecutionContext;

  const createMockSocket = (
    opts: {
      authToken?: string;
      queryToken?: string;
      authHeader?: string;
    } = {},
  ): Record<string, unknown> => ({
    handshake: {
      auth: opts.authToken ? { token: opts.authToken } : {},
      query: opts.queryToken ? { token: opts.queryToken } : {},
      headers: opts.authHeader ? { authorization: opts.authHeader } : {},
    },
    data: {},
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // =========================================================================
  // canActivate — token from auth object
  // =========================================================================
  describe('token from handshake.auth', () => {
    it('should return true and attach user data when auth token is valid', async () => {
      const payload = { sub: 'u1:t1', email: 'a@b.com', role: 'ADMIN', tenantId: 't1' };
      jwtService.verifyAsync.mockResolvedValue(payload);

      const client = createMockSocket({ authToken: 'valid-jwt' });
      const context = createMockWsContext(client);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect((client as Record<string, Record<string, unknown>>).data.user).toEqual(payload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-jwt', {
        secret: 'test-jwt-secret',
      });
    });
  });

  // =========================================================================
  // canActivate — token from query
  // =========================================================================
  describe('token from handshake.query', () => {
    it('should extract token from query parameters', async () => {
      const payload = { sub: 'u1:t1', email: 'a@b.com', role: 'ADMIN', tenantId: 't1' };
      jwtService.verifyAsync.mockResolvedValue(payload);

      const client = createMockSocket({ queryToken: 'query-jwt' });
      const context = createMockWsContext(client);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('query-jwt', {
        secret: 'test-jwt-secret',
      });
    });
  });

  // =========================================================================
  // canActivate — token from Authorization header
  // =========================================================================
  describe('token from Authorization header', () => {
    it('should extract token from Bearer header', async () => {
      const payload = { sub: 'u1:t1', email: 'a@b.com', role: 'ADMIN', tenantId: 't1' };
      jwtService.verifyAsync.mockResolvedValue(payload);

      const client = createMockSocket({ authHeader: 'Bearer header-jwt' });
      const context = createMockWsContext(client);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('header-jwt', {
        secret: 'test-jwt-secret',
      });
    });

    it('should not extract token from non-Bearer authorization header', async () => {
      const client = createMockSocket({ authHeader: 'Basic credentials' });
      const context = createMockWsContext(client);

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
    });

    it('should not extract token when Bearer has no token part', async () => {
      const client = createMockSocket({ authHeader: 'Bearer ' });
      const context = createMockWsContext(client);

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
    });
  });

  // =========================================================================
  // canActivate — no token
  // =========================================================================
  describe('when no token is provided', () => {
    it('should throw WsException when no token in any location', async () => {
      const client = createMockSocket();
      const context = createMockWsContext(client);

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
      await expect(guard.canActivate(context)).rejects.toThrow('Unauthorized: Invalid token');
    });
  });

  // =========================================================================
  // canActivate — invalid/expired token
  // =========================================================================
  describe('when token is invalid or expired', () => {
    it('should throw WsException when JWT verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      const client = createMockSocket({ authToken: 'expired-jwt' });
      const context = createMockWsContext(client);

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
      await expect(guard.canActivate(context)).rejects.toThrow('Unauthorized: Invalid token');
    });

    it('should throw WsException when JWT secret is wrong', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));

      const client = createMockSocket({ authToken: 'bad-signature-jwt' });
      const context = createMockWsContext(client);

      await expect(guard.canActivate(context)).rejects.toThrow(WsException);
    });
  });

  // =========================================================================
  // Token extraction priority
  // =========================================================================
  describe('token extraction priority', () => {
    it('should prefer auth object token over query token', async () => {
      const payload = { sub: 'u1:t1' };
      jwtService.verifyAsync.mockResolvedValue(payload);

      const client = createMockSocket({ authToken: 'auth-token', queryToken: 'query-token' });
      const context = createMockWsContext(client);

      await guard.canActivate(context);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('auth-token', expect.any(Object));
    });

    it('should prefer query token over header when auth is not present', async () => {
      const payload = { sub: 'u1:t1' };
      jwtService.verifyAsync.mockResolvedValue(payload);

      const client = createMockSocket({
        queryToken: 'query-token',
        authHeader: 'Bearer header-token',
      });
      const context = createMockWsContext(client);

      await guard.canActivate(context);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('query-token', expect.any(Object));
    });
  });
});
