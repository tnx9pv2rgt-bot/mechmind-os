import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TenantSettingsController } from './tenant-settings.controller';
import { TenantSettingsService } from './tenant-settings.service';
import { S3Service } from '../common/services/s3.service';

const mockSettings = {
  ragioneSociale: 'Officina Roma',
  partitaIva: '12345678901',
  currency: 'EUR',
  defaultVatRate: 22,
  onboardingCompleted: true,
};

const mockOnboardingStatus = {
  completed: true,
  steps: {
    ragioneSociale: true,
    partitaIva: true,
    businessHours: true,
    numberOfBays: true,
    slotDurationMinutes: true,
    defaultVatRate: true,
    invoiceNumberFormat: true,
    currency: true,
  },
};

const mockSettingsService = {
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
  getOnboardingStatus: jest.fn(),
  completeOnboarding: jest.fn(),
  updateLogo: jest.fn(),
};

const mockS3Service = {
  uploadBuffer: jest.fn(),
};

describe('TenantSettingsController', () => {
  let controller: TenantSettingsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockSettingsService.getSettings.mockResolvedValue(mockSettings);
    mockSettingsService.updateSettings.mockResolvedValue(mockSettings);
    mockSettingsService.getOnboardingStatus.mockResolvedValue(mockOnboardingStatus);
    mockSettingsService.completeOnboarding.mockResolvedValue({
      ...mockSettings,
      onboardingCompleted: true,
    });
    mockSettingsService.updateLogo.mockResolvedValue({
      ...mockSettings,
      logoUrl: 'https://s3.example.com/x.png',
    });
    mockS3Service.uploadBuffer.mockResolvedValue({
      Location: 'https://s3.example.com/logos/tenant-001/abc.png',
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantSettingsController],
      providers: [
        { provide: TenantSettingsService, useValue: mockSettingsService },
        { provide: S3Service, useValue: mockS3Service },
      ],
    }).compile();

    controller = module.get(TenantSettingsController);
  });

  describe('getSettings', () => {
    it('should return settings wrapped in success response', async () => {
      const result = await controller.getSettings('tenant-001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSettings);
      expect(mockSettingsService.getSettings).toHaveBeenCalledWith('tenant-001');
    });

    it('should propagate service errors', async () => {
      mockSettingsService.getSettings.mockRejectedValueOnce(new Error('Tenant not found'));

      await expect(controller.getSettings('ghost')).rejects.toThrow('Tenant not found');
      expect(mockSettingsService.getSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSettings', () => {
    it('should delegate to service and return updated settings', async () => {
      const dto = { currency: 'USD' };
      const updated = { ...mockSettings, currency: 'USD' };
      mockSettingsService.updateSettings.mockResolvedValueOnce(updated);

      const result = await controller.updateSettings('tenant-001', dto as never);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updated);
      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith('tenant-001', dto);
    });

    it('should propagate service errors on update', async () => {
      mockSettingsService.updateSettings.mockRejectedValueOnce(new Error('DB error'));

      await expect(controller.updateSettings('tenant-001', {} as never)).rejects.toThrow(
        'DB error',
      );
      expect(mockSettingsService.updateSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOnboardingStatus', () => {
    it('should return onboarding status wrapped in success response', async () => {
      const result = await controller.getOnboardingStatus('tenant-001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOnboardingStatus);
      expect(mockSettingsService.getOnboardingStatus).toHaveBeenCalledWith('tenant-001');
    });

    it('should propagate service errors on getOnboardingStatus', async () => {
      mockSettingsService.getOnboardingStatus.mockRejectedValueOnce(new Error('Not found'));

      await expect(controller.getOnboardingStatus('ghost')).rejects.toThrow('Not found');
      expect(mockSettingsService.getOnboardingStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('completeOnboarding', () => {
    it('should complete onboarding and return settings with onboardingCompleted=true', async () => {
      const dto = { ragioneSociale: 'Officina Test', partitaIva: '12345678901' };

      const result = await controller.completeOnboarding('tenant-001', dto as never);

      expect(result.success).toBe(true);
      expect((result.data as typeof mockSettings).onboardingCompleted).toBe(true);
      expect(mockSettingsService.completeOnboarding).toHaveBeenCalledWith('tenant-001', dto);
    });

    it('should propagate service errors on completeOnboarding', async () => {
      mockSettingsService.completeOnboarding.mockRejectedValueOnce(new Error('Not found'));

      await expect(controller.completeOnboarding('ghost', {} as never)).rejects.toThrow(
        'Not found',
      );
      expect(mockSettingsService.completeOnboarding).toHaveBeenCalledTimes(1);
    });
  });

  describe('uploadLogo', () => {
    const validFile = {
      originalname: 'logo.png',
      buffer: Buffer.from('fake-image'),
      mimetype: 'image/png',
      size: 1024,
    } as Express.Multer.File;

    it('should upload logo and return updated settings', async () => {
      const result = await controller.uploadLogo('tenant-001', validFile);

      expect(result.success).toBe(true);
      expect(mockS3Service.uploadBuffer).toHaveBeenCalledWith(
        validFile.buffer,
        expect.stringContaining('logos/tenant-001/'),
        validFile.mimetype,
        'tenant-001',
      );
      expect(mockSettingsService.updateLogo).toHaveBeenCalledTimes(1);
    });

    it('should use the S3 Location URL when calling updateLogo', async () => {
      await controller.uploadLogo('tenant-001', validFile);

      expect(mockSettingsService.updateLogo).toHaveBeenCalledWith(
        'tenant-001',
        'https://s3.example.com/logos/tenant-001/abc.png',
      );
      expect(mockS3Service.uploadBuffer).toHaveBeenCalledTimes(1);
    });

    it('should generate a randomized safe filename (no original name in key)', async () => {
      await controller.uploadLogo('tenant-001', {
        ...validFile,
        originalname: '../../etc/passwd.png',
      } as Express.Multer.File);

      const key = mockS3Service.uploadBuffer.mock.calls[0][1] as string;
      expect(key).not.toContain('passwd');
      expect(key).toMatch(/^logos\/tenant-001\/[0-9a-f]{32}\.png$/);
    });

    it('should throw BadRequestException for disallowed extension', async () => {
      const badFile = { ...validFile, originalname: 'malware.exe' } as Express.Multer.File;

      await expect(controller.uploadLogo('tenant-001', badFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockS3Service.uploadBuffer).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for .php extension', async () => {
      const phpFile = { ...validFile, originalname: 'shell.php' } as Express.Multer.File;

      await expect(controller.uploadLogo('tenant-001', phpFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSettingsService.updateLogo).not.toHaveBeenCalled();
    });
  });
});
