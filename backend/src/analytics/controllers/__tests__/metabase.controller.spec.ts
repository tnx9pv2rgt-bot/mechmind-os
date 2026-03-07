/**
 * MechMind OS - Metabase Controller Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MetabaseController } from '../metabase.controller';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import jwt from 'jsonwebtoken';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
}));

describe('MetabaseController', () => {
  let controller: MetabaseController;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockUser = {
    tenantId: 'tenant-123-uuid',
    id: 'user-456-uuid',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetabaseController],
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<MetabaseController>(MetabaseController);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

    // Default config values
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      const configs: Record<string, any> = {
        METABASE_URL: 'http://localhost:3001',
        METABASE_SECRET_KEY: 'this-is-a-32-character-secret-key',
        METABASE_EMBEDDING_ENABLED: true,
      };
      return configs[key] ?? defaultValue;
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should log warning when secret key is not configured', () => {
      const loggerSpy = jest.spyOn(controller['logger'], 'warn');
      mockConfigService.get.mockReturnValue(undefined);

      // Re-create controller to trigger constructor
      Test.createTestingModule({
        controllers: [MetabaseController],
        providers: [
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      expect(loggerSpy).toHaveBeenCalledWith('METABASE_SECRET_KEY not configured. Embedding will fail.');
    });
  });

  describe('getDashboardUrl', () => {
    it('should return signed dashboard URL', async () => {
      const result = await controller.getDashboardUrl(
        mockUser.tenantId,
        mockUser.id,
        'overview',
        '10',
      );

      expect(result.success).toBe(true);
      expect(result.data.url).toContain('http://localhost:3001/embed/dashboard/');
      expect(result.data.url).toContain('mock-jwt-token');
      expect(result.data.dashboardId).toBe(1);
      expect(result.data.expiresAt).toBeDefined();
    });

    it('should include tenant_id and user_id in JWT payload', async () => {
      await controller.getDashboardUrl(mockUser.tenantId, mockUser.id, 'overview');

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: { dashboard: 1 },
          params: {
            tenant_id: mockUser.tenantId,
            user_id: mockUser.id,
          },
        }),
        expect.any(String),
        { algorithm: 'HS256' },
      );
    });

    it('should set expiry to 10 minutes by default', async () => {
      const beforeCall = Math.round(Date.now() / 1000);
      await controller.getDashboardUrl(mockUser.tenantId, mockUser.id, 'overview');
      const afterCall = Math.round(Date.now() / 1000) + 600;

      const callArg = (jwt.sign as jest.Mock).mock.calls[0][0];
      expect(callArg.exp).toBeGreaterThanOrEqual(beforeCall + 600);
      expect(callArg.exp).toBeLessThanOrEqual(afterCall + 1);
    });

    it('should respect custom expiry minutes', async () => {
      await controller.getDashboardUrl(mockUser.tenantId, mockUser.id, 'overview', '30');

      const callArg = (jwt.sign as jest.Mock).mock.calls[0][0];
      const expectedExp = Math.round(Date.now() / 1000) + 30 * 60;
      expect(callArg.exp).toBeGreaterThanOrEqual(expectedExp - 1);
      expect(callArg.exp).toBeLessThanOrEqual(expectedExp + 1);
    });

    it('should cap expiry at 60 minutes maximum', async () => {
      await controller.getDashboardUrl(mockUser.tenantId, mockUser.id, 'overview', '120');

      const callArg = (jwt.sign as jest.Mock).mock.calls[0][0];
      const expectedExp = Math.round(Date.now() / 1000) + 60 * 60;
      expect(callArg.exp).toBeLessThanOrEqual(expectedExp + 1);
    });

    it('should support all dashboard types', async () => {
      const dashboards = ['overview', 'revenue', 'customers', 'mechanics', 'vehicles', 'executive'];
      const expectedIds = [1, 2, 3, 4, 5, 6];

      for (let i = 0; i < dashboards.length; i++) {
        jest.clearAllMocks();
        const result = await controller.getDashboardUrl(
          mockUser.tenantId,
          mockUser.id,
          dashboards[i],
        );

        expect(result.data.dashboardId).toBe(expectedIds[i]);
      }
    });

    it('should throw error when embedding is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'METABASE_EMBEDDING_ENABLED') return false;
        if (key === 'METABASE_SECRET_KEY') return 'valid-secret-key-32-chars-long!!';
        return 'http://localhost:3001';
      });

      await expect(
        controller.getDashboardUrl(mockUser.tenantId, mockUser.id, 'overview'),
      ).rejects.toThrow(
        new HttpException('Metabase embedding is disabled', HttpStatus.SERVICE_UNAVAILABLE),
      );
    });

    it('should throw error when secret key is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'METABASE_SECRET_KEY') return '';
        if (key === 'METABASE_EMBEDDING_ENABLED') return true;
        return 'http://localhost:3001';
      });

      await expect(
        controller.getDashboardUrl(mockUser.tenantId, mockUser.id, 'overview'),
      ).rejects.toThrow(
        new HttpException(
          'Metabase embedding not properly configured',
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
    });

    it('should throw error for invalid dashboard type', async () => {
      await expect(
        controller.getDashboardUrl(mockUser.tenantId, mockUser.id, 'invalid-dashboard'),
      ).rejects.toThrow(new HttpException(expect.stringContaining('Invalid dashboard type'), HttpStatus.BAD_REQUEST));
    });

    it('should throw error for invalid expiry minutes', async () => {
      await expect(
        controller.getDashboardUrl(mockUser.tenantId, mockUser.id, 'overview', 'invalid'),
      ).rejects.toThrow(
        new HttpException('Invalid expiryMinutes parameter', HttpStatus.BAD_REQUEST),
      );
    });

    it('should throw error for negative expiry minutes', async () => {
      await expect(
        controller.getDashboardUrl(mockUser.tenantId, mockUser.id, 'overview', '-5'),
      ).rejects.toThrow(
        new HttpException('Invalid expiryMinutes parameter', HttpStatus.BAD_REQUEST),
      );
    });

    it('should throw error when JWT signing fails', async () => {
      (jwt.sign as jest.Mock).mockImplementation(() => {
        throw new Error('JWT signing error');
      });

      await expect(
        controller.getDashboardUrl(mockUser.tenantId, mockUser.id, 'overview'),
      ).rejects.toThrow(
        new HttpException('Failed to generate dashboard URL', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });

    it('should include bordered and titled parameters in URL', async () => {
      const result = await controller.getDashboardUrl(
        mockUser.tenantId,
        mockUser.id,
        'overview',
      );

      expect(result.data.url).toContain('#bordered=true');
      expect(result.data.url).toContain('titled=true');
    });
  });

  describe('getQuestionUrl', () => {
    it('should return signed question URL', async () => {
      const result = await controller.getQuestionUrl(mockUser.tenantId, '42', '10');

      expect(result.success).toBe(true);
      expect(result.data.url).toContain('http://localhost:3001/embed/question/');
      expect(result.data.dashboardId).toBe(42);
    });

    it('should throw error for invalid question ID', async () => {
      await expect(
        controller.getQuestionUrl(mockUser.tenantId, 'invalid'),
      ).rejects.toThrow(new HttpException('Invalid questionId', HttpStatus.BAD_REQUEST));
    });

    it('should throw error for zero question ID', async () => {
      await expect(
        controller.getQuestionUrl(mockUser.tenantId, '0'),
      ).rejects.toThrow(new HttpException('Invalid questionId', HttpStatus.BAD_REQUEST));
    });

    it('should throw error for negative question ID', async () => {
      await expect(
        controller.getQuestionUrl(mockUser.tenantId, '-1'),
      ).rejects.toThrow(new HttpException('Invalid questionId', HttpStatus.BAD_REQUEST));
    });

    it('should throw error when embedding is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'METABASE_SECRET_KEY') return '';
        return null;
      });

      await expect(
        controller.getQuestionUrl(mockUser.tenantId, '1'),
      ).rejects.toThrow(
        new HttpException('Metabase embedding not configured', HttpStatus.SERVICE_UNAVAILABLE),
      );
    });
  });

  describe('getConfig', () => {
    it('should return Metabase configuration', async () => {
      const result = await controller.getConfig();

      expect(result.success).toBe(true);
      expect(result.data.enabled).toBe(true);
      expect(result.data.url).toBe('http://localhost:3001');
      expect(result.data.dashboards).toEqual({
        overview: 1,
        revenue: 2,
        customers: 3,
        mechanics: 4,
        vehicles: 5,
        executive: 6,
      });
    });

    it('should return disabled when secret key is not set', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'METABASE_SECRET_KEY') return '';
        if (key === 'METABASE_EMBEDDING_ENABLED') return true;
        return 'http://localhost:3001';
      });

      const result = await controller.getConfig();

      expect(result.data.enabled).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when configured', async () => {
      const result = await controller.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data.configured).toBe(true);
      expect(result.data.embeddingEnabled).toBe(true);
      expect(result.data.url).toBe('http://localhost:3001');
      expect(result.data.status).toBe('healthy');
    });

    it('should return unconfigured status when secret is missing', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'METABASE_SECRET_KEY') return '';
        return 'http://localhost:3001';
      });

      const result = await controller.healthCheck();

      expect(result.data.configured).toBe(false);
      expect(result.data.status).toBe('unconfigured');
    });

    it('should return unconfigured status when URL is missing', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'METABASE_URL') return '';
        return 'valid-secret-key-32-chars-long!!';
      });

      const result = await controller.healthCheck();

      expect(result.data.configured).toBe(false);
    });
  });
});
