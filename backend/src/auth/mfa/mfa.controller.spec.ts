import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { MfaController } from './mfa.controller';
import { MfaService } from './mfa.service';
import { AuthService } from '../services/auth.service';
import { PrismaService } from '@common/services/prisma.service';
import { Request } from 'express';

describe('MfaController', () => {
  let controller: MfaController;
  let mfaService: jest.Mocked<MfaService>;
  let authService: jest.Mocked<AuthService>;
  let prisma: jest.Mocked<PrismaService>;

  const USER_ID = 'user-001';
  const TENANT_ID = 'tenant-001';

  const mockRequest = { ip: '127.0.0.1' } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MfaController],
      providers: [
        {
          provide: MfaService,
          useValue: {
            getStatus: jest.fn(),
            enroll: jest.fn(),
            verifyAndEnable: jest.fn(),
            verify: jest.fn(),
            disable: jest.fn(),
            regenerateBackupCodes: jest.fn(),
            adminReset: jest.fn(),
            createMfaSession: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            verifyTwoFactorTempToken: jest.fn(),
            getUserWithTwoFactorStatus: jest.fn(),
            updateLastLogin: jest.fn(),
            logAdminAction: jest.fn(),
            generateTokens: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<MfaController>(MfaController);
    mfaService = module.get(MfaService) as jest.Mocked<MfaService>;
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatus', () => {
    it('should delegate to mfaService.getStatus with userId', async () => {
      const status = { enabled: true, backupCodesRemaining: 8 };
      mfaService.getStatus.mockResolvedValue(status as never);

      const result = await controller.getStatus(USER_ID);

      expect(mfaService.getStatus).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual(status);
    });
  });

  describe('enroll', () => {
    it('should delegate to mfaService.enroll and return enriched response', async () => {
      const enrollResult = {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,...',
        manualEntryKey: 'JBSWY3DPEHPK3PXP',
        backupCodes: ['code1', 'code2'],
      };
      mfaService.enroll.mockResolvedValue(enrollResult as never);

      const result = await controller.enroll(USER_ID, 'user@example.com');

      expect(mfaService.enroll).toHaveBeenCalledWith(USER_ID, 'user@example.com');
      expect(result).toEqual({
        secret: enrollResult.secret,
        qrCode: enrollResult.qrCode,
        manualEntryKey: enrollResult.manualEntryKey,
        backupCodes: enrollResult.backupCodes,
        warning: 'Save these backup codes immediately. They will not be shown again.',
      });
    });
  });

  describe('verify', () => {
    it('should delegate to mfaService.verifyAndEnable and return success message', async () => {
      mfaService.verifyAndEnable.mockResolvedValue(true);

      const dto = { token: '123456' };
      const result = await controller.verify(USER_ID, dto as never);

      expect(mfaService.verifyAndEnable).toHaveBeenCalledWith(USER_ID, '123456');
      expect(result).toEqual({ message: 'Two-factor authentication enabled successfully' });
    });
  });

  describe('verifyLogin', () => {
    it('should verify temp token, MFA code, and return tokens with mfaSessionToken', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue(USER_ID);
      mfaService.verify.mockResolvedValue({ valid: true, remainingAttempts: 4 } as never);

      const mockUser = { id: USER_ID, tenantId: TENANT_ID, email: 'user@test.com' };
      authService.getUserWithTwoFactorStatus.mockResolvedValue(mockUser as never);
      authService.updateLastLogin.mockResolvedValue(undefined);
      mfaService.createMfaSession.mockResolvedValue({
        mfaSessionToken: 'mfa-session-xyz',
      } as never);
      authService.generateTokens.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresIn: 3600,
      });

      const dto = { tempToken: 'temp-123', token: '654321' };
      const result = await controller.verifyLogin(dto as never, mockRequest);

      expect(authService.verifyTwoFactorTempToken).toHaveBeenCalledWith('temp-123');
      expect(mfaService.verify).toHaveBeenCalledWith(USER_ID, '654321');
      expect(authService.getUserWithTwoFactorStatus).toHaveBeenCalledWith(USER_ID);
      expect(authService.updateLastLogin).toHaveBeenCalledWith(USER_ID, '127.0.0.1');
      expect(mfaService.createMfaSession).toHaveBeenCalledWith(USER_ID);
      expect(authService.generateTokens).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresIn: 3600,
        mfaSessionToken: 'mfa-session-xyz',
      });
    });

    it('should throw UnauthorizedException when MFA code is invalid', async () => {
      authService.verifyTwoFactorTempToken.mockResolvedValue(USER_ID);
      mfaService.verify.mockResolvedValue({ valid: false, remainingAttempts: 2 } as never);

      const dto = { tempToken: 'temp-123', token: '000000' };

      await expect(controller.verifyLogin(dto as never, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.verifyLogin(dto as never, mockRequest)).rejects.toThrow(
        '2 attempts remaining',
      );
    });
  });

  describe('disable', () => {
    it('should delegate to mfaService.disable and return success message', async () => {
      mfaService.disable.mockResolvedValue(undefined);

      const dto = { token: '123456', password: 'my-password' };
      const result = await controller.disable(USER_ID, dto as never);

      expect(mfaService.disable).toHaveBeenCalledWith(USER_ID, '123456', 'my-password');
      expect(result).toEqual({ message: 'Two-factor authentication disabled successfully' });
    });
  });

  describe('createBackupCodes', () => {
    it('should delegate to mfaService.regenerateBackupCodes and return codes with warning', async () => {
      const codes = ['abc-001', 'abc-002', 'abc-003'];
      mfaService.regenerateBackupCodes.mockResolvedValue(codes);

      const dto = { token: '123456' };
      const result = await controller.createBackupCodes(USER_ID, dto as never);

      expect(mfaService.regenerateBackupCodes).toHaveBeenCalledWith(USER_ID, '123456');
      expect(result).toEqual({
        backupCodes: codes,
        warning: 'Save these codes immediately. They will not be shown again.',
      });
    });
  });

  describe('adminReset', () => {
    it('should log admin action and delegate to mfaService.adminReset', async () => {
      authService.logAdminAction.mockResolvedValue(undefined);
      mfaService.adminReset.mockResolvedValue(undefined);

      const result = await controller.adminReset('target-user-001', 'admin-001');

      expect(authService.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: 'admin-001',
          action: 'MFA_RESET',
          targetUserId: 'target-user-001',
        }),
      );
      expect(mfaService.adminReset).toHaveBeenCalledWith('target-user-001');
      expect(result).toEqual({
        message: 'Two-factor authentication has been reset. User must set up MFA again.',
      });
    });
  });

  describe('getUsersWithoutMFA', () => {
    it('should query prisma for admin/manager users without MFA', async () => {
      const users = [
        { id: 'u1', email: 'admin@test.com', role: 'ADMIN' },
        { id: 'u2', email: 'mgr@test.com', role: 'MANAGER' },
      ];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(users);

      const result = await controller.getUsersWithoutMFA(TENANT_ID);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          role: { in: ['ADMIN', 'MANAGER'] },
          totpEnabled: false,
        },
        select: { id: true, email: true, role: true },
      });
      expect(result).toEqual({ users });
    });
  });
});
