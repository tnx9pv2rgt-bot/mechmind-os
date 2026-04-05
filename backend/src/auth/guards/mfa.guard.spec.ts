import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { MfaGuard, MfaSessionMiddleware, MFARequest } from './mfa.guard';
import { MfaService } from '../mfa/mfa.service';

describe('MfaGuard', () => {
  let guard: MfaGuard;
  let reflector: jest.Mocked<Reflector>;
  let mfaService: { getStatus: jest.Mock; validateMfaSession: jest.Mock };

  beforeEach(async () => {
    mfaService = {
      getStatus: jest.fn(),
      validateMfaSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: MfaService,
          useValue: mfaService,
        },
      ],
    }).compile();

    guard = module.get<MfaGuard>(MfaGuard);
    reflector = module.get(Reflector) as jest.Mocked<Reflector>;
  });

  const createMockContext = (
    user?: Record<string, unknown>,
    mfaVerified?: boolean,
    mfaVerifiedAt?: Date,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          mfaVerified,
          mfaVerifiedAt,
          headers: {},
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // =========================================================================
  // canActivate — no MFA required on route
  // =========================================================================
  describe('when MFA is not required on route', () => {
    it('should return true when requireMFA metadata is false', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const result = await guard.canActivate(createMockContext());

      expect(result).toBe(true);
    });

    it('should return true when requireMFA metadata is undefined', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const result = await guard.canActivate(createMockContext());

      expect(result).toBe(true);
    });

    it('should return true when requireMFA metadata is null', async () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      const result = await guard.canActivate(createMockContext());

      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // canActivate — MFA required on route
  // =========================================================================
  describe('when MFA is required on route', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(true);
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      const context = createMockContext(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('User not authenticated');
    });

    it('should return true when MFA is not enabled for user', async () => {
      mfaService.getStatus.mockResolvedValue({ enabled: false });

      const context = createMockContext({
        userId: 'u1',
        email: 'a@b.com',
        tenantId: 't1',
        role: 'ADMIN',
      });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mfaService.getStatus).toHaveBeenCalledWith('u1');
    });

    it('should return true when MFA is enabled and verified recently (within 10 min)', async () => {
      mfaService.getStatus.mockResolvedValue({ enabled: true });

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const context = createMockContext(
        { userId: 'u1', email: 'a@b.com', tenantId: 't1', role: 'ADMIN' },
        true,
        fiveMinutesAgo,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw MFA_REQUIRED when MFA is enabled but not verified', async () => {
      mfaService.getStatus.mockResolvedValue({ enabled: true });

      const context = createMockContext({
        userId: 'u1',
        email: 'a@b.com',
        tenantId: 't1',
        role: 'ADMIN',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);

      try {
        await guard.canActivate(context);
      } catch (e) {
        expect(e.getResponse()).toEqual({
          message: 'MFA verification required',
          code: 'MFA_REQUIRED',
          requiresMFA: true,
        });
      }
    });

    it('should throw MFA_REQUIRED when MFA was verified more than 10 minutes ago', async () => {
      mfaService.getStatus.mockResolvedValue({ enabled: true });

      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const context = createMockContext(
        { userId: 'u1', email: 'a@b.com', tenantId: 't1', role: 'ADMIN' },
        true,
        fifteenMinutesAgo,
      );

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw MFA_REQUIRED when mfaVerified is true but mfaVerifiedAt is undefined', async () => {
      mfaService.getStatus.mockResolvedValue({ enabled: true });

      const context = createMockContext(
        { userId: 'u1', email: 'a@b.com', tenantId: 't1', role: 'ADMIN' },
        true,
        undefined,
      );

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw MFA_REQUIRED when mfaVerified is false even with recent timestamp', async () => {
      mfaService.getStatus.mockResolvedValue({ enabled: true });

      const now = new Date();
      const context = createMockContext(
        { userId: 'u1', email: 'a@b.com', tenantId: 't1', role: 'ADMIN' },
        false,
        now,
      );

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
});

// =========================================================================
// MfaSessionMiddleware
// =========================================================================
describe('MfaSessionMiddleware', () => {
  let middleware: MfaSessionMiddleware;
  let mfaService: { validateMfaSession: jest.Mock; getStatus: jest.Mock };

  beforeEach(async () => {
    mfaService = {
      validateMfaSession: jest.fn(),
      getStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaSessionMiddleware,
        {
          provide: MfaService,
          useValue: mfaService,
        },
      ],
    }).compile();

    middleware = module.get<MfaSessionMiddleware>(MfaSessionMiddleware);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should call next and not set mfaVerified when no X-MFA-Token header', async () => {
    const req: MFARequest = {
      user: { userId: 'u1', email: 'a@b.com', tenantId: 't1', role: 'ADMIN' },
      headers: {},
    };
    const next = jest.fn();

    await middleware.use(req, {}, next);

    expect(next).toHaveBeenCalled();
    expect(req.mfaVerified).toBeUndefined();
  });

  it('should set mfaVerified=true when token is valid and userId matches', async () => {
    mfaService.validateMfaSession.mockResolvedValue('u1');

    const req: MFARequest = {
      user: { userId: 'u1', email: 'a@b.com', tenantId: 't1', role: 'ADMIN' },
      headers: { 'x-mfa-token': 'valid-mfa-token' },
    };
    const next = jest.fn();

    await middleware.use(req, {}, next);

    expect(req.mfaVerified).toBe(true);
    expect(req.mfaVerifiedAt).toBeInstanceOf(Date);
    expect(next).toHaveBeenCalled();
  });

  it('should not set mfaVerified when token is valid but userId does not match', async () => {
    mfaService.validateMfaSession.mockResolvedValue('other-user');

    const req: MFARequest = {
      user: { userId: 'u1', email: 'a@b.com', tenantId: 't1', role: 'ADMIN' },
      headers: { 'x-mfa-token': 'valid-mfa-token' },
    };
    const next = jest.fn();

    await middleware.use(req, {}, next);

    expect(req.mfaVerified).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('should not set mfaVerified when token validation returns null', async () => {
    mfaService.validateMfaSession.mockResolvedValue(null);

    const req: MFARequest = {
      user: { userId: 'u1', email: 'a@b.com', tenantId: 't1', role: 'ADMIN' },
      headers: { 'x-mfa-token': 'invalid-mfa-token' },
    };
    const next = jest.fn();

    await middleware.use(req, {}, next);

    expect(req.mfaVerified).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('should not set mfaVerified when user is not present on request', async () => {
    mfaService.validateMfaSession.mockResolvedValue('u1');

    const req: MFARequest = {
      user: undefined as unknown as MFARequest['user'],
      headers: { 'x-mfa-token': 'valid-mfa-token' },
    };
    const next = jest.fn();

    await middleware.use(req, {}, next);

    expect(req.mfaVerified).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
