import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextMiddleware, RequestWithTenant } from '../middleware/tenant-context.middleware';
import { PrismaService } from '../../common/services/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

describe('TenantContextMiddleware (RLS Context)', () => {
  let middleware: TenantContextMiddleware;

  // Mock response object with event emitter
  const createMockResponse = () => {
    const eventHandlers: Record<string, Function[]> = {};
    return {
      on: jest.fn((event: string, handler: Function) => {
        if (!eventHandlers[event]) {
          eventHandlers[event] = [];
        }
        eventHandlers[event].push(handler);
        return { eventHandlers };
      }),
      triggerEvent: (event: string) => {
        if (eventHandlers[event]) {
          eventHandlers[event].forEach(handler => handler());
        }
      },
    };
  };

  const createMockRequest = (tenantId?: string, userId?: string): RequestWithTenant => ({
    tenantId,
    userId,
    headers: {},
  } as RequestWithTenant);

  const createMockNext = () => jest.fn();

  // Mock Prisma service
  const mockPrismaService = {
    setTenantContext: jest.fn(),
    clearTenantContext: jest.fn(),
  };

  const mockLoggerService = {
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantContextMiddleware,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    middleware = module.get<TenantContextMiddleware>(TenantContextMiddleware);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use - with tenantId', () => {
    it('should set tenant context when tenantId is present', async () => {
      const req = createMockRequest('tenant-123', 'user-456');
      const res = createMockResponse();
      const next = createMockNext();

      mockPrismaService.setTenantContext.mockResolvedValue(undefined);

      await middleware.use(req, res as any, next);

      expect(mockPrismaService.setTenantContext).toHaveBeenCalledWith('tenant-123');
      expect(mockLoggerService.debug).toHaveBeenCalledWith(
        'Tenant context set: tenant-123',
        'TenantContextMiddleware',
      );
      expect(next).toHaveBeenCalled();
    });

    it('should register finish event handler for cleanup', async () => {
      const req = createMockRequest('tenant-123');
      const res = createMockResponse();
      const next = createMockNext();

      mockPrismaService.setTenantContext.mockResolvedValue(undefined);

      await middleware.use(req, res as any, next);

      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should clear tenant context on response finish', async () => {
      const req = createMockRequest('tenant-123');
      const res = createMockResponse();
      const next = createMockNext();

      mockPrismaService.setTenantContext.mockResolvedValue(undefined);
      mockPrismaService.clearTenantContext.mockResolvedValue(undefined);

      await middleware.use(req, res as any, next);

      // Trigger the finish event
      res.triggerEvent('finish');

      // Wait for async cleanup
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockPrismaService.clearTenantContext).toHaveBeenCalled();
      expect(mockLoggerService.debug).toHaveBeenCalledWith(
        'Tenant context cleared: tenant-123',
        'TenantContextMiddleware',
      );
    });

    it('should handle errors during context cleanup gracefully', async () => {
      const req = createMockRequest('tenant-123');
      const res = createMockResponse();
      const next = createMockNext();

      mockPrismaService.setTenantContext.mockResolvedValue(undefined);
      mockPrismaService.clearTenantContext.mockRejectedValue(new Error('Cleanup failed'));

      await middleware.use(req, res as any, next);

      // Trigger the finish event - should not throw
      res.triggerEvent('finish');

      // Wait for async cleanup
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Failed to clear tenant context',
        expect.any(String),
      );
    });

    it('should handle errors during context setting gracefully', async () => {
      const req = createMockRequest('tenant-123');
      const res = createMockResponse();
      const next = createMockNext();

      mockPrismaService.setTenantContext.mockRejectedValue(new Error('Database connection failed'));

      await middleware.use(req, res as any, next);

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Failed to set tenant context: Database connection failed',
      );
      expect(next).toHaveBeenCalled(); // Still calls next even on error
    });

    it('should handle different tenant IDs', async () => {
      const tenantIds = ['tenant-abc', 'garage-123', 'shop-xyz', 'uuid-123e4567-e89b-12d3'];

      for (const tenantId of tenantIds) {
        jest.clearAllMocks();
        const req = createMockRequest(tenantId);
        const res = createMockResponse();
        const next = createMockNext();

        mockPrismaService.setTenantContext.mockResolvedValue(undefined);

        await middleware.use(req, res as any, next);

        expect(mockPrismaService.setTenantContext).toHaveBeenCalledWith(tenantId);
      }
    });

    it('should handle userId along with tenantId', async () => {
      const req = createMockRequest('tenant-123', 'user-789');
      const res = createMockResponse();
      const next = createMockNext();

      mockPrismaService.setTenantContext.mockResolvedValue(undefined);

      await middleware.use(req, res as any, next);

      expect(req.tenantId).toBe('tenant-123');
      expect(req.userId).toBe('user-789');
      expect(next).toHaveBeenCalled();
    });

    it('should not call next multiple times on error', async () => {
      const req = createMockRequest('tenant-123');
      const res = createMockResponse();
      const next = createMockNext();

      mockPrismaService.setTenantContext.mockRejectedValue(new Error('Connection error'));

      await middleware.use(req, res as any, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('use - without tenantId', () => {
    it('should skip RLS when tenantId is undefined', async () => {
      const req = createMockRequest(undefined, 'user-456');
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res as any, next);

      expect(mockPrismaService.setTenantContext).not.toHaveBeenCalled();
      expect(mockLoggerService.debug).toHaveBeenCalledWith('No tenant ID in request - RLS not applied');
      expect(next).toHaveBeenCalled();
    });

    it('should skip RLS when tenantId is null', async () => {
      const req = createMockRequest(null as any, 'user-456');
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res as any, next);

      expect(mockPrismaService.setTenantContext).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should skip RLS when tenantId is empty string', async () => {
      const req = createMockRequest('', 'user-456');
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res as any, next);

      expect(mockPrismaService.setTenantContext).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should not register finish handler when no tenantId', async () => {
      const req = createMockRequest(undefined);
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res as any, next);

      expect(res.on).not.toHaveBeenCalled();
    });
  });

  describe('RLS tenant isolation', () => {
    it('should set different tenant contexts for different requests', async () => {
      const tenants = [
        { tenantId: 'garage-roma', userId: 'user-1' },
        { tenantId: 'garage-milano', userId: 'user-2' },
        { tenantId: 'shop-napoli', userId: 'user-3' },
      ];

      for (const { tenantId, userId } of tenants) {
        jest.clearAllMocks();
        const req = createMockRequest(tenantId, userId);
        const res = createMockResponse();
        const next = createMockNext();

        mockPrismaService.setTenantContext.mockResolvedValue(undefined);

        await middleware.use(req, res as any, next);

        expect(mockPrismaService.setTenantContext).toHaveBeenCalledWith(tenantId);
      }
    });

    it('should ensure each request gets its own cleanup handler', async () => {
      const req1 = createMockRequest('tenant-1');
      const res1 = createMockResponse();
      const next1 = createMockNext();

      const req2 = createMockRequest('tenant-2');
      const res2 = createMockResponse();
      const next2 = createMockNext();

      mockPrismaService.setTenantContext.mockResolvedValue(undefined);

      await middleware.use(req1, res1 as any, next1);
      await middleware.use(req2, res2 as any, next2);

      expect(res1.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(res2.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  describe('error scenarios', () => {
    it('should handle complete response object failure', async () => {
      const req = createMockRequest('tenant-123');
      const resError = new Error('Response object error');
      const res = {
        on: jest.fn().mockImplementation(() => {
          throw resError;
        }),
      } as any;
      const next = createMockNext();

      mockPrismaService.setTenantContext.mockResolvedValue(undefined);

      // The middleware catches the error from res.on() and still calls next()
      await middleware.use(req, res, next);
      
      // Verify next was called even when res.on throws
      expect(next).toHaveBeenCalled();
    });

    it('should handle when finish event fires multiple times', async () => {
      const req = createMockRequest('tenant-123');
      const res = createMockResponse();
      const next = createMockNext();

      mockPrismaService.setTenantContext.mockResolvedValue(undefined);
      mockPrismaService.clearTenantContext.mockResolvedValue(undefined);

      await middleware.use(req, res as any, next);

      // Trigger finish event twice
      res.triggerEvent('finish');
      res.triggerEvent('finish');

      await new Promise(resolve => setTimeout(resolve, 10));

      // Should attempt cleanup both times
      expect(mockPrismaService.clearTenantContext).toHaveBeenCalledTimes(2);
    });

    it('should handle edge case where tenantId becomes falsy after setting', async () => {
      const req = createMockRequest('tenant-123');
      const res = createMockResponse();
      const next = createMockNext();

      mockPrismaService.setTenantContext.mockResolvedValue(undefined);

      await middleware.use(req, res as any, next);

      // Simulate tenantId being cleared (edge case)
      req.tenantId = undefined;

      res.triggerEvent('finish');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Cleanup should still use the original tenantId from closure
      expect(mockPrismaService.clearTenantContext).toHaveBeenCalled();
    });
  });

  describe('middleware metadata', () => {
    it('should be injectable', () => {
      expect(middleware).toBeInstanceOf(TenantContextMiddleware);
    });

    it('should implement NestMiddleware', () => {
      expect(middleware.use).toBeDefined();
      expect(typeof middleware.use).toBe('function');
    });
  });
});
