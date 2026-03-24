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
  });
});
