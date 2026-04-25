import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminSetupService } from './admin-setup.service';

describe('AdminController', () => {
  let controller: AdminController;
  let setupService: jest.Mocked<AdminSetupService>;

  const SETUP_KEY = 'test-setup-key';

  beforeEach(async () => {
    process.env.SETUP_SECRET = SETUP_KEY;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminSetupService,
          useValue: {
            seedDemoData: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    setupService = module.get(AdminSetupService) as jest.Mocked<AdminSetupService>;
  });

  afterEach(() => {
    delete process.env.SETUP_SECRET;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('setup', () => {
    it('should seed demo data when setup key is valid', async () => {
      const seedResult = { tenantId: 'tenant-001', usersCreated: 3 };
      setupService.seedDemoData.mockResolvedValue(seedResult as never);

      const result = await controller.setup(SETUP_KEY);

      expect(setupService.seedDemoData).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Demo data seeded successfully',
        data: seedResult,
      });
    });

    it('should throw Unauthorized when setup key is invalid', async () => {
      await expect(controller.setup('wrong-key')).rejects.toThrow(
        new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED),
      );
      expect(setupService.seedDemoData).not.toHaveBeenCalled();
    });

    it('should throw Internal Server Error when SETUP_SECRET not configured', async () => {
      delete process.env.SETUP_SECRET;

      await expect(controller.setup(SETUP_KEY)).rejects.toThrow(
        new HttpException('Server misconfiguration', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });

    it('should reject empty setup key', async () => {
      await expect(controller.setup('')).rejects.toThrow(HttpException);
      expect(setupService.seedDemoData).not.toHaveBeenCalled();
    });

    it('should handle setupService errors', async () => {
      setupService.seedDemoData.mockRejectedValue(new Error('Database error'));

      await expect(controller.setup(SETUP_KEY)).rejects.toThrow('Database error');
    });

    it('should pass correct message in success response', async () => {
      const seedResult = { message: 'Success' };
      setupService.seedDemoData.mockResolvedValue(seedResult as never);

      const result = await controller.setup(SETUP_KEY);

      expect(result.message).toBe('Demo data seeded successfully');
    });

    it('should return exact seed result in data property', async () => {
      const seedResult = {
        tenantId: 'tenant-002',
        usersCreated: 5,
        customersCreated: 10,
      };
      setupService.seedDemoData.mockResolvedValue(seedResult as never);

      const result = await controller.setup(SETUP_KEY);

      expect(result.data).toEqual(seedResult);
    });

    it('should preserve case sensitivity for setup key', async () => {
      process.env.SETUP_SECRET = 'MySetupKey123';

      await expect(controller.setup('mysetupkey123')).rejects.toThrow(
        new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED),
      );
    });

    it('should handle very long setup keys', async () => {
      const longKey = 'a'.repeat(1000);
      process.env.SETUP_SECRET = longKey;

      const result = await controller.setup(longKey);

      expect(result).toBeDefined();
    });

    it('should handle special characters in setup key', async () => {
      const specialKey = 'test-key!@#$%^&*()';
      process.env.SETUP_SECRET = specialKey;

      const result = await controller.setup(specialKey);

      expect(result).toBeDefined();
    });
  });
});
