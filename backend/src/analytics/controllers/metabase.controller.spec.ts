import { Test, TestingModule } from '@nestjs/testing';
import { MetabaseController } from './metabase.controller';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('MetabaseController', () => {
  let controller: MetabaseController;

  const TENANT_ID = 'tenant-001';
  const USER_ID = 'user-001';

  const mockConfigValues: Record<string, string | boolean> = {
    METABASE_URL: 'http://metabase.test:3001',
    METABASE_SECRET_KEY: 'test-secret-key-for-jwt-signing',
    METABASE_EMBEDDING_ENABLED: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetabaseController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              // eslint-disable-next-line security/detect-object-injection
              return mockConfigValues[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<MetabaseController>(MetabaseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboardUrl', () => {
    it('should return a signed embed URL for a valid dashboard type', async () => {
      const result = await controller.getDashboardUrl(TENANT_ID, USER_ID, 'overview');

      expect(result.success).toBe(true);
      expect(result.data.url).toContain('http://metabase.test:3001/embed/dashboard/');
      expect(result.data.dashboardId).toBe(1);
      expect(result.data.expiresAt).toBeDefined();
    });

    it('should throw BAD_REQUEST for invalid dashboard type', async () => {
      await expect(controller.getDashboardUrl(TENANT_ID, USER_ID, 'invalid')).rejects.toThrow(
        HttpException,
      );

      try {
        await controller.getDashboardUrl(TENANT_ID, USER_ID, 'invalid');
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });

    it('should respect custom expiryMinutes', async () => {
      const result = await controller.getDashboardUrl(TENANT_ID, USER_ID, 'revenue', '30');

      expect(result.success).toBe(true);
      expect(result.data.dashboardId).toBe(2);
    });

    it('should cap expiryMinutes at 60', async () => {
      const result = await controller.getDashboardUrl(TENANT_ID, USER_ID, 'overview', '120');

      expect(result.success).toBe(true);
      // Expiry should be capped, URL should still be generated
      expect(result.data.url).toContain('/embed/dashboard/');
    });

    it('should map all dashboard types to correct IDs', async () => {
      const dashboardMap: Record<string, number> = {
        overview: 1,
        revenue: 2,
        customers: 3,
        mechanics: 4,
        vehicles: 5,
        executive: 6,
      };

      for (const [type, expectedId] of Object.entries(dashboardMap)) {
        const result = await controller.getDashboardUrl(TENANT_ID, USER_ID, type);
        expect(result.data.dashboardId).toBe(expectedId);
      }
    });
  });

  describe('getDashboardUrl - disabled embedding', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [MetabaseController],
        providers: [
          {
            provide: ConfigService,
            useValue: {
              // eslint-disable-next-line sonarjs/function-return-type
              get: jest.fn((key: string, defaultValue?: unknown) => {
                if (key === 'METABASE_EMBEDDING_ENABLED') return false;
                // eslint-disable-next-line security/detect-object-injection
                return mockConfigValues[key] ?? defaultValue;
              }),
            },
          },
        ],
      }).compile();

      controller = module.get<MetabaseController>(MetabaseController);
    });

    it('should throw SERVICE_UNAVAILABLE when embedding is disabled', async () => {
      await expect(controller.getDashboardUrl(TENANT_ID, USER_ID, 'overview')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getDashboardUrl - missing secret key', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [MetabaseController],
        providers: [
          {
            provide: ConfigService,
            useValue: {
              // eslint-disable-next-line sonarjs/function-return-type
              get: jest.fn((key: string, defaultValue?: unknown) => {
                if (key === 'METABASE_SECRET_KEY') return '';
                // eslint-disable-next-line security/detect-object-injection
                return mockConfigValues[key] ?? defaultValue;
              }),
            },
          },
        ],
      }).compile();

      controller = module.get<MetabaseController>(MetabaseController);
    });

    it('should throw SERVICE_UNAVAILABLE when secret key is missing', async () => {
      await expect(controller.getDashboardUrl(TENANT_ID, USER_ID, 'overview')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getQuestionUrl', () => {
    it('should return a signed embed URL for a valid question ID', async () => {
      const result = await controller.getQuestionUrl(TENANT_ID, '42');

      expect(result.success).toBe(true);
      expect(result.data.url).toContain('http://metabase.test:3001/embed/question/');
      expect(result.data.dashboardId).toBe(42);
      expect(result.data.expiresAt).toBeDefined();
    });

    it('should throw BAD_REQUEST for invalid questionId', async () => {
      await expect(controller.getQuestionUrl(TENANT_ID, 'abc')).rejects.toThrow(HttpException);
    });

    it('should throw BAD_REQUEST for negative questionId', async () => {
      await expect(controller.getQuestionUrl(TENANT_ID, '-1')).rejects.toThrow(HttpException);
    });
  });

  describe('getConfig', () => {
    it('should return Metabase configuration', async () => {
      const result = await controller.getConfig();

      expect(result).toEqual({
        success: true,
        data: {
          enabled: true,
          url: 'http://metabase.test:3001',
          dashboards: {
            overview: 1,
            revenue: 2,
            customers: 3,
            mechanics: 4,
            vehicles: 5,
            executive: 6,
          },
        },
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when configured', async () => {
      const result = await controller.healthCheck();

      expect(result).toEqual({
        success: true,
        data: {
          configured: true,
          embeddingEnabled: true,
          url: 'http://metabase.test:3001',
          status: 'healthy',
        },
      });
    });
  });

  describe('healthCheck - unconfigured', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [MetabaseController],
        providers: [
          {
            provide: ConfigService,
            useValue: {
              // eslint-disable-next-line sonarjs/function-return-type
              get: jest.fn((key: string, defaultValue?: unknown) => {
                if (key === 'METABASE_SECRET_KEY') return '';
                // eslint-disable-next-line security/detect-object-injection
                return mockConfigValues[key] ?? defaultValue;
              }),
            },
          },
        ],
      }).compile();

      controller = module.get<MetabaseController>(MetabaseController);
    });

    it('should return unconfigured status when secret key is missing', async () => {
      const result = await controller.healthCheck();

      expect(result.data.configured).toBe(false);
      expect(result.data.status).toBe('unconfigured');
    });
  });
});
