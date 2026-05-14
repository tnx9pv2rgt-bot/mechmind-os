import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminSetupService } from './admin-setup.service';
import { UserRole } from '@prisma/client';

const mockSetupData = {
  tenantId: 'tenant-001',
  locationId: 'location-001',
  users: [{ id: 'u-001', email: 'admin@demo.mechmind.it', role: UserRole.ADMIN }],
};

const mockSetupService = { seedDemoData: jest.fn() };

describe('AdminController', () => {
  let controller: AdminController;
  let savedSecret: string | undefined;

  beforeEach(async () => {
    jest.clearAllMocks();
    savedSecret = process.env.SETUP_SECRET;
    process.env.SETUP_SECRET = 'correct-secret-key';

    mockSetupService.seedDemoData.mockResolvedValue(mockSetupData);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminSetupService, useValue: mockSetupService }],
    }).compile();

    controller = module.get(AdminController);
  });

  afterEach(() => {
    process.env.SETUP_SECRET = savedSecret;
  });

  describe('setup', () => {
    it('should return seeded data when key matches', async () => {
      const result = await controller.setup('correct-secret-key');

      expect(result.message).toBe('Demo data seeded successfully');
      expect(result.data.tenantId).toBe('tenant-001');
      expect(mockSetupService.seedDemoData).toHaveBeenCalledTimes(1);
    });

    it('should throw 401 when setup key is wrong', async () => {
      await expect(controller.setup('wrong-key')).rejects.toThrow(
        new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED),
      );
      expect(mockSetupService.seedDemoData).not.toHaveBeenCalled();
    });

    it('should throw 500 when SETUP_SECRET is not configured', async () => {
      delete process.env.SETUP_SECRET;

      await expect(controller.setup('any-key')).rejects.toThrow(
        new HttpException('Server misconfiguration', HttpStatus.INTERNAL_SERVER_ERROR),
      );
      expect(mockSetupService.seedDemoData).not.toHaveBeenCalled();
    });

    it('should throw 401 for empty string key', async () => {
      await expect(controller.setup('')).rejects.toThrow(HttpException);
      expect(mockSetupService.seedDemoData).not.toHaveBeenCalled();
    });

    it('should propagate seedDemoData errors', async () => {
      mockSetupService.seedDemoData.mockRejectedValueOnce(new Error('DB failure'));

      await expect(controller.setup('correct-secret-key')).rejects.toThrow('DB failure');
      expect(mockSetupService.seedDemoData).toHaveBeenCalledTimes(1);
    });

    it('should pass seedDemoData result in response data', async () => {
      const customData = { ...mockSetupData, tenantId: 'tenant-custom' };
      mockSetupService.seedDemoData.mockResolvedValueOnce(customData);

      const result = await controller.setup('correct-secret-key');

      expect(result.data).toEqual(customData);
      expect(mockSetupService.seedDemoData).toHaveBeenCalledWith();
    });
  });
});
