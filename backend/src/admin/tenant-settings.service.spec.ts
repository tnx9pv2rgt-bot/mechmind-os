import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TenantSettingsService } from './tenant-settings.service';
import { PrismaService } from '../common/services/prisma.service';

const mockPrisma = {
  tenant: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockSettings = {
  ragioneSociale: 'Officina Roma',
  partitaIva: '12345678901',
  currency: 'EUR',
  defaultVatRate: 22,
  invoiceNumberFormat: 'INV-{YEAR}-{SEQ}',
  numberOfBays: 4,
  slotDurationMinutes: 60,
  businessHours: { monday: { open: '08:00', close: '18:00' } },
  onboardingCompleted: true,
};

describe('TenantSettingsService', () => {
  let service: TenantSettingsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.tenant.findUnique.mockResolvedValue({ settings: mockSettings });
    mockPrisma.tenant.update.mockResolvedValue({ settings: mockSettings });

    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantSettingsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(TenantSettingsService);
  });

  describe('getSettings', () => {
    it('should return settings for existing tenant', async () => {
      const result = await service.getSettings('tenant-001');

      expect(result).toEqual(mockSettings);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tenant-001' } }),
      );
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);

      await expect(service.getSettings('ghost-tenant')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ghost-tenant' } }),
      );
    });

    it('should return empty object when settings field is null', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ settings: null });

      const result = await service.getSettings('tenant-001');

      expect(result).toEqual({});
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSettings', () => {
    it('should merge and persist updated settings', async () => {
      const dto = { currency: 'USD', defaultVatRate: 10 };
      const merged = { ...mockSettings, ...dto };
      mockPrisma.tenant.update.mockResolvedValueOnce({ settings: merged });

      const result = await service.updateSettings('tenant-001', dto as never);

      expect(result).toEqual(merged);
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tenant-001' } }),
      );
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);

      await expect(service.updateSettings('ghost', {} as never)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.tenant.update).not.toHaveBeenCalled();
    });

    it('should not overwrite fields not present in dto (partial update)', async () => {
      const dto = { currency: 'USD' };

      await service.updateSettings('tenant-001', dto as never);

      const updateCall = mockPrisma.tenant.update.mock.calls[0][0];
      expect(updateCall.data.settings).toMatchObject({ ragioneSociale: 'Officina Roma' });
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('completeOnboarding', () => {
    it('should set onboardingCompleted to true and return updated settings', async () => {
      const dto = { ragioneSociale: 'Officina Nuova', partitaIva: '99999999999' };
      const merged = { ...mockSettings, ...dto, onboardingCompleted: true };
      mockPrisma.tenant.update.mockResolvedValueOnce({ settings: merged });

      const result = await service.completeOnboarding('tenant-001', dto as never);

      expect(result.onboardingCompleted).toBe(true);
      const updateCall = mockPrisma.tenant.update.mock.calls[0][0];
      expect(updateCall.data.settings).toMatchObject({ onboardingCompleted: true });
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);

      await expect(service.completeOnboarding('ghost', {} as never)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.tenant.update).not.toHaveBeenCalled();
    });
  });

  describe('getOnboardingStatus', () => {
    it('should return completed=true when onboardingCompleted is set', async () => {
      const result = await service.getOnboardingStatus('tenant-001');

      expect(result.completed).toBe(true);
      expect(result.steps).toBeDefined();
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should map filled settings fields to true step booleans', async () => {
      const result = await service.getOnboardingStatus('tenant-001');

      expect(result.steps.ragioneSociale).toBe(true);
      expect(result.steps.partitaIva).toBe(true);
      expect(result.steps.currency).toBe(true);
      expect(result.steps.defaultVatRate).toBe(true);
    });

    it('should map missing settings fields to false step booleans', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        settings: { ragioneSociale: 'Test' },
      });

      const result = await service.getOnboardingStatus('tenant-001');

      expect(result.steps.partitaIva).toBe(false);
      expect(result.steps.currency).toBe(false);
      expect(result.completed).toBe(false);
    });

    it('should return businessHours=false when businessHours is empty object', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        settings: { businessHours: {} },
      });

      const result = await service.getOnboardingStatus('tenant-001');

      expect(result.steps.businessHours).toBe(false);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateLogo', () => {
    it('should persist logoUrl and return updated settings', async () => {
      const logoUrl = 'https://s3.example.com/logos/tenant-001/abc.png';
      const updated = { ...mockSettings, logoUrl };
      mockPrisma.tenant.update.mockResolvedValueOnce({ settings: updated });

      const result = await service.updateLogo('tenant-001', logoUrl);

      expect(result.logoUrl).toBe(logoUrl);
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tenant-001' } }),
      );
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);

      await expect(service.updateLogo('ghost', 'https://s3.example.com/x.png')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.tenant.update).not.toHaveBeenCalled();
    });
  });
});
