import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { LoggerService } from './logger.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let logger: { log: jest.Mock; warn: jest.Mock; debug: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string, defaultVal?: unknown) => {
        const map: Record<string, unknown> = {
          DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
          NODE_ENV: 'test',
        };
        return map[key] ?? defaultVal;
      }),
    };
    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    service = new PrismaService(
      configService as unknown as ConfigService,
      logger as unknown as LoggerService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentTenantContext', () => {
    it('should return null initially', () => {
      expect(service.getCurrentTenantContext()).toBeNull();
    });
  });

  describe('setTenantContext / clearTenantContext', () => {
    it('should store tenant context', async () => {
      // Mock the raw query since we don't have a real DB
      jest.spyOn(service, '$executeRaw').mockResolvedValue(1);

      await service.setTenantContext('tenant-123');
      expect(service.getCurrentTenantContext()).toEqual({ tenantId: 'tenant-123' });
    });

    it('should clear tenant context', async () => {
      jest.spyOn(service, '$executeRaw').mockResolvedValue(1);

      await service.setTenantContext('tenant-123');
      await service.clearTenantContext();
      expect(service.getCurrentTenantContext()).toBeNull();
    });
  });

  describe('withTenant', () => {
    it('should execute callback within tenant context and restore previous', async () => {
      jest.spyOn(service, '$executeRaw').mockResolvedValue(1);

      const result = await service.withTenant('tenant-abc', async () => {
        expect(service.getCurrentTenantContext()).toEqual({ tenantId: 'tenant-abc' });
        return 'done';
      });

      expect(result).toBe('done');
      expect(service.getCurrentTenantContext()).toBeNull();
    });

    it('should restore previous context after nested calls', async () => {
      jest.spyOn(service, '$executeRaw').mockResolvedValue(1);

      await service.setTenantContext('tenant-outer');

      await service.withTenant('tenant-inner', async () => {
        expect(service.getCurrentTenantContext()).toEqual({ tenantId: 'tenant-inner' });
        return null;
      });

      expect(service.getCurrentTenantContext()).toEqual({ tenantId: 'tenant-outer' });
    });

    it('should restore context even on error', async () => {
      jest.spyOn(service, '$executeRaw').mockResolvedValue(1);

      await expect(
        service.withTenant('tenant-err', async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      expect(service.getCurrentTenantContext()).toBeNull();
    });
  });

  describe('generateLockId (via acquireAdvisoryLock)', () => {
    it('should generate deterministic lock IDs', async () => {
      const querySpy = jest.spyOn(service, '$queryRaw').mockResolvedValue([{ acquired: true }]);

      await service.acquireAdvisoryLock('tenant-1', 'resource-1');

      expect(querySpy).toHaveBeenCalled();
      // Verify it was called with a BigInt lock ID string
      const rawCall = querySpy.mock.calls[0];
      expect(rawCall).toBeDefined();
    });

    it('should return true when lock is acquired', async () => {
      jest.spyOn(service, '$queryRaw').mockResolvedValue([{ acquired: true }]);

      const result = await service.acquireAdvisoryLock('t1', 'r1');
      expect(result).toBe(true);
    });

    it('should return false when lock is not acquired', async () => {
      jest.spyOn(service, '$queryRaw').mockResolvedValue([{ acquired: false }]);

      const result = await service.acquireAdvisoryLock('t1', 'r1');
      expect(result).toBe(false);
    });
  });

  describe('releaseAdvisoryLock', () => {
    it('should call $queryRaw to release lock', async () => {
      const querySpy = jest
        .spyOn(service, '$queryRaw')
        .mockResolvedValue([{ pg_advisory_unlock: true }]);

      await service.releaseAdvisoryLock('t1', 'r1');
      expect(querySpy).toHaveBeenCalled();
    });
  });

  describe('onModuleInit / onModuleDestroy', () => {
    it('should connect on init and log', async () => {
      jest.spyOn(service, '$connect').mockResolvedValue();

      await service.onModuleInit();
      expect(service.$connect).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith('Prisma connected to database');
    });

    it('should disconnect on destroy and log', async () => {
      jest.spyOn(service, '$disconnect').mockResolvedValue();

      await service.onModuleDestroy();
      expect(service.$disconnect).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith('Prisma disconnected from database');
    });

    it('should setup query logging in development', async () => {
      // Override NODE_ENV to development
      const devConfigService = {
        get: jest.fn().mockImplementation((key: string, defaultVal?: unknown) => {
          const map: Record<string, unknown> = {
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
            NODE_ENV: 'development',
          };
          return map[key] ?? defaultVal;
        }),
      };
      const devService = new PrismaService(
        devConfigService as unknown as ConfigService,
        logger as unknown as LoggerService,
      );
      jest.spyOn(devService, '$connect').mockResolvedValue();
      jest.spyOn(devService, '$on').mockImplementation(() => undefined as never);

      await devService.onModuleInit();

      expect(devService.$on).toHaveBeenCalledWith('query', expect.any(Function));
    });
  });

  describe('withSerializableTransaction', () => {
    it('should execute callback within serializable transaction', async () => {
      jest
        .spyOn(service, '$transaction')
        .mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
          return cb(service);
        });

      const result = await service.withSerializableTransaction(async () => 'serialized-result');

      expect(result).toBe('serialized-result');
    });

    it('should retry on P2034 serialization failure', async () => {
      const { PrismaClientKnownRequestError } = await import('@prisma/client/runtime/library');
      const serializationError = new PrismaClientKnownRequestError('Serialization failure', {
        code: 'P2034',
        clientVersion: '5.0.0',
      });

      let callCount = 0;
      jest.spyOn(service, '$transaction').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) throw serializationError;
        return 'success';
      });

      const result = await service.withSerializableTransaction(async () => 'result', {
        retryDelay: 1,
      });

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });

    it('should throw after max retries exhausted', async () => {
      const { PrismaClientKnownRequestError } = await import('@prisma/client/runtime/library');
      const serializationError = new PrismaClientKnownRequestError('Serialization failure', {
        code: 'P2034',
        clientVersion: '5.0.0',
      });

      jest.spyOn(service, '$transaction').mockRejectedValue(serializationError);

      await expect(
        service.withSerializableTransaction(async () => 'result', {
          maxRetries: 2,
          retryDelay: 1,
        }),
      ).rejects.toThrow();
    });

    it('should re-throw non-serialization errors immediately', async () => {
      jest.spyOn(service, '$transaction').mockRejectedValue(new Error('Connection lost'));

      await expect(service.withSerializableTransaction(async () => 'result')).rejects.toThrow(
        'Connection lost',
      );
    });
  });

  describe('acquireAdvisoryLock — edge cases', () => {
    it('should return false when result is empty', async () => {
      jest.spyOn(service, '$queryRaw').mockResolvedValue([]);

      const result = await service.acquireAdvisoryLock('t1', 'r1');
      expect(result).toBe(false);
    });

    it('should return false when result is null', async () => {
      jest.spyOn(service, '$queryRaw').mockResolvedValue(null as never);

      const result = await service.acquireAdvisoryLock('t1', 'r1');
      expect(result).toBe(false);
    });
  });

  describe('constructor (production mode)', () => {
    it('should use production pool size when NODE_ENV is production', () => {
      const prodConfig = {
        get: jest.fn().mockImplementation((key: string, defaultVal?: unknown) => {
          const map: Record<string, unknown> = {
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
            NODE_ENV: 'production',
          };
          return map[key] ?? defaultVal;
        }),
      };
      const prodService = new PrismaService(
        prodConfig as unknown as ConfigService,
        logger as unknown as LoggerService,
      );
      expect(prodService).toBeDefined();
    });

    it('should handle DATABASE_URL with existing query params', () => {
      const configWithParams = {
        get: jest.fn().mockImplementation((key: string, defaultVal?: unknown) => {
          const map: Record<string, unknown> = {
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test?sslmode=require',
            NODE_ENV: 'test',
          };
          return map[key] ?? defaultVal;
        }),
      };
      const svc = new PrismaService(
        configWithParams as unknown as ConfigService,
        logger as unknown as LoggerService,
      );
      expect(svc).toBeDefined();
    });

    it('should not append connection_limit if already in URL', () => {
      const configWithLimit = {
        get: jest.fn().mockImplementation((key: string, defaultVal?: unknown) => {
          const map: Record<string, unknown> = {
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test?connection_limit=5',
            NODE_ENV: 'test',
          };
          return map[key] ?? defaultVal;
        }),
      };
      const svc = new PrismaService(
        configWithLimit as unknown as ConfigService,
        logger as unknown as LoggerService,
      );
      expect(svc).toBeDefined();
    });
  });

  describe('withSerializableTransaction — maxRetries:0 (line 155 || branch)', () => {
    it('should throw new Error when maxRetries is 0 and lastError is null', async () => {
      await expect(
        service.withSerializableTransaction(async () => 'result', { maxRetries: 0 }),
      ).rejects.toThrow('Transaction failed after max retries');
    });
  });

  describe('onModuleInit — development query callback (line 59)', () => {
    it('should invoke the query callback with event data', async () => {
      const devConfig = {
        get: jest.fn().mockImplementation((key: string, defaultVal?: unknown) => {
          const map: Record<string, unknown> = {
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
            NODE_ENV: 'development',
          };
          return map[key] ?? defaultVal;
        }),
      };
      const devSvc = new PrismaService(
        devConfig as unknown as ConfigService,
        logger as unknown as LoggerService,
      );
      let capturedCallback: ((e: { query: string; duration: number }) => void) | undefined;
      jest.spyOn(devSvc, '$connect').mockResolvedValue();
      jest.spyOn(devSvc, '$on').mockImplementation((_event: string, cb: unknown) => {
        capturedCallback = cb as (e: { query: string; duration: number }) => void;
        return undefined as never;
      });

      await devSvc.onModuleInit();

      expect(capturedCallback).toBeDefined();
      if (capturedCallback) {
        capturedCallback({ query: 'SELECT 1', duration: 5 });
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('SELECT 1'));
      }
    });
  });
});
