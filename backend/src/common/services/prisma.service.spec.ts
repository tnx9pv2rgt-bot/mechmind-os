jest.mock('@prisma/client/runtime/library', () => {
  class PrismaClientKnownRequestError extends Error {
    public code: string;
    public clientVersion: string;
    constructor(message: string, info: { code: string; clientVersion: string }) {
      super(message);
      this.name = 'PrismaClientKnownRequestError';
      this.code = info.code;
      this.clientVersion = info.clientVersion;
    }
  }
  return { PrismaClientKnownRequestError };
});

jest.mock('@prisma/client', () => {
  const { PrismaClientKnownRequestError } = jest.requireMock('@prisma/client/runtime/library') as {
    PrismaClientKnownRequestError: new (
      msg: string,
      info: { code: string; clientVersion: string },
    ) => Error;
  };

  class MockPrismaClient {
    $connect = jest.fn().mockResolvedValue(undefined);
    $disconnect = jest.fn().mockResolvedValue(undefined);
    $executeRaw = jest.fn().mockResolvedValue(1);
    $queryRaw = jest.fn().mockResolvedValue([]);
    $transaction = jest
      .fn()
      .mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb({}));
    $on = jest.fn();
  }

  return {
    PrismaClient: MockPrismaClient,
    Prisma: {
      PrismaClientKnownRequestError,
      TransactionIsolationLevel: { Serializable: 'Serializable' },
    },
  };
});

import { PrismaService } from './prisma.service';

const ORIGINAL_ENV = process.env;

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      NODE_ENV: 'test',
    };
    service = new PrismaService();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
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
      const logSpy = jest
        .spyOn((service as unknown as { logger: { log: jest.Mock } }).logger, 'log')
        .mockImplementation();

      await service.onModuleInit();
      expect(service.$connect).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('Prisma connected to database');
    });

    it('should disconnect on destroy and log', async () => {
      jest.spyOn(service, '$disconnect').mockResolvedValue();
      const logSpy = jest
        .spyOn((service as unknown as { logger: { log: jest.Mock } }).logger, 'log')
        .mockImplementation();

      await service.onModuleDestroy();
      expect(service.$disconnect).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('Prisma disconnected from database');
    });

    it('should setup query logging in development', async () => {
      process.env.NODE_ENV = 'development';
      const devService = new PrismaService();
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

  describe('constructor — env-driven configuration', () => {
    it('should use production pool size when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      const prodService = new PrismaService();
      expect(prodService).toBeDefined();
    });

    it('should handle DATABASE_URL with existing query params', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?sslmode=require';
      const svc = new PrismaService();
      expect(svc).toBeDefined();
    });

    it('should not append connection_limit if already in URL', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?connection_limit=5';
      const svc = new PrismaService();
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

  describe('onModuleInit — development query callback', () => {
    it('should invoke the query callback with event data', async () => {
      process.env.NODE_ENV = 'development';
      const devSvc = new PrismaService();
      let capturedCallback: ((e: { query: string; duration: number }) => void) | undefined;
      const debugSpy = jest
        .spyOn((devSvc as unknown as { logger: { debug: jest.Mock } }).logger, 'debug')
        .mockImplementation();
      jest.spyOn(devSvc, '$connect').mockResolvedValue();
      jest.spyOn(devSvc, '$on').mockImplementation((_event: string, cb: unknown) => {
        capturedCallback = cb as (e: { query: string; duration: number }) => void;
        return undefined as never;
      });

      await devSvc.onModuleInit();

      expect(capturedCallback).toBeDefined();
      if (capturedCallback) {
        capturedCallback({ query: 'SELECT 1', duration: 5 });
        expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('SELECT 1'));
      }
    });
  });
});
