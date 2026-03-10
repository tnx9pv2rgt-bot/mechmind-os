import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { MfaService } from './mfa.service';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';

jest.mock('speakeasy');
jest.mock('qrcode');
jest.mock('bcrypt');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  backupCode: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockEncryption = {
  encrypt: jest.fn(),
  decrypt: jest.fn(),
};

const mockConfig = {
  get: jest.fn(),
};

describe('MfaService', () => {
  let service: MfaService;

  const userId = 'user-uuid-123';
  const userEmail = 'test@mechmind.io';
  const mockTotpSecret = {
    base32: 'JBSWY3DPEHPK3PXP',
    otpauth_url:
      'otpauth://totp/MechMind:test@mechmind.io?secret=JBSWY3DPEHPK3PXP&issuer=MechMind%20OS',
  };
  const mockEncryptedSecret = 'encrypted-totp-secret-hex';
  const mockQrDataUrl = 'data:image/png;base64,iVBOR...';
  const validToken = '123456';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);

    // Default mock implementations
    (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockTotpSecret);
    (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQrDataUrl);
    (bcrypt.hash as jest.Mock).mockImplementation((data: string) =>
      Promise.resolve(`hashed-${data}`),
    );
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    mockEncryption.encrypt.mockReturnValue(mockEncryptedSecret);
    mockEncryption.decrypt.mockReturnValue(mockTotpSecret.base32);
    mockPrisma.$transaction.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================
  // enroll()
  // ============================================================
  describe('enroll', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({ totpEnabled: false });
    });

    it('should generate a TOTP secret via speakeasy', async () => {
      const result = await service.enroll(userId, userEmail);

      expect(speakeasy.generateSecret).toHaveBeenCalledWith({
        name: `MechMind:${userEmail}`,
        length: 32,
        issuer: 'MechMind OS',
      });
      expect(result.secret).toBe(mockTotpSecret.base32);
      expect(result.manualEntryKey).toBe(mockTotpSecret.base32);
    });

    it('should generate a QR code data URL', async () => {
      const result = await service.enroll(userId, userEmail);

      expect(QRCode.toDataURL).toHaveBeenCalledWith(mockTotpSecret.otpauth_url, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
      });
      expect(result.qrCode).toBe(mockQrDataUrl);
    });

    it('should generate 10 backup codes', async () => {
      const result = await service.enroll(userId, userEmail);

      expect(result.backupCodes).toHaveLength(10);
    });

    it('should generate backup codes in XXXX-XXXX hex format', async () => {
      const result = await service.enroll(userId, userEmail);

      for (const code of result.backupCodes) {
        expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
      }
    });

    it('should generate backup codes using crypto.randomBytes (not Math.random)', async () => {
      const mathRandomSpy = jest.spyOn(Math, 'random');

      await service.enroll(userId, userEmail);

      // crypto.randomBytes is used internally; verify Math.random is NOT used
      expect(mathRandomSpy).not.toHaveBeenCalled();
      mathRandomSpy.mockRestore();
    });

    it('should encrypt the TOTP secret before storing', async () => {
      await service.enroll(userId, userEmail);

      expect(mockEncryption.encrypt).toHaveBeenCalledWith(mockTotpSecret.base32);
    });

    it('should hash all backup codes with bcrypt', async () => {
      await service.enroll(userId, userEmail);

      expect(bcrypt.hash).toHaveBeenCalledTimes(10);
      for (const call of (bcrypt.hash as jest.Mock).mock.calls) {
        expect(call[1]).toBe(10); // salt rounds
      }
    });

    it('should store encrypted secret and hashed backup codes in a transaction', async () => {
      await service.enroll(userId, userEmail);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      const transactionArgs = mockPrisma.$transaction.mock.calls[0][0];
      expect(transactionArgs).toHaveLength(2);
    });

    it('should set totpEnabled to false during enrollment (pending verification)', async () => {
      mockPrisma.$transaction.mockImplementation(async (promises: unknown[]) => {
        return Promise.all(promises as Promise<unknown>[]);
      });

      await service.enroll(userId, userEmail);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          totpSecret: mockEncryptedSecret,
          totpEnabled: false,
        },
      });
    });

    it('should throw BadRequestException if MFA is already enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ totpEnabled: true });

      await expect(service.enroll(userId, userEmail)).rejects.toThrow(BadRequestException);
      await expect(service.enroll(userId, userEmail)).rejects.toThrow(
        'MFA is already enabled for this user',
      );
    });

    it('should proceed if user has no MFA (totpEnabled is false)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ totpEnabled: false });

      const result = await service.enroll(userId, userEmail);

      expect(result.secret).toBeDefined();
      expect(result.qrCode).toBeDefined();
      expect(result.backupCodes).toBeDefined();
    });

    it('should return all required fields in MFAEnrollResult', async () => {
      const result = await service.enroll(userId, userEmail);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('backupCodes');
      expect(result).toHaveProperty('manualEntryKey');
    });
  });

  // ============================================================
  // verifyAndEnable()
  // ============================================================
  describe('verifyAndEnable', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        totpSecret: mockEncryptedSecret,
        totpEnabled: false,
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
    });

    it('should decrypt the stored secret', async () => {
      await service.verifyAndEnable(userId, validToken);

      expect(mockEncryption.decrypt).toHaveBeenCalledWith(mockEncryptedSecret);
    });

    it('should verify the TOTP code via speakeasy with window=1', async () => {
      await service.verifyAndEnable(userId, validToken);

      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: mockTotpSecret.base32,
        encoding: 'base32',
        token: validToken,
        window: 1,
      });
    });

    it('should enable MFA on valid code and return true', async () => {
      const result = await service.verifyAndEnable(userId, validToken);

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          totpEnabled: true,
          totpVerifiedAt: expect.any(Date),
        },
      });
    });

    it('should throw UnauthorizedException on invalid code', async () => {
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.verifyAndEnable(userId, '000000')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyAndEnable(userId, '000000')).rejects.toThrow(
        'Invalid verification code',
      );
    });

    it('should throw BadRequestException if enrollment not initiated (no secret)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        totpSecret: null,
        totpEnabled: false,
      });

      await expect(service.verifyAndEnable(userId, validToken)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyAndEnable(userId, validToken)).rejects.toThrow(
        'MFA enrollment not initiated',
      );
    });

    it('should throw BadRequestException if MFA is already enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        totpSecret: mockEncryptedSecret,
        totpEnabled: true,
      });

      await expect(service.verifyAndEnable(userId, validToken)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyAndEnable(userId, validToken)).rejects.toThrow(
        'MFA is already enabled',
      );
    });

    it('should not enable MFA if verification fails', async () => {
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.verifyAndEnable(userId, '000000')).rejects.toThrow();

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // verify()
  // ============================================================
  describe('verify', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        totpSecret: mockEncryptedSecret,
        totpEnabled: true,
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
    });

    it('should return { valid: true } if MFA is not enabled for user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        totpSecret: null,
        totpEnabled: false,
      });

      const result = await service.verify(userId, validToken);

      expect(result).toEqual({ valid: true });
    });

    it('should decrypt secret and verify TOTP code', async () => {
      const result = await service.verify(userId, validToken);

      expect(mockEncryption.decrypt).toHaveBeenCalledWith(mockEncryptedSecret);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: mockTotpSecret.base32,
        encoding: 'base32',
        token: validToken,
        window: 1,
      });
      expect(result).toEqual({ valid: true });
    });

    it('should return valid=false with remainingAttempts on invalid TOTP', async () => {
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = await service.verify(userId, '000000');

      expect(result).toEqual({
        valid: false,
        remainingAttempts: 4, // MAX_VERIFY_ATTEMPTS (5) - 1
      });
    });

    describe('backup code verification', () => {
      const backupCode = 'AB12-CD34';

      it('should detect backup code format (9 chars with dash)', async () => {
        mockPrisma.backupCode.findMany.mockResolvedValue([
          { id: 'bc-1', userId, codeHash: 'hashed-code' },
        ]);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const result = await service.verify(userId, backupCode);

        expect(result).toEqual({ valid: true });
        // Should attempt backup code verification before TOTP
        expect(mockPrisma.backupCode.findMany).toHaveBeenCalledWith({
          where: { userId },
        });
      });

      it('should compare uppercase backup code against stored hashes', async () => {
        const lowerBackupCode = 'ab12-cd34';
        mockPrisma.backupCode.findMany.mockResolvedValue([
          { id: 'bc-1', userId, codeHash: 'hashed-code' },
        ]);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await service.verify(userId, lowerBackupCode);

        expect(bcrypt.compare).toHaveBeenCalledWith(lowerBackupCode.toUpperCase(), 'hashed-code');
      });

      it('should delete used backup code after successful match', async () => {
        mockPrisma.backupCode.findMany.mockResolvedValue([
          { id: 'bc-1', userId, codeHash: 'hashed-code' },
        ]);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await service.verify(userId, backupCode);

        expect(mockPrisma.backupCode.delete).toHaveBeenCalledWith({
          where: { id: 'bc-1' },
        });
      });

      it('should fall through to TOTP if backup code does not match any stored hash', async () => {
        mockPrisma.backupCode.findMany.mockResolvedValue([
          { id: 'bc-1', userId, codeHash: 'hashed-code' },
        ]);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);
        (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

        const result = await service.verify(userId, backupCode);

        expect(result).toEqual({
          valid: false,
          remainingAttempts: 4,
        });
      });

      it('should iterate through all backup codes to find a match', async () => {
        mockPrisma.backupCode.findMany.mockResolvedValue([
          { id: 'bc-1', userId, codeHash: 'hash-1' },
          { id: 'bc-2', userId, codeHash: 'hash-2' },
          { id: 'bc-3', userId, codeHash: 'hash-3' },
        ]);
        (bcrypt.compare as jest.Mock)
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true);

        const result = await service.verify(userId, backupCode);

        expect(result).toEqual({ valid: true });
        expect(bcrypt.compare).toHaveBeenCalledTimes(3);
        expect(mockPrisma.backupCode.delete).toHaveBeenCalledWith({
          where: { id: 'bc-3' },
        });
      });
    });
  });

  // ============================================================
  // disable()
  // ============================================================
  describe('disable', () => {
    const password = 'SecurePass123!';

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        totpEnabled: true,
        totpSecret: mockEncryptedSecret,
        passwordHash: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
    });

    it('should throw BadRequestException if MFA is not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        totpEnabled: false,
      });

      await expect(service.disable(userId, validToken, password)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.disable(userId, validToken, password)).rejects.toThrow(
        'MFA is not enabled',
      );
    });

    it('should verify password first via bcrypt.compare', async () => {
      await service.disable(userId, validToken, password);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hashed-password');
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.disable(userId, validToken, 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.disable(userId, validToken, 'wrong-password')).rejects.toThrow(
        'Invalid password',
      );
    });

    it('should verify TOTP code after password verification', async () => {
      await service.disable(userId, validToken, password);

      expect(mockEncryption.decrypt).toHaveBeenCalledWith(mockEncryptedSecret);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: mockTotpSecret.base32,
        encoding: 'base32',
        token: validToken,
        window: 1,
      });
    });

    it('should throw UnauthorizedException on invalid TOTP code', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.disable(userId, '000000', password)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.disable(userId, '000000', password)).rejects.toThrow(
        'Invalid verification code',
      );
    });

    it('should accept backup code for disable (XXXX-XXXX format)', async () => {
      const backupCode = 'AB12-CD34';
      mockPrisma.backupCode.findMany.mockResolvedValue([
        { id: 'bc-1', userId, codeHash: 'hashed-backup' },
      ]);
      // First compare call is for password, subsequent for backup codes
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // password check
        .mockResolvedValueOnce(true); // backup code check

      await service.disable(userId, backupCode, password);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should remove totpSecret, disable totpEnabled, and delete backup codes in transaction', async () => {
      mockPrisma.$transaction.mockImplementation(async (promises: unknown[]) => {
        return Promise.all(promises as Promise<unknown>[]);
      });

      await service.disable(userId, validToken, password);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          totpSecret: null,
          totpEnabled: false,
          totpVerifiedAt: null,
        },
      });
      expect(mockPrisma.backupCode.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should handle missing passwordHash gracefully (compare with empty string)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        totpEnabled: true,
        totpSecret: mockEncryptedSecret,
        passwordHash: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.disable(userId, validToken, password)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(bcrypt.compare).toHaveBeenCalledWith(password, '');
    });
  });

  // ============================================================
  // regenerateBackupCodes()
  // ============================================================
  describe('regenerateBackupCodes', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        totpSecret: mockEncryptedSecret,
        totpEnabled: true,
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
    });

    it('should throw BadRequestException if MFA is not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        totpSecret: null,
        totpEnabled: false,
      });

      await expect(service.regenerateBackupCodes(userId, validToken)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.regenerateBackupCodes(userId, validToken)).rejects.toThrow(
        'MFA is not enabled',
      );
    });

    it('should require TOTP verification before regeneration', async () => {
      await service.regenerateBackupCodes(userId, validToken);

      expect(mockEncryption.decrypt).toHaveBeenCalledWith(mockEncryptedSecret);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: mockTotpSecret.base32,
        encoding: 'base32',
        token: validToken,
        window: 1,
      });
    });

    it('should throw UnauthorizedException on invalid TOTP', async () => {
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.regenerateBackupCodes(userId, '000000')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.regenerateBackupCodes(userId, '000000')).rejects.toThrow(
        'Invalid verification code',
      );
    });

    it('should return 10 new backup codes in XXXX-XXXX format', async () => {
      const result = await service.regenerateBackupCodes(userId, validToken);

      expect(result).toHaveLength(10);
      for (const code of result) {
        expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
      }
    });

    it('should delete old backup codes and create new ones in a transaction', async () => {
      mockPrisma.$transaction.mockImplementation(async (promises: unknown[]) => {
        return Promise.all(promises as Promise<unknown>[]);
      });

      await service.regenerateBackupCodes(userId, validToken);

      expect(mockPrisma.backupCode.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(mockPrisma.backupCode.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId,
            codeHash: expect.any(String),
          }),
        ]),
      });
    });

    it('should hash all new backup codes with bcrypt salt rounds 10', async () => {
      await service.regenerateBackupCodes(userId, validToken);

      expect(bcrypt.hash).toHaveBeenCalledTimes(10);
      for (const call of (bcrypt.hash as jest.Mock).mock.calls) {
        expect(call[1]).toBe(10);
      }
    });
  });

  // ============================================================
  // isMFAEnabled()
  // ============================================================
  describe('isMFAEnabled', () => {
    it('should return true when MFA is enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ totpEnabled: true });

      const result = await service.isMFAEnabled(userId);

      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { totpEnabled: true },
      });
    });

    it('should return false when MFA is disabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ totpEnabled: false });

      const result = await service.isMFAEnabled(userId);

      expect(result).toBe(false);
    });

    it('should return false when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.isMFAEnabled(userId);

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // getStatus()
  // ============================================================
  describe('getStatus', () => {
    it('should return enabled status with verifiedAt and backup code count', async () => {
      const verifiedAt = new Date('2024-01-15T10:30:00Z');
      mockPrisma.user.findUnique.mockResolvedValue({
        totpEnabled: true,
        totpVerifiedAt: verifiedAt,
        _count: { backupCodes: 8 },
      });

      const result = await service.getStatus(userId);

      expect(result).toEqual({
        enabled: true,
        verifiedAt,
        backupCodesCount: 8,
      });
    });

    it('should return disabled status with zero backup codes for non-MFA user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        totpEnabled: false,
        totpVerifiedAt: null,
        _count: { backupCodes: 0 },
      });

      const result = await service.getStatus(userId);

      expect(result).toEqual({
        enabled: false,
        verifiedAt: undefined,
        backupCodesCount: 0,
      });
    });

    it('should return defaults when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getStatus(userId);

      expect(result).toEqual({
        enabled: false,
        backupCodesCount: 0,
      });
    });

    it('should query the correct select fields including _count', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        totpEnabled: false,
        totpVerifiedAt: null,
        _count: { backupCodes: 0 },
      });

      await service.getStatus(userId);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          totpEnabled: true,
          totpVerifiedAt: true,
          _count: { select: { backupCodes: true } },
        },
      });
    });
  });

  // ============================================================
  // adminReset()
  // ============================================================
  describe('adminReset', () => {
    it('should clear MFA data and delete backup codes in a transaction', async () => {
      mockPrisma.$transaction.mockImplementation(async (promises: unknown[]) => {
        return Promise.all(promises as Promise<unknown>[]);
      });

      await service.adminReset(userId);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          totpSecret: null,
          totpEnabled: false,
          totpVerifiedAt: null,
        },
      });
      expect(mockPrisma.backupCode.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should execute both operations within $transaction', async () => {
      await service.adminReset(userId);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      const transactionArgs = mockPrisma.$transaction.mock.calls[0][0];
      expect(transactionArgs).toHaveLength(2);
    });

    it('should not require password or TOTP verification', async () => {
      await service.adminReset(userId);

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(speakeasy.totp.verify).not.toHaveBeenCalled();
      expect(mockEncryption.decrypt).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Backup code generation security
  // ============================================================
  describe('backup code generation security', () => {
    it('should use crypto.randomBytes, not Math.random', async () => {
      const mathRandomSpy = jest.spyOn(Math, 'random');

      mockPrisma.user.findUnique.mockResolvedValue({ totpEnabled: false });
      await service.enroll(userId, userEmail);

      // Verify Math.random is NOT used (crypto.randomBytes is used internally)
      expect(mathRandomSpy).not.toHaveBeenCalled();

      mathRandomSpy.mockRestore();
    });

    it('should produce unique backup codes across enrollments', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ totpEnabled: false });

      const result1 = await service.enroll(userId, userEmail);
      const result2 = await service.enroll(userId, userEmail);

      // With crypto.randomBytes, collision is statistically near-impossible
      const allCodes = [...result1.backupCodes, ...result2.backupCodes];
      const uniqueCodes = new Set(allCodes);
      // At minimum, not all codes should be identical across two enrollments
      expect(uniqueCodes.size).toBeGreaterThan(10);
    });

    it('should generate each backup code part as 2 random bytes (4 hex chars)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ totpEnabled: false });
      const result = await service.enroll(userId, userEmail);

      // Each backup code part should be exactly 4 hex chars (= 2 bytes)
      for (const code of result.backupCodes) {
        const [part1, part2] = code.split('-');
        expect(part1).toHaveLength(4);
        expect(part2).toHaveLength(4);
        expect(part1).toMatch(/^[0-9A-F]{4}$/);
        expect(part2).toMatch(/^[0-9A-F]{4}$/);
      }
    });

    it('should produce codes with valid hex characters only (0-9, A-F)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ totpEnabled: false });
      const result = await service.enroll(userId, userEmail);

      for (const code of result.backupCodes) {
        const [part1, part2] = code.split('-');
        expect(part1).toMatch(/^[0-9A-F]{4}$/);
        expect(part2).toMatch(/^[0-9A-F]{4}$/);
      }
    });

    it('should generate codes with uppercase hex digits', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ totpEnabled: false });
      const result = await service.enroll(userId, userEmail);

      for (const code of result.backupCodes) {
        // Ensure no lowercase hex chars
        expect(code).not.toMatch(/[a-f]/);
        // Ensure uppercase format
        expect(code).toBe(code.toUpperCase());
      }
    });
  });
});
