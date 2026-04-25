import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TenantSettingsService } from './tenant-settings.service';
import { PrismaService } from '../common/services/prisma.service';

describe('TenantSettingsService', () => {
  let service: TenantSettingsService;
  let prisma: {
    tenant: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    prisma = {
      tenant: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantSettingsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<TenantSettingsService>(TenantSettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSettings', () => {
    it('should return tenant settings', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: { ragioneSociale: 'Officina Test', partitaIva: '12345678901' },
      });

      const result = await service.getSettings(TENANT_ID);

      expect(result).toEqual({ ragioneSociale: 'Officina Test', partitaIva: '12345678901' });
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        select: { settings: true },
      });
    });

    it('should return empty object when settings is null', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ settings: null });

      const result = await service.getSettings(TENANT_ID);

      expect(result).toEqual({});
    });

    it('should throw NotFoundException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getSettings('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSettings', () => {
    it('should merge new settings with existing', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: { ragioneSociale: 'Old Name', partitaIva: '12345678901' },
      });
      prisma.tenant.update.mockResolvedValue({
        settings: { ragioneSociale: 'New Name', partitaIva: '12345678901', city: 'Roma' },
      });

      const result = await service.updateSettings(TENANT_ID, {
        ragioneSociale: 'New Name',
        city: 'Roma',
      });

      expect(result).toEqual({
        ragioneSociale: 'New Name',
        partitaIva: '12345678901',
        city: 'Roma',
      });
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: {
          settings: {
            ragioneSociale: 'New Name',
            partitaIva: '12345678901',
            city: 'Roma',
          },
        },
        select: { settings: true },
      });
    });

    it('should not overwrite fields with undefined', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: { ragioneSociale: 'Keep', numberOfBays: 4 },
      });
      prisma.tenant.update.mockResolvedValue({
        settings: { ragioneSociale: 'Keep', numberOfBays: 4 },
      });

      await service.updateSettings(TENANT_ID, {});

      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { settings: { ragioneSociale: 'Keep', numberOfBays: 4 } },
        }),
      );
    });

    it('should throw NotFoundException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.updateSettings('invalid', { city: 'Roma' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateLogo', () => {
    it('should update logoUrl in settings', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: { ragioneSociale: 'Test' },
      });
      prisma.tenant.update.mockResolvedValue({
        settings: { ragioneSociale: 'Test', logoUrl: 'https://s3.amazonaws.com/logo.png' },
      });

      const result = await service.updateLogo(TENANT_ID, 'https://s3.amazonaws.com/logo.png');

      expect(result.logoUrl).toBe('https://s3.amazonaws.com/logo.png');
    });

    it('should throw NotFoundException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.updateLogo('invalid', 'https://logo.png')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('completeOnboarding', () => {
    it('should merge onboarding data and set onboardingCompleted to true', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: { city: 'Roma' },
      });
      prisma.tenant.update.mockResolvedValue({
        settings: {
          city: 'Roma',
          ragioneSociale: 'Officina Test',
          partitaIva: '12345678901',
          numberOfBays: 4,
          onboardingCompleted: true,
        },
      });

      const dto = {
        ragioneSociale: 'Officina Test',
        partitaIva: '12345678901',
        numberOfBays: 4,
      };

      const result = await service.completeOnboarding(TENANT_ID, dto);

      expect(result.onboardingCompleted).toBe(true);
      expect(result.ragioneSociale).toBe('Officina Test');
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: {
          settings: {
            city: 'Roma',
            ragioneSociale: 'Officina Test',
            partitaIva: '12345678901',
            numberOfBays: 4,
            onboardingCompleted: true,
          },
        },
        select: { settings: true },
      });
    });

    it('should throw NotFoundException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.completeOnboarding('invalid', { ragioneSociale: 'X', partitaIva: '12345678901' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should preserve existing settings when completing onboarding', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: { logoUrl: 'https://logo.png', defaultVatRate: 22 },
      });
      prisma.tenant.update.mockResolvedValue({
        settings: {
          logoUrl: 'https://logo.png',
          defaultVatRate: 22,
          ragioneSociale: 'Test',
          partitaIva: '12345678901',
          onboardingCompleted: true,
        },
      });

      const result = await service.completeOnboarding(TENANT_ID, {
        ragioneSociale: 'Test',
        partitaIva: '12345678901',
      });

      expect(result.logoUrl).toBe('https://logo.png');
      expect(result.onboardingCompleted).toBe(true);
    });
  });

  describe('getOnboardingStatus', () => {
    it('should return completed true when onboardingCompleted is set', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: {
          ragioneSociale: 'Test',
          partitaIva: '12345678901',
          businessHours: { monday: { open: '08:00', close: '18:00' } },
          numberOfBays: 4,
          slotDurationMinutes: 60,
          defaultVatRate: 22,
          invoiceNumberFormat: 'FT-{YEAR}-{SEQ}',
          currency: 'EUR',
          onboardingCompleted: true,
        },
      });

      const result = await service.getOnboardingStatus(TENANT_ID);

      expect(result.completed).toBe(true);
      expect(result.steps).toEqual({
        ragioneSociale: true,
        partitaIva: true,
        businessHours: true,
        numberOfBays: true,
        slotDurationMinutes: true,
        defaultVatRate: true,
        invoiceNumberFormat: true,
        currency: true,
      });
    });

    it('should return completed false and partial steps when fields are missing', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: {
          ragioneSociale: 'Test',
          partitaIva: '12345678901',
        },
      });

      const result = await service.getOnboardingStatus(TENANT_ID);

      expect(result.completed).toBe(false);
      expect(result.steps.ragioneSociale).toBe(true);
      expect(result.steps.partitaIva).toBe(true);
      expect(result.steps.businessHours).toBe(false);
      expect(result.steps.numberOfBays).toBe(false);
      expect(result.steps.slotDurationMinutes).toBe(false);
      expect(result.steps.defaultVatRate).toBe(false);
      expect(result.steps.invoiceNumberFormat).toBe(false);
      expect(result.steps.currency).toBe(false);
    });

    it('should return all false steps for empty settings', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: {},
      });

      const result = await service.getOnboardingStatus(TENANT_ID);

      expect(result.completed).toBe(false);
      expect(Object.values(result.steps).every(v => v === false)).toBe(true);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getOnboardingStatus('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('partMarkupMatrix settings', () => {
    it('should store matrix pricing rules in settings', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ settings: {} });
      const matrix = {
        rules: [
          { maxCostPrice: 10, markupPercent: 100 },
          { maxCostPrice: 50, markupPercent: 75 },
          { maxCostPrice: 200, markupPercent: 50 },
        ],
      };
      prisma.tenant.update.mockResolvedValue({
        settings: { partMarkupMatrix: matrix },
      });

      const result = await service.updateSettings(TENANT_ID, { partMarkupMatrix: matrix });

      expect(result.partMarkupMatrix).toEqual(matrix);
    });
  });

  describe('getOnboardingStatus - edge cases', () => {
    it('should handle null businessHours', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: {
          ragioneSociale: 'Test',
          partitaIva: '12345678901',
          businessHours: null,
        },
      });

      const result = await service.getOnboardingStatus(TENANT_ID);

      expect(result.steps.businessHours).toBe(false);
    });

    it('should detect businessHours as false when empty object', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: {
          ragioneSociale: 'Test',
          businessHours: {},
        },
      });

      const result = await service.getOnboardingStatus(TENANT_ID);

      expect(result.steps.businessHours).toBe(false);
    });

    it('should detect businessHours as true when has entries', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: {
          ragioneSociale: 'Test',
          businessHours: {
            monday: { open: '08:00', close: '18:00' },
          },
        },
      });

      const result = await service.getOnboardingStatus(TENANT_ID);

      expect(result.steps.businessHours).toBe(true);
    });

    it('should handle defaultVatRate = 0 as completed', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: {
          ragioneSociale: 'Test',
          partitaIva: '12345678901',
          businessHours: { monday: { open: '08:00', close: '18:00' } },
          numberOfBays: 4,
          slotDurationMinutes: 60,
          defaultVatRate: 0,
          invoiceNumberFormat: 'FT-{YEAR}-{SEQ}',
          currency: 'EUR',
        },
      });

      const result = await service.getOnboardingStatus(TENANT_ID);

      expect(result.steps.defaultVatRate).toBe(true);
    });

    it('should distinguish between undefined and null defaultVatRate', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: {
          defaultVatRate: null,
        },
      });

      const result = await service.getOnboardingStatus(TENANT_ID);

      expect(result.steps.defaultVatRate).toBe(false);
    });
  });

  describe('updateSettings - conditional field updates', () => {
    it('should skip undefined fields during update', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: { ragioneSociale: 'Keep', numberOfBays: 4, city: 'Roma' },
      });
      prisma.tenant.update.mockResolvedValue({
        settings: { ragioneSociale: 'Keep', numberOfBays: 4, city: 'Roma' },
      });

      await service.updateSettings(TENANT_ID, {
        numberOfBays: undefined,
        city: undefined,
      });

      const callData = prisma.tenant.update.mock.calls[0][0].data;
      expect(callData.settings).toEqual({
        ragioneSociale: 'Keep',
        numberOfBays: 4,
        city: 'Roma',
      });
    });

    it('should preserve logoUrl when not provided in update', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: { logoUrl: 'https://old.png', ragioneSociale: 'Test' },
      });
      prisma.tenant.update.mockResolvedValue({
        settings: { logoUrl: 'https://old.png', ragioneSociale: 'Test' },
      });

      await service.updateSettings(TENANT_ID, {
        ragioneSociale: 'Test',
        logoUrl: undefined,
      });

      const callData = prisma.tenant.update.mock.calls[0][0].data;
      expect(callData.settings.logoUrl).toBe('https://old.png');
    });
  });

  describe('completeOnboarding - edge cases', () => {
    it('should preserve all existing settings when completing with minimal input', async () => {
      const existingSettings = {
        logoUrl: 'https://logo.png',
        defaultVatRate: 22,
        currency: 'EUR',
        timezone: 'Europe/Rome',
      };
      prisma.tenant.findUnique.mockResolvedValue({
        settings: existingSettings,
      });
      prisma.tenant.update.mockResolvedValue({
        settings: {
          ...existingSettings,
          ragioneSociale: 'New Name',
          partitaIva: '12345678901',
          onboardingCompleted: true,
        },
      });

      const result = await service.completeOnboarding(TENANT_ID, {
        ragioneSociale: 'New Name',
        partitaIva: '12345678901',
      });

      expect(result.logoUrl).toBe('https://logo.png');
      expect(result.defaultVatRate).toBe(22);
      expect(result.onboardingCompleted).toBe(true);
    });

    it('should set onboardingCompleted=true even if already true', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        settings: { onboardingCompleted: true },
      });
      prisma.tenant.update.mockResolvedValue({
        settings: { onboardingCompleted: true },
      });

      const result = await service.completeOnboarding(TENANT_ID, {
        ragioneSociale: 'Test',
        partitaIva: '12345678901',
      });

      expect(result.onboardingCompleted).toBe(true);
    });
  });
});
