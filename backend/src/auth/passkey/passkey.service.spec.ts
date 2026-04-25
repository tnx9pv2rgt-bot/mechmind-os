import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasskeyService } from './passkey.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';
import { RedisService } from '@common/services/redis.service';
import { AuthService } from '../services/auth.service';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';

// Mock @simplewebauthn/server
jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

// Mock crypto.randomUUID
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(() => 'mock-session-id'),
}));

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const mockGenerateRegistrationOptions = generateRegistrationOptions as jest.MockedFunction<
  typeof generateRegistrationOptions
>;
const mockVerifyRegistrationResponse = verifyRegistrationResponse as jest.MockedFunction<
  typeof verifyRegistrationResponse
>;
const mockGenerateAuthenticationOptions = generateAuthenticationOptions as jest.MockedFunction<
  typeof generateAuthenticationOptions
>;
const mockVerifyAuthenticationResponse = verifyAuthenticationResponse as jest.MockedFunction<
  typeof verifyAuthenticationResponse
>;

describe('PasskeyService', () => {
  let service: PasskeyService;
  let prisma: {
    user: { findUnique: jest.Mock };
    passkey: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let authService: { generateTokens: jest.Mock; updateLastLogin: jest.Mock };
  let logger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      passkey: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    authService = { generateTokens: jest.fn(), updateLastLogin: jest.fn() };
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasskeyService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: string) => {
              const map: Record<string, string> = {
                WEBAUTHN_RP_ID: 'localhost',
                WEBAUTHN_RP_NAME: 'MechMind OS',
                WEBAUTHN_ORIGIN: 'http://localhost:3001',
              };
              return map[key] ?? defaultValue;
            }),
          },
        },
        { provide: LoggerService, useValue: logger },
        { provide: RedisService, useValue: redis },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    service = module.get<PasskeyService>(PasskeyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateRegistrationOptions', () => {
    const userId = 'user-1';
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      passkeys: [{ credentialId: 'existing-cred-1' }],
    };

    it('should generate registration options for an existing user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const mockOptions = { challenge: 'mock-challenge', rp: { id: 'localhost' } };
      mockGenerateRegistrationOptions.mockResolvedValue(mockOptions as never);
      redis.set.mockResolvedValue('OK');

      const result = await service.generateRegistrationOptions(userId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          passkeys: { select: { credentialId: true } },
        },
      });
      expect(mockGenerateRegistrationOptions).toHaveBeenCalledWith({
        rpName: 'MechMind OS',
        rpID: 'localhost',
        userName: 'test@example.com',
        userDisplayName: 'Test User',
        attestationType: 'none',
        excludeCredentials: [{ id: 'existing-cred-1' }],
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      });
      expect(redis.set).toHaveBeenCalledWith(
        'passkey:reg:mock-session-id',
        JSON.stringify({ challenge: 'mock-challenge', userId }),
        300,
      );
      expect(result).toEqual({
        options: mockOptions,
        sessionId: 'mock-session-id',
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.generateRegistrationOptions(userId)).rejects.toThrow(NotFoundException);
    });

    it('should exclude existing passkeys from registration options', async () => {
      const userWithMultiplePasskeys = {
        ...mockUser,
        passkeys: [{ credentialId: 'cred-1' }, { credentialId: 'cred-2' }],
      };
      prisma.user.findUnique.mockResolvedValue(userWithMultiplePasskeys);
      mockGenerateRegistrationOptions.mockResolvedValue({ challenge: 'c' } as never);
      redis.set.mockResolvedValue('OK');

      await service.generateRegistrationOptions(userId);

      expect(mockGenerateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeCredentials: [{ id: 'cred-1' }, { id: 'cred-2' }],
        }),
      );
    });

    it('should work when user has no existing passkeys', async () => {
      const userNoPasskeys = { ...mockUser, passkeys: [] };
      prisma.user.findUnique.mockResolvedValue(userNoPasskeys);
      mockGenerateRegistrationOptions.mockResolvedValue({ challenge: 'c' } as never);
      redis.set.mockResolvedValue('OK');

      await service.generateRegistrationOptions(userId);

      expect(mockGenerateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({ excludeCredentials: [] }),
      );
    });
  });

  describe('verifyRegistration', () => {
    const userId = 'user-1';
    const sessionId = 'session-1';
    const attestation = { id: 'cred-id', rawId: 'raw' } as unknown as RegistrationResponseJSON;

    const storedSession = JSON.stringify({ challenge: 'test-challenge', userId });

    it('should verify registration and create a passkey', async () => {
      redis.get.mockResolvedValue(storedSession);
      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([1, 2, 3]),
            publicKey: new Uint8Array([4, 5, 6]),
            counter: 0,
            transports: ['usb', 'ble'],
          },
          credentialDeviceType: 'singleDevice',
        },
      } as never);
      prisma.passkey.create.mockResolvedValue({ id: 'passkey-1' });
      redis.del.mockResolvedValue(1);

      const result = await service.verifyRegistration(
        userId,
        attestation,
        sessionId,
        'My Key',
        'Mozilla/5.0 (iPhone)',
      );

      expect(redis.get).toHaveBeenCalledWith(`passkey:reg:${sessionId}`);
      expect(mockVerifyRegistrationResponse).toHaveBeenCalledWith({
        response: attestation,
        expectedChallenge: 'test-challenge',
        expectedOrigin: 'http://localhost:3001',
        expectedRPID: 'localhost',
      });
      expect(prisma.passkey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          counter: 0,
          deviceName: 'My Key',
          deviceType: 'singleDevice',
          isBackupKey: false,
        }),
      });
      expect(redis.del).toHaveBeenCalledWith(`passkey:reg:${sessionId}`);
      expect(result).toEqual({ id: 'passkey-1' });
    });

    it('should throw BadRequestException when challenge is expired', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.verifyRegistration(userId, attestation, sessionId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException on session user mismatch', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ challenge: 'c', userId: 'different-user' }));

      await expect(service.verifyRegistration(userId, attestation, sessionId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when verification fails', async () => {
      redis.get.mockResolvedValue(storedSession);
      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: false,
        registrationInfo: null,
      } as never);

      await expect(service.verifyRegistration(userId, attestation, sessionId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when registrationInfo is null', async () => {
      redis.get.mockResolvedValue(storedSession);
      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: null,
      } as never);

      await expect(service.verifyRegistration(userId, attestation, sessionId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should use userAgent-derived device name when deviceName is not provided', async () => {
      redis.get.mockResolvedValue(storedSession);
      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([1]),
            publicKey: new Uint8Array([2]),
            counter: 0,
            transports: [],
          },
          credentialDeviceType: 'multiDevice',
        },
      } as never);
      prisma.passkey.create.mockResolvedValue({ id: 'pk-2' });
      redis.del.mockResolvedValue(1);

      await service.verifyRegistration(
        userId,
        attestation,
        sessionId,
        undefined,
        'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
      );

      expect(prisma.passkey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ deviceName: 'Mac' }),
      });
    });

    it('should use "Unknown Device" when no deviceName or userAgent', async () => {
      redis.get.mockResolvedValue(storedSession);
      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([1]),
            publicKey: new Uint8Array([2]),
            counter: 0,
            transports: undefined,
          },
          credentialDeviceType: undefined,
        },
      } as never);
      prisma.passkey.create.mockResolvedValue({ id: 'pk-3' });
      redis.del.mockResolvedValue(1);

      await service.verifyRegistration(userId, attestation, sessionId);

      expect(prisma.passkey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceName: 'Unknown Device',
          deviceType: 'unknown',
          transports: [],
        }),
      });
    });
  });

  describe('generateAuthenticationOptions', () => {
    it('should generate authentication options and store challenge in Redis', async () => {
      const mockOptions = { challenge: 'auth-challenge', rpId: 'localhost' };
      mockGenerateAuthenticationOptions.mockResolvedValue(mockOptions as never);
      redis.set.mockResolvedValue('OK');

      const result = await service.generateAuthenticationOptions();

      expect(mockGenerateAuthenticationOptions).toHaveBeenCalledWith({
        rpID: 'localhost',
        userVerification: 'preferred',
      });
      expect(redis.set).toHaveBeenCalledWith('passkey:auth:mock-session-id', 'auth-challenge', 300);
      expect(result).toEqual({
        options: mockOptions,
        sessionId: 'mock-session-id',
      });
    });
  });

  describe('verifyAuthentication', () => {
    const sessionId = 'auth-session-1';
    const assertion = { id: 'cred-123' } as unknown as AuthenticationResponseJSON;
    const mockPasskey = {
      id: 'pk-1',
      credentialId: 'cred-123',
      publicKey: Buffer.from([1, 2, 3]).toString('base64url'),
      counter: 5,
      transports: ['usb'],
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        isActive: true,
        tenantId: 'tenant-1',
        tenant: {
          id: 'tenant-1',
          name: 'Test Tenant',
          slug: 'test-tenant',
          isActive: true,
        },
      },
    };
    const mockTokens = {
      accessToken: 'at',
      refreshToken: 'rt',
      expiresIn: 3600,
    };

    it('should verify authentication and return tokens', async () => {
      redis.get.mockResolvedValue('stored-challenge');
      prisma.passkey.findFirst.mockResolvedValue(mockPasskey);
      mockVerifyAuthenticationResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 6 },
      } as never);
      prisma.passkey.update.mockResolvedValue({});
      redis.del.mockResolvedValue(1);
      authService.updateLastLogin.mockResolvedValue(undefined);
      authService.generateTokens.mockReturnValue(mockTokens);

      const result = await service.verifyAuthentication(assertion, sessionId, '127.0.0.1');

      expect(redis.get).toHaveBeenCalledWith(`passkey:auth:${sessionId}`);
      expect(prisma.passkey.findFirst).toHaveBeenCalledWith({
        where: { credentialId: 'cred-123' },
        include: { user: { include: { tenant: true } } },
      });
      expect(mockVerifyAuthenticationResponse).toHaveBeenCalledWith({
        response: assertion,
        expectedChallenge: 'stored-challenge',
        expectedOrigin: 'http://localhost:3001',
        expectedRPID: 'localhost',
        credential: {
          id: 'cred-123',
          publicKey: Buffer.from(mockPasskey.publicKey, 'base64url'),
          counter: 5,
          transports: ['usb'],
        },
      });
      expect(prisma.passkey.update).toHaveBeenCalledWith({
        where: { id: 'pk-1' },
        data: expect.objectContaining({ counter: 6 }),
      });
      expect(redis.del).toHaveBeenCalledWith(`passkey:auth:${sessionId}`);
      expect(authService.updateLastLogin).toHaveBeenCalledWith('user-1', '127.0.0.1');
      expect(authService.generateTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
        }),
      );
      expect(result).toEqual(mockTokens);
    });

    it('should throw BadRequestException when challenge is expired', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.verifyAuthentication(assertion, sessionId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when passkey is not found', async () => {
      redis.get.mockResolvedValue('challenge');
      prisma.passkey.findFirst.mockResolvedValue(null);

      await expect(service.verifyAuthentication(assertion, sessionId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when passkey has no user', async () => {
      redis.get.mockResolvedValue('challenge');
      prisma.passkey.findFirst.mockResolvedValue({ ...mockPasskey, user: null });

      await expect(service.verifyAuthentication(assertion, sessionId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when verification fails', async () => {
      redis.get.mockResolvedValue('challenge');
      prisma.passkey.findFirst.mockResolvedValue(mockPasskey);
      mockVerifyAuthenticationResponse.mockResolvedValue({
        verified: false,
        authenticationInfo: { newCounter: 5 },
      } as never);

      await expect(service.verifyAuthentication(assertion, sessionId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle missing transports on passkey', async () => {
      const passkeyNoTransports = { ...mockPasskey, transports: null };
      redis.get.mockResolvedValue('challenge');
      prisma.passkey.findFirst.mockResolvedValue(passkeyNoTransports);
      mockVerifyAuthenticationResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 6 },
      } as never);
      prisma.passkey.update.mockResolvedValue({});
      redis.del.mockResolvedValue(1);
      authService.updateLastLogin.mockResolvedValue(undefined);
      authService.generateTokens.mockReturnValue(mockTokens);

      await service.verifyAuthentication(assertion, sessionId);

      expect(mockVerifyAuthenticationResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          credential: expect.objectContaining({ transports: [] }),
        }),
      );
    });

    it('should work without ip parameter', async () => {
      redis.get.mockResolvedValue('challenge');
      prisma.passkey.findFirst.mockResolvedValue(mockPasskey);
      mockVerifyAuthenticationResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 6 },
      } as never);
      prisma.passkey.update.mockResolvedValue({});
      redis.del.mockResolvedValue(1);
      authService.updateLastLogin.mockResolvedValue(undefined);
      authService.generateTokens.mockReturnValue(mockTokens);

      const result = await service.verifyAuthentication(assertion, sessionId);

      expect(authService.updateLastLogin).toHaveBeenCalledWith('user-1', undefined);
      expect(result).toEqual(mockTokens);
    });
  });

  describe('listPasskeys', () => {
    const userId = 'user-1';

    it('should return passkeys for a user ordered by registeredAt desc', async () => {
      const mockPasskeys = [
        {
          id: 'pk-2',
          deviceName: 'iPhone',
          deviceType: 'singleDevice',
          lastUsedAt: new Date('2026-01-02'),
          registeredAt: new Date('2026-01-02'),
        },
        {
          id: 'pk-1',
          deviceName: 'Mac',
          deviceType: 'multiDevice',
          lastUsedAt: null,
          registeredAt: new Date('2026-01-01'),
        },
      ];
      prisma.passkey.findMany.mockResolvedValue(mockPasskeys);

      const result = await service.listPasskeys(userId);

      expect(prisma.passkey.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: {
          id: true,
          deviceName: true,
          deviceType: true,
          lastUsedAt: true,
          registeredAt: true,
        },
        orderBy: { registeredAt: 'desc' },
      });
      expect(result).toEqual(mockPasskeys);
    });

    it('should return empty array when user has no passkeys', async () => {
      prisma.passkey.findMany.mockResolvedValue([]);

      const result = await service.listPasskeys(userId);

      expect(result).toEqual([]);
    });
  });

  describe('deletePasskey', () => {
    const userId = 'user-1';
    const passkeyId = 'pk-1';

    it('should delete a passkey owned by the user', async () => {
      prisma.passkey.findFirst.mockResolvedValue({ id: passkeyId, userId });
      prisma.passkey.delete.mockResolvedValue({});

      await service.deletePasskey(userId, passkeyId);

      expect(prisma.passkey.findFirst).toHaveBeenCalledWith({
        where: { id: passkeyId, userId },
      });
      expect(prisma.passkey.delete).toHaveBeenCalledWith({
        where: { id: passkeyId },
      });
      expect(logger.log).toHaveBeenCalledWith(`Passkey ${passkeyId} deleted by user ${userId}`);
    });

    it('should throw NotFoundException when passkey does not exist', async () => {
      prisma.passkey.findFirst.mockResolvedValue(null);

      await expect(service.deletePasskey(userId, passkeyId)).rejects.toThrow(NotFoundException);
      expect(prisma.passkey.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not own the passkey', async () => {
      prisma.passkey.findFirst.mockResolvedValue(null);

      await expect(service.deletePasskey(userId, passkeyId)).rejects.toThrow(NotFoundException);
      expect(prisma.passkey.delete).not.toHaveBeenCalled();
    });
  });

  describe('getDeviceName (private, tested via verifyRegistration)', () => {
    const setupVerification = async (userAgent?: string): Promise<void> => {
      redis.get.mockResolvedValue(JSON.stringify({ challenge: 'c', userId: 'u1' }));
      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([1]),
            publicKey: new Uint8Array([2]),
            counter: 0,
            transports: [],
          },
          credentialDeviceType: 'singleDevice',
        },
      } as never);
      prisma.passkey.create.mockResolvedValue({ id: 'pk' });
      redis.del.mockResolvedValue(1);

      await service.verifyRegistration(
        'u1',
        {} as RegistrationResponseJSON,
        'session',
        undefined,
        userAgent,
      );
    };

    it.each([
      ['Mozilla/5.0 (iPhone; CPU iPhone OS)', 'iPhone'],
      ['Mozilla/5.0 (iPad; CPU OS)', 'iPad'],
      ['Mozilla/5.0 (Linux; Android 12)', 'Android'],
      ['Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'Mac'],
      ['Mozilla/5.0 (Windows NT 10.0)', 'Windows PC'],
      ['Mozilla/5.0 (Linux; Ubuntu)', 'Unknown Device'],
      [undefined, 'Unknown Device'],
    ])('should return "%s" for userAgent containing "%s"', async (userAgent, expectedDevice) => {
      await setupVerification(userAgent);

      expect(prisma.passkey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ deviceName: expectedDevice }),
      });
    });
  });

  describe('verifyAuthentication — inactive user/tenant (line 169)', () => {
    const sessionId = 'auth-session-inactive';
    const assertion = { id: 'cred-inactive' } as unknown as AuthenticationResponseJSON;

    it('should throw BadRequestException when user is inactive', async () => {
      redis.get.mockResolvedValue('stored-challenge');
      prisma.passkey.findFirst.mockResolvedValue({
        id: 'pk-inactive',
        credentialId: 'cred-inactive',
        publicKey: Buffer.from([1, 2, 3]).toString('base64url'),
        counter: 0,
        transports: [],
        user: {
          id: 'user-inactive',
          isActive: false,
          tenantId: 'tenant-1',
          tenant: { id: 'tenant-1', isActive: true },
        },
      });

      await expect(service.verifyAuthentication(assertion, sessionId, '127.0.0.1')).rejects.toThrow(
        'User or tenant is inactive',
      );
    });

    it('should throw BadRequestException when tenant is inactive (|| right branch)', async () => {
      redis.get.mockResolvedValue('stored-challenge');
      prisma.passkey.findFirst.mockResolvedValue({
        id: 'pk-tenant-inactive',
        credentialId: 'cred-inactive',
        publicKey: Buffer.from([1, 2, 3]).toString('base64url'),
        counter: 0,
        transports: [],
        user: {
          id: 'user-1',
          isActive: true,
          tenantId: 'tenant-1',
          tenant: { id: 'tenant-1', isActive: false },
        },
      });

      await expect(service.verifyAuthentication(assertion, sessionId, '127.0.0.1')).rejects.toThrow(
        'User or tenant is inactive',
      );
    });
  });
});
