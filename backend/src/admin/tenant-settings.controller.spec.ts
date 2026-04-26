import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TenantSettingsController } from './tenant-settings.controller';
import { TenantSettingsService } from './tenant-settings.service';
import { S3Service } from '../common/services/s3.service';

describe('TenantSettingsController', () => {
  let controller: TenantSettingsController;
  let service: jest.Mocked<TenantSettingsService>;
  let s3: jest.Mocked<S3Service>;

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
            completeOnboarding: jest.fn(),
            getOnboardingStatus: jest.fn(),
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
    s3 = module.get(S3Service) as jest.Mocked<S3Service>;
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

    it('should propagate service errors', async () => {
      service.updateSettings.mockRejectedValue(new Error('boom'));
      await expect(controller.updateSettings(TENANT_ID, {})).rejects.toThrow('boom');
    });
  });

  describe('getOnboardingStatus', () => {
    it('should return onboarding status wrapped in success response', async () => {
      const status = { completed: false, steps: { ragioneSociale: true } };
      service.getOnboardingStatus.mockResolvedValue(status as never);

      const result = await controller.getOnboardingStatus(TENANT_ID);

      expect(service.getOnboardingStatus).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual({ success: true, data: status });
    });
  });

  describe('completeOnboarding', () => {
    it('should delegate to service and return settings', async () => {
      const dto = { ragioneSociale: 'Test', partitaIva: '12345678901', numberOfBays: 4 };
      const settings = { ...dto, onboardingCompleted: true };
      service.completeOnboarding.mockResolvedValue(settings);

      const result = await controller.completeOnboarding(TENANT_ID, dto);

      expect(service.completeOnboarding).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual({ success: true, data: settings });
    });

    it('should propagate service errors', async () => {
      service.completeOnboarding.mockRejectedValue(new Error('invalid'));
      await expect(
        controller.completeOnboarding(TENANT_ID, { ragioneSociale: 'x' } as never),
      ).rejects.toThrow('invalid');
    });
  });

  describe('uploadLogo', () => {
    const makeFile = (originalname: string, mimetype = 'image/png'): Express.Multer.File =>
      ({ buffer: Buffer.from('image'), originalname, mimetype }) as Express.Multer.File;

    it.each([
      ['logo.png', 'image/png'],
      ['logo.PNG', 'image/png'],
      ['logo.jpg', 'image/jpeg'],
      ['logo.jpeg', 'image/jpeg'],
      ['logo.JPEG', 'image/jpeg'],
      ['logo.webp', 'image/webp'],
      ['logo.svg', 'image/svg+xml'],
    ])('uploads file with allowed extension %s', async (name, mime) => {
      const settings = { logoUrl: 'https://s3/logo.png' };
      service.updateLogo.mockResolvedValue(settings);

      const result = await controller.uploadLogo(TENANT_ID, makeFile(name, mime));

      expect(s3.uploadBuffer).toHaveBeenCalled();
      const call = (s3.uploadBuffer as jest.Mock).mock.calls.pop();
      expect(call[1]).toMatch(
        new RegExp(
          '^logos/' + TENANT_ID + '/[a-f0-9]{32}\.' + name.split('.').pop()!.toLowerCase() + '$',
        ),
      );
      expect(call[2]).toBe(mime);
      expect(call[3]).toBe(TENANT_ID);
      expect(service.updateLogo).toHaveBeenCalledWith(TENANT_ID, 'https://s3/logo.png');
      expect(result).toEqual({ success: true, data: settings });
    });

    it.each([
      ['evil.gif'],
      ['evil.exe'],
      ['evil.bmp'],
      ['evil'],
      ['evil.tar.gz'],
      ['..%2Fpath.txt'],
    ])('rejects disallowed extension %s with BadRequestException', async name => {
      await expect(
        controller.uploadLogo(TENANT_ID, makeFile(name, 'image/png')),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(s3.uploadBuffer).not.toHaveBeenCalled();
      expect(service.updateLogo).not.toHaveBeenCalled();
    });

    it('rejects file with no extension', async () => {
      await expect(
        controller.uploadLogo(TENANT_ID, makeFile('README', 'image/png')),
      ).rejects.toThrow('File type not allowed');
    });

    it('generates a 32-char hex filename to prevent path traversal', async () => {
      service.updateLogo.mockResolvedValue({});
      await controller.uploadLogo(TENANT_ID, makeFile('logo.png'));
      const call = (s3.uploadBuffer as jest.Mock).mock.calls.pop();
      const filename = call[1].split('/').pop() as string;
      expect(filename).toMatch(/^[a-f0-9]{32}\.png$/);
    });
  });

  describe('FileInterceptor fileFilter', () => {
    function getFileFilter() {
      const Reflect_ = globalThis.Reflect;
      const interceptors = Reflect_.getMetadata(
        '__interceptors__',
        TenantSettingsController.prototype.uploadLogo,
      );
      const InterceptorClass = interceptors[0];
      const instance = new InterceptorClass({});
      return instance.multer.fileFilter as (
        req: unknown,
        file: Express.Multer.File,
        cb: (err: Error | null, ok: boolean) => void,
      ) => void;
    }

    it.each([
      ['image/jpeg', true],
      ['image/png', true],
      ['image/webp', true],
      ['image/svg+xml', true],
      ['application/pdf', false],
      ['image/gif', false],
      ['text/html', false],
      ['application/octet-stream', false],
    ])('mimetype %s -> accept=%s', (mime, expected) => {
      const filter = getFileFilter();
      const cb = jest.fn();
      filter({}, { mimetype: mime } as Express.Multer.File, cb);
      expect(cb).toHaveBeenCalledWith(null, expected);
    });
  });
});
