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
});
