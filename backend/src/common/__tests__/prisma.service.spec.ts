import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService, TenantContext } from '../services/prisma.service';
import { LoggerService } from '../services/logger.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let configService: ConfigService;
  let loggerService: LoggerService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        DATABASE_URL: 'postgresql://test:test@localhost:5432/mechmind_test',
        NODE_ENV: 'test',
        LOG_LEVEL: 'error',
      };
      return config[key];
    }),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    setContext: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
    loggerService = module.get<LoggerService>(LoggerService);

    // Mock PrismaClient methods
    jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
    jest.spyOn(service, '$executeRaw').mockResolvedValue(undefined as any);
    jest.spyOn(service, '$executeRawUnsafe').mockResolvedValue(undefined as any);
    jest.spyOn(service, '$queryRaw').mockResolvedValue([{ acquired: true }] as any);
    jest.spyOn(service, '$transaction').mockImplementation(async (callback: any) => {
      if (typeof callback === 'function') {
        return callback(service);
      }
      return callback;
    });
    jest.spyOn(service, '$on').mockImplementation(() => {});
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should connect to database and setup RLS', async () => {
      await service.onModuleInit();

      expect(service.$connect).toHaveBeenCalled();
      expect(mockLoggerService.log).toHaveBeenCalledWith('Prisma connected to database');
    });

    it('should setup query logging in development', async () => {
      let queryCallback: Function | undefined;
      jest.spyOn(service, '$on').mockImplementation((event: any, callback: any) => {
        if (event === 'query') {
          queryCallback = callback;
        }
      });
      
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'DATABASE_URL') return 'postgresql://test:test@localhost:5432/mechmind_test';
        return undefined;
      });

      await service.onModuleInit();

      expect(service.$on).toHaveBeenCalledWith('query', expect.any(Function));
      
      // Call the query callback to cover line 40
      if (queryCallback) {
        queryCallback({ query: 'SELECT 1', duration: 100 } as Prisma.QueryEvent);
        expect(mockLoggerService.debug).toHaveBeenCalledWith('Query: SELECT 1, Duration: 100ms');
      }
    });

    it('should not setup query logging in production', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'DATABASE_URL') return 'postgresql://test:test@localhost:5432/mechmind_test';
        return undefined;
      });

      await service.onModuleInit();

      expect(service.$on).not.toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database', async () => {
      await service.onModuleDestroy();

      expect(service.$disconnect).toHaveBeenCalled();
      expect(mockLoggerService.log).toHaveBeenCalledWith('Prisma disconnected from database');
    });
  });

  describe('setTenantContext', () => {
    it('should set tenant context in database', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      
      await service.setTenantContext(tenantId);

      expect(service.$executeRaw).toHaveBeenCalled();
    });

    it('should store tenant context internally', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      
      await service.setTenantContext(tenantId);

      expect(service.getCurrentTenantContext()).toEqual({ tenantId });
    });
  });

  describe('clearTenantContext', () => {
    it('should clear tenant context in database', async () => {
      await service.clearTenantContext();

      expect(service.$executeRaw).toHaveBeenCalled();
    });

    it('should clear internal tenant context', async () => {
      await service.setTenantContext('123e4567-e89b-12d3-a456-426614174000');
      expect(service.getCurrentTenantContext()).not.toBeNull();

      await service.clearTenantContext();

      expect(service.getCurrentTenantContext()).toBeNull();
    });
  });

  describe('getCurrentTenantContext', () => {
    it('should return null when no context is set', () => {
      expect(service.getCurrentTenantContext()).toBeNull();
    });

    it('should return context after setting', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      await service.setTenantContext(tenantId);

      const context = service.getCurrentTenantContext();

      expect(context).toEqual({ tenantId });
    });
  });

  describe('withTenant', () => {
    it('should execute callback with tenant context', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const callback = jest.fn().mockResolvedValue('result');

      const result = await service.withTenant(tenantId, callback);

      expect(service.$executeRaw).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(service);
      expect(result).toBe('result');
    });

    it('should restore previous context after execution', async () => {
      const previousTenantId = '00000000-0000-0000-0000-000000000001';
      const newTenantId = '123e4567-e89b-12d3-a456-426614174000';
      
      await service.setTenantContext(previousTenantId);
      
      const callback = jest.fn().mockResolvedValue('result');
      await service.withTenant(newTenantId, callback);

      // Should restore to previous context
      expect(service.getCurrentTenantContext()).toEqual({ tenantId: previousTenantId });
    });

    it('should clear context if no previous context', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const callback = jest.fn().mockResolvedValue('result');

      await service.withTenant(tenantId, callback);

      // Should clear to null if there was no previous context
      expect(service.getCurrentTenantContext()).toBeNull();
    });

    it('should restore previous context even if callback throws', async () => {
      const previousTenantId = '00000000-0000-0000-0000-000000000001';
      const newTenantId = '123e4567-e89b-12d3-a456-426614174000';
      
      await service.setTenantContext(previousTenantId);
      
      const callback = jest.fn().mockRejectedValue(new Error('Test error'));

      await expect(service.withTenant(newTenantId, callback)).rejects.toThrow('Test error');

      expect(service.getCurrentTenantContext()).toEqual({ tenantId: previousTenantId });
    });
  });

  describe('withSerializableTransaction', () => {
    it('should execute callback in serializable transaction', async () => {
      const callback = jest.fn().mockResolvedValue('result');

      const result = await service.withSerializableTransaction(callback);

      expect(service.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        })
      );
      expect(result).toBe('result');
    });

    it('should retry on serialization failure (P2034)', async () => {
      let attempts = 0;
      const callback = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          const error = new Prisma.PrismaClientKnownRequestError(
            'Transaction failed due to a serialization failure',
            { code: 'P2034', clientVersion: '5.0.0' }
          );
          throw error;
        }
        return 'success';
      });

      const result = await service.withSerializableTransaction(callback, {
        maxRetries: 3,
        retryDelay: 10,
      });

      expect(attempts).toBe(3);
      expect(result).toBe('success');
      expect(mockLoggerService.warn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries exceeded', async () => {
      const callback = jest.fn().mockImplementation(() => {
        const error = new Prisma.PrismaClientKnownRequestError(
          'Transaction failed due to a serialization failure',
          { code: 'P2034', clientVersion: '5.0.0' }
        );
        throw error;
      });

      await expect(
        service.withSerializableTransaction(callback, { maxRetries: 2, retryDelay: 1 })
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('should not retry on non-serialization errors', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Other error'));

      await expect(
        service.withSerializableTransaction(callback, { maxRetries: 3, retryDelay: 1 })
      ).rejects.toThrow('Other error');

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should use default retry options', async () => {
      const callback = jest.fn().mockResolvedValue('result');

      await service.withSerializableTransaction(callback);

      // Should complete without specifying options
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('acquireAdvisoryLock', () => {
    it('should acquire lock successfully', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const resourceId = 'resource-123';

      (service.$queryRaw as jest.Mock).mockResolvedValue([{ acquired: true }]);

      const result = await service.acquireAdvisoryLock(tenantId, resourceId);

      expect(result).toBe(true);
      expect(service.$queryRaw).toHaveBeenCalled();
    });

    it('should return false when lock cannot be acquired', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const resourceId = 'resource-123';

      (service.$queryRaw as jest.Mock).mockResolvedValue([{ acquired: false }]);

      const result = await service.acquireAdvisoryLock(tenantId, resourceId);

      expect(result).toBe(false);
    });

    it('should generate consistent lock IDs for same tenant/resource', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const resourceId = 'resource-123';

      (service.$queryRaw as jest.Mock).mockResolvedValue([{ acquired: true }]);

      await service.acquireAdvisoryLock(tenantId, resourceId);
      const firstCall = (service.$queryRaw as jest.Mock).mock.calls[0];

      await service.acquireAdvisoryLock(tenantId, resourceId);
      const secondCall = (service.$queryRaw as jest.Mock).mock.calls[1];

      // Lock IDs should be the same (second argument is the lock ID)
      expect(firstCall[1]).toEqual(secondCall[1]);
    });

    it('should generate different lock IDs for different tenants', async () => {
      const tenantId1 = 'aaaaaaaa-e89b-12d3-a456-426614174000';
      const tenantId2 = 'bbbbbbbb-e89b-12d3-a456-426614174001';
      const resourceId = 'resource-123';

      (service.$queryRaw as jest.Mock).mockResolvedValue([{ acquired: true }]);

      await service.acquireAdvisoryLock(tenantId1, resourceId);
      const firstCall = (service.$queryRaw as jest.Mock).mock.calls[0];

      await service.acquireAdvisoryLock(tenantId2, resourceId);
      const secondCall = (service.$queryRaw as jest.Mock).mock.calls[1];

      // Lock IDs should be different (second argument is the lock ID)
      expect(firstCall[1]).not.toEqual(secondCall[1]);
    });
  });

  describe('releaseAdvisoryLock', () => {
    it('should release lock successfully', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const resourceId = 'resource-123';

      await service.releaseAdvisoryLock(tenantId, resourceId);

      expect(service.$queryRaw).toHaveBeenCalled();
    });

    it('should use same lock ID as acquire', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const resourceId = 'resource-123';

      (service.$queryRaw as jest.Mock).mockResolvedValue([{ acquired: true }]);

      await service.acquireAdvisoryLock(tenantId, resourceId);
      const acquireCall = (service.$queryRaw as jest.Mock).mock.calls[0];

      (service.$queryRaw as jest.Mock).mockClear();

      await service.releaseAdvisoryLock(tenantId, resourceId);
      const releaseCall = (service.$queryRaw as jest.Mock).mock.calls[0];

      // Lock IDs should match (second argument)
      expect(acquireCall[1]).toEqual(releaseCall[1]);
    });
  });

  describe('setupRLS', () => {
    it('should enable RLS on tenant-scoped tables', async () => {
      (service.$executeRawUnsafe as jest.Mock).mockResolvedValue(undefined);

      await (service as any).setupRLS();

      // Should be called for each table
      const tables = ['users', 'customers', 'vehicles', 'bookings', 'booking_slots', 'services'];
      const calls = (service.$executeRawUnsafe as jest.Mock).mock.calls;
      
      for (const table of tables) {
        const enableCall = calls.find((call: any[]) => 
          call[0].includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`)
        );
        expect(enableCall).toBeDefined();
      }
    });

    it('should create RLS policies for each table', async () => {
      (service.$executeRawUnsafe as jest.Mock).mockResolvedValue(undefined);

      await (service as any).setupRLS();

      const calls = (service.$executeRawUnsafe as jest.Mock).mock.calls;
      const policyCall = calls.find((call: any[]) => 
        call[0].includes('CREATE POLICY')
      );
      expect(policyCall).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      (service.$executeRawUnsafe as jest.Mock).mockRejectedValue(new Error('Table does not exist'));

      // Should not throw
      await expect((service as any).setupRLS()).resolves.not.toThrow();
      
      expect(mockLoggerService.warn).toHaveBeenCalled();
    });
  });

  describe('constructor', () => {
    it('should initialize with correct database configuration', () => {
      const newService = new PrismaService(configService, loggerService);
      expect(newService).toBeDefined();
    });

    it('should use DATABASE_URL from config', () => {
      new PrismaService(configService, loggerService);
      
      expect(mockConfigService.get).toHaveBeenCalledWith('DATABASE_URL');
    });
  });

  // ==================== BRANCH COVERAGE TESTS ====================
  describe('[Service] - Branch Coverage', () => {
    describe('onModuleInit - NODE_ENV branches', () => {
      it.each([
        { env: 'development', shouldLogQueries: true },
        { env: 'test', shouldLogQueries: false },
        { env: 'production', shouldLogQueries: false },
        { env: 'staging', shouldLogQueries: false },
      ])('NODE_ENV=$env shouldLogQueries=$shouldLogQueries', async ({ env, shouldLogQueries }) => {
        jest.clearAllMocks();
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'NODE_ENV') return env;
          if (key === 'DATABASE_URL') return 'postgresql://test:test@localhost:5432/mechmind_test';
          return undefined;
        });

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            PrismaService,
            { provide: ConfigService, useValue: mockConfigService },
            { provide: LoggerService, useValue: mockLoggerService },
          ],
        }).compile();

        const testService = module.get<PrismaService>(PrismaService);
        jest.spyOn(testService, '$connect').mockResolvedValue(undefined);
        jest.spyOn(testService, '$on').mockImplementation(() => {});

        await testService.onModuleInit();

        if (shouldLogQueries) {
          expect(testService.$on).toHaveBeenCalledWith('query', expect.any(Function));
        } else {
          expect(testService.$on).not.toHaveBeenCalledWith('query', expect.any(Function));
        }
      });
    });

    describe('withTenant - previousContext branches', () => {
      it.each([
        { hasPrevious: true, previousTenant: 'prev-tenant-123', expectedTenant: 'prev-tenant-123' },
        { hasPrevious: false, previousTenant: null, expectedTenant: null },
      ])('hasPrevious=$hasPrevious restores context correctly', async ({ hasPrevious, previousTenant, expectedTenant }) => {
        if (hasPrevious && previousTenant) {
          await service.setTenantContext(previousTenant);
          expect(service.getCurrentTenantContext()).toEqual({ tenantId: previousTenant });
        } else {
          await service.clearTenantContext();
          expect(service.getCurrentTenantContext()).toBeNull();
        }

        const newTenantId = 'new-tenant-456';
        const callback = jest.fn().mockResolvedValue('result');

        await service.withTenant(newTenantId, callback);

        if (hasPrevious) {
          expect(service.getCurrentTenantContext()).toEqual({ tenantId: expectedTenant });
        } else {
          expect(service.getCurrentTenantContext()).toBeNull();
        }
      });
    });

    describe('withSerializableTransaction - retry branches', () => {
      it.each([
        { maxRetries: 3, failCount: 2, shouldSucceed: true, description: 'succeeds on retry' },
        { maxRetries: 3, failCount: 3, shouldSucceed: false, description: 'fails after max retries' },
        { maxRetries: 1, failCount: 1, shouldSucceed: false, description: 'fails with maxRetries=1' },
        { maxRetries: 5, failCount: 4, shouldSucceed: true, description: 'succeeds on 5th attempt' },
      ])('$description (maxRetries=$maxRetries, failCount=$failCount)', async ({ maxRetries, failCount, shouldSucceed }) => {
        let attempts = 0;
        const callback = jest.fn().mockImplementation(() => {
          attempts++;
          if (attempts <= failCount) {
            throw new Prisma.PrismaClientKnownRequestError(
              'Transaction failed due to a serialization failure',
              { code: 'P2034', clientVersion: '5.0.0' }
            );
          }
          return 'success';
        });

        const transactionMock = jest.fn().mockImplementation(async (cb: any) => {
          return cb(service);
        });
        (service.$transaction as jest.Mock) = transactionMock;

        if (shouldSucceed) {
          const result = await service.withSerializableTransaction(callback, { maxRetries, retryDelay: 1 });
          expect(result).toBe('success');
        } else {
          await expect(
            service.withSerializableTransaction(callback, { maxRetries, retryDelay: 1 })
          ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
        }

        expect(attempts).toBe(Math.min(failCount + (shouldSucceed ? 1 : 0), maxRetries));
      });

      it.each([
        { errorType: 'P2034', shouldRetry: true },
        { errorType: 'P2002', shouldRetry: false },
        { errorType: 'P2025', shouldRetry: false },
        { errorType: 'generic', shouldRetry: false },
      ])('error code $errorType shouldRetry=$shouldRetry', async ({ errorType, shouldRetry }) => {
        let attempts = 0;
        const callback = jest.fn().mockImplementation(() => {
          attempts++;
          if (errorType === 'generic') {
            throw new Error('Generic error');
          }
          throw new Prisma.PrismaClientKnownRequestError('Error', {
            code: errorType,
            clientVersion: '5.0.0',
          });
        });

        (service.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
          return cb(service);
        });

        if (shouldRetry) {
          await expect(
            service.withSerializableTransaction(callback, { maxRetries: 3, retryDelay: 1 })
          ).rejects.toThrow();
          expect(attempts).toBe(3); // Should retry max times
        } else {
          await expect(
            service.withSerializableTransaction(callback, { maxRetries: 3, retryDelay: 1 })
          ).rejects.toThrow();
          expect(attempts).toBe(1); // Should not retry
        }
      });

      it.each([
        { options: undefined, expectedMaxRetries: 3, expectedRetryDelay: 100 },
        { options: {}, expectedMaxRetries: 3, expectedRetryDelay: 100 },
        { options: { maxRetries: 5 }, expectedMaxRetries: 5, expectedRetryDelay: 100 },
        { options: { retryDelay: 50 }, expectedMaxRetries: 3, expectedRetryDelay: 50 },
        { options: { maxRetries: 5, retryDelay: 1 }, expectedMaxRetries: 5, expectedRetryDelay: 1 },
      ])('options=$options uses correct defaults', async ({ options, expectedMaxRetries }) => {
        let attemptCount = 0;
        const callback = jest.fn().mockImplementation(() => {
          attemptCount++;
          throw new Prisma.PrismaClientKnownRequestError('Error', {
            code: 'P2034',
            clientVersion: '5.0.0',
          });
        });

        (service.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
          return cb(service);
        });

        await expect(
          service.withSerializableTransaction(callback, options)
        ).rejects.toThrow();

        expect(attemptCount).toBe(expectedMaxRetries);
      });
    });

    describe('acquireAdvisoryLock - result branches', () => {
      it.each([
        { result: [{ acquired: true }], expected: true },
        { result: [{ acquired: false }], expected: false },
        { result: [{ acquired: undefined }], expected: false },
        { result: [{}], expected: false },
        { result: [], expected: false },
        { result: null, expected: false },
        { result: undefined, expected: false },
      ])('returns $expected when query result is $result', async ({ result, expected }) => {
        (service.$queryRaw as jest.Mock).mockResolvedValue(result as any);

        const tenantId = '123e4567-e89b-12d3-a456-426614174000';
        const resourceId = 'resource-123';

        const lockResult = await service.acquireAdvisoryLock(tenantId, resourceId);

        expect(lockResult).toBe(expected);
      });
    });



    describe('withTenant - error handling branches', () => {
      it.each([
        { hasPrevious: true, previousTenant: 'prev-123' },
        { hasPrevious: false, previousTenant: null },
      ])('restores context even when callback throws (hasPrevious=$hasPrevious)', async ({ hasPrevious, previousTenant }) => {
        if (hasPrevious && previousTenant) {
          await service.setTenantContext(previousTenant);
        } else {
          await service.clearTenantContext();
        }

        const initialContext = service.getCurrentTenantContext();

        const callback = jest.fn().mockRejectedValue(new Error('Callback error'));

        await expect(service.withTenant('new-tenant', callback)).rejects.toThrow('Callback error');

        // Should restore to initial context even after error
        expect(service.getCurrentTenantContext()).toEqual(initialContext);
      });
    });
  });
});
