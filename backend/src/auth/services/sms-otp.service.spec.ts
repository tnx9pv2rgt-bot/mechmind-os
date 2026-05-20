import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SmsOtpService, OtpPurpose } from './sms-otp.service';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { SmsService } from '../../notifications/sms/sms.service';

describe('SmsOtpService', () => {
  let service: SmsOtpService;

  const mockUserId = 'user-123';
  const mockTenantId = 'tenant-456';
  const mockPhone = '+393331234567';

  const mockPrisma = {
    smsOtp: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockSmsService = {
    sendCustom: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-123' }),
  };

  const mockEncryption = {
    hash: jest.fn().mockReturnValue('hashed-phone'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockSmsService.sendCustom.mockResolvedValue({ success: true, messageId: 'msg-123' });
    mockEncryption.hash.mockReturnValue('hashed-phone');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsOtpService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SmsService, useValue: mockSmsService },
        { provide: EncryptionService, useValue: mockEncryption },
      ],
    }).compile();

    service = module.get<SmsOtpService>(SmsOtpService);
  });

  describe('sendOtp', () => {
    const sendParams = {
      userId: mockUserId,
      tenantId: mockTenantId,
      phone: mockPhone,
      purpose: 'phone_verify' as OtpPurpose,
    };

    beforeEach(() => {
      // No rate limit hit (no recent OTP)
      mockPrisma.smsOtp.findFirst.mockResolvedValue(null);
      mockPrisma.smsOtp.create.mockResolvedValue({
        id: 'otp-1',
        userId: mockUserId,
        tenantId: mockTenantId,
        phone: 'hashed-phone',
        code: 'hashed-code',
        purpose: 'phone_verify',
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 300000),
        usedAt: null,
        createdAt: new Date(),
      });
    });

    it('dovrebbe generare e inviare un OTP di 6 cifre', async () => {
      const result = await service.sendOtp(sendParams);

      expect(result.success).toBe(true);
      expect(result.expiresIn).toBe(300);
      expect(mockSmsService.sendCustom).toHaveBeenCalledWith(
        mockPhone,
        expect.stringContaining('codice di verifica MechMind'),
        'otp_verification',
      );

      // Verify the SMS contains a 6-digit code
      const smsCall = mockSmsService.sendCustom.mock.calls[0];
      const message = smsCall[1] as string;
      const codeMatch = message.match(/è: (\d{6})/);
      expect(codeMatch).not.toBeNull();
      expect(codeMatch![1].length).toBe(6);
    });

    it('dovrebbe salvare il codice hashato con bcrypt', async () => {
      await service.sendOtp(sendParams);

      expect(mockPrisma.smsOtp.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          tenantId: mockTenantId,
          phone: 'hashed-phone',
          purpose: 'phone_verify',
          attempts: 0,
          maxAttempts: 5,
        }),
      });

      // Verify code is bcrypt hashed (starts with $2b$)
      const createCall = mockPrisma.smsOtp.create.mock.calls[0][0];
      const storedCode = createCall.data.code as string;
      expect(storedCode.startsWith('$2b$')).toBe(true);
    });

    it('dovrebbe invalidare OTP precedenti per lo stesso utente e scopo', async () => {
      await service.sendOtp(sendParams);

      expect(mockPrisma.smsOtp.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          tenantId: mockTenantId,
          purpose: 'phone_verify',
          usedAt: null,
        },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('dovrebbe applicare il rate limiting di 30 secondi', async () => {
      // Simulate a recent OTP within cooldown
      mockPrisma.smsOtp.findFirst.mockResolvedValue({
        id: 'recent-otp',
        createdAt: new Date(), // just now
        userId: mockUserId,
        tenantId: mockTenantId,
        phone: 'hashed-phone',
        code: 'hashed-code',
        purpose: 'phone_verify',
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 300000),
        usedAt: null,
      });

      await expect(service.sendOtp(sendParams)).rejects.toThrow(BadRequestException);
      await expect(service.sendOtp(sendParams)).rejects.toThrow(/Attendi/);
    });

    it("dovrebbe lanciare un errore se l'invio SMS fallisce", async () => {
      mockSmsService.sendCustom.mockResolvedValue({ success: false, error: 'Twilio error' });

      await expect(service.sendOtp(sendParams)).rejects.toThrow(BadRequestException);
      await expect(service.sendOtp(sendParams)).rejects.toThrow(/Impossibile inviare/);
    });
  });

  describe('verifyOtp', () => {
    const verifyParams = {
      userId: mockUserId,
      code: '123456',
      purpose: 'phone_verify' as OtpPurpose,
    };

    it('dovrebbe verificare un codice OTP corretto', async () => {
      const hashedCode = await bcrypt.hash('123456', 10);

      mockPrisma.smsOtp.findFirst.mockResolvedValue({
        id: 'otp-1',
        userId: mockUserId,
        tenantId: mockTenantId,
        phone: 'hashed-phone',
        code: hashedCode,
        purpose: 'phone_verify',
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 300000),
        usedAt: null,
        createdAt: new Date(),
      });

      const result = await service.verifyOtp(verifyParams);

      expect(result.valid).toBe(true);
      expect(mockPrisma.smsOtp.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('dovrebbe rifiutare un codice OTP errato e incrementare i tentativi', async () => {
      const hashedCode = await bcrypt.hash('654321', 10); // different code

      mockPrisma.smsOtp.findFirst.mockResolvedValue({
        id: 'otp-1',
        userId: mockUserId,
        tenantId: mockTenantId,
        phone: 'hashed-phone',
        code: hashedCode,
        purpose: 'phone_verify',
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 300000),
        usedAt: null,
        createdAt: new Date(),
      });

      mockPrisma.smsOtp.update.mockResolvedValue({
        id: 'otp-1',
        attempts: 1,
        userId: mockUserId,
        tenantId: mockTenantId,
        phone: 'hashed-phone',
        code: hashedCode,
        purpose: 'phone_verify',
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 300000),
        usedAt: null,
        createdAt: new Date(),
      });

      const result = await service.verifyOtp(verifyParams);

      expect(result.valid).toBe(false);
      expect(result.remainingAttempts).toBe(4);
    });

    it('dovrebbe lanciare errore quando non esiste OTP valido (scaduto)', async () => {
      mockPrisma.smsOtp.findFirst.mockResolvedValue(null);

      await expect(service.verifyOtp(verifyParams)).rejects.toThrow(BadRequestException);
      await expect(service.verifyOtp(verifyParams)).rejects.toThrow(/scaduto/);
    });

    it('dovrebbe invalidare OTP dopo 5 tentativi falliti', async () => {
      const hashedCode = await bcrypt.hash('654321', 10);

      mockPrisma.smsOtp.findFirst.mockResolvedValue({
        id: 'otp-1',
        userId: mockUserId,
        tenantId: mockTenantId,
        phone: 'hashed-phone',
        code: hashedCode,
        purpose: 'phone_verify',
        attempts: 5, // max attempts reached
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 300000),
        usedAt: null,
        createdAt: new Date(),
      });

      await expect(service.verifyOtp(verifyParams)).rejects.toThrow(BadRequestException);
      await expect(service.verifyOtp(verifyParams)).rejects.toThrow(/Troppi tentativi/);

      // Should mark OTP as used (invalidated)
      expect(mockPrisma.smsOtp.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('dovrebbe isolare OTP per scopo (login vs recovery vs phone_verify)', async () => {
      await service
        .verifyOtp({
          userId: mockUserId,
          code: '123456',
          purpose: 'login_mfa',
        })
        .catch(() => {}); // will throw because no OTP found

      // The findFirst query must filter by purpose
      expect(mockPrisma.smsOtp.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: mockUserId,
          purpose: 'login_mfa',
        }),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('pulizia OTP scaduti', () => {
    it("dovrebbe pulire gli OTP scaduti al momento dell'invio", async () => {
      mockPrisma.smsOtp.findFirst.mockResolvedValue(null);
      mockPrisma.smsOtp.create.mockResolvedValue({
        id: 'otp-1',
        userId: mockUserId,
        tenantId: mockTenantId,
        phone: 'hashed-phone',
        code: 'hashed-code',
        purpose: 'phone_verify',
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 300000),
        usedAt: null,
        createdAt: new Date(),
      });

      await service.sendOtp({
        userId: mockUserId,
        tenantId: mockTenantId,
        phone: mockPhone,
        purpose: 'phone_verify',
      });

      expect(mockPrisma.smsOtp.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });
  });
});
