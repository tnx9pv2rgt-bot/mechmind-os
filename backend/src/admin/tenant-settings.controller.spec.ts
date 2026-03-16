import { Test, TestingModule } from '@nestjs/testing';
import { TenantSettingsController } from './tenant-settings.controller';
import { TenantSettingsService } from './tenant-settings.service';
import { S3Service } from '../common/services/s3.service';

describe('TenantSettingsController', () => {
  let controller: TenantSettingsController;
  let service: jest.Mocked<TenantSettingsService>;

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantSettingsController],
      providers: [
        {
          provide: TenantSettingsService,
          useValue: {
            getSettings: jest.fn(),
            updateSettings: jest.fn(),
            updateLogo: jest.fn(),
          },
        },
        {
          provide: S3Service,
          useValue: {
            uploadBuffer: jest.fn().mockResolvedValue({ Location: 'https://s3/logo.png' }),
          },
        },
      ],
    }).compile();

    controller = module.get<TenantSettingsController>(TenantSettingsController);
    service = module.get(TenantSettingsService) as jest.Mocked<TenantSettingsService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSettings', () => {
    it('should return settings wrapped in success response', async () => {
      const settings = { ragioneSociale: 'Test', numberOfBays: 4 };
      service.getSettings.mockResolvedValue(settings);

      const result = await controller.getSettings(TENANT_ID);

      expect(service.getSettings).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual({ success: true, data: settings });
    });
  });

  describe('updateSettings', () => {
    it('should delegate to service and return updated settings', async () => {
      const dto = { ragioneSociale: 'New Name', city: 'Roma' };
      const updated = { ragioneSociale: 'New Name', city: 'Roma', numberOfBays: 4 };
      service.updateSettings.mockResolvedValue(updated);

      const result = await controller.updateSettings(TENANT_ID, dto);

      expect(service.updateSettings).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual({ success: true, data: updated });
    });
  });

  describe('uploadLogo', () => {
    it('should upload file and update logo URL', async () => {
      const settings = { logoUrl: 'https://s3/logo.png' };
      service.updateLogo.mockResolvedValue(settings);

      const file = {
        buffer: Buffer.from('image'),
        originalname: 'logo.png',
        mimetype: 'image/png',
      } as Express.Multer.File;

      const result = await controller.uploadLogo(TENANT_ID, file);

      expect(service.updateLogo).toHaveBeenCalledWith(TENANT_ID, 'https://s3/logo.png');
      expect(result).toEqual({ success: true, data: settings });
    });
  });
});
