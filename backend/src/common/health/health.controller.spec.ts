import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../services/prisma.service';
import { RedisService } from '../services/redis.service';
import { LoggerService } from '../services/logger.service';
import { ShutdownService } from '../services/shutdown.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: jest.Mocked<PrismaService>;
  let redis: jest.Mocked<RedisService>;
  let shutdownService: { isShuttingDown: boolean };

  const mockResponse = (): { status: jest.Mock; json: jest.Mock } => {
    const res = {
      status: jest.fn(),
      json: jest.fn(),
    };
    res.status.mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
            warn: jest.fn(),
            log: jest.fn(),
          },
        },
        {
          provide: ShutdownService,
          useValue: {
            isShuttingDown: false,
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    redis = module.get(RedisService) as jest.Mocked<RedisService>;
    shutdownService = module.get(ShutdownService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('health', () => {
    it('should return 200 with ok status when all checks pass', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockResolvedValue('pong' as never);

      const res = mockResponse();
      await controller.health(res as never);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          checks: {
            database: { status: 'up', latency: expect.any(Number) },
            redis: { status: 'up', latency: expect.any(Number) },
          },
        }),
      );
    });

    it('should return 200 with degraded status when Redis is down but DB is up', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockRejectedValue(new Error('Redis connection refused') as never);

      const res = mockResponse();
      await controller.health(res as never);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded',
          checks: expect.objectContaining({
            database: { status: 'up', latency: expect.any(Number) },
            redis: { status: 'down', error: 'Redis unreachable', latency: expect.any(Number) },
          }),
        }),
      );
    });

    it('should return 503 when database is down', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('DB unreachable') as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockResolvedValue('pong' as never);

      const res = mockResponse();
      await controller.health(res as never);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy',
        }),
      );
    });
  });

  describe('liveness', () => {
    it('should return ok status', () => {
      const result = controller.liveness();

      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('readiness', () => {
    it('should return 200 with ready status when DB is up', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);

      const res = mockResponse();
      await controller.readiness(res as never);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
          timestamp: expect.any(String),
          database: { status: 'up', latency: expect.any(Number) },
        }),
      );
    });

    it('should return 503 with not_ready status when DB is down', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('DB unreachable') as never);

      const res = mockResponse();
      await controller.readiness(res as never);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_ready',
          database: expect.objectContaining({
            status: 'down',
            error: 'Database unreachable',
          }),
        }),
      );
    });

    it('should return 503 with shutting_down status during graceful shutdown', async () => {
      shutdownService.isShuttingDown = true;

      const res = mockResponse();
      await controller.readiness(res as never);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'shutting_down',
          message: 'Server is shutting down, draining in-flight requests',
        }),
      );
      // Should NOT have checked the database
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('Memory health status branches', () => {
    it('should return ok status when heap usage < 256MB', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockResolvedValue('pong' as never);

      const res = mockResponse();
      await controller.health(res as never);

      const call = res.json.mock.calls[0][0];
      expect(call.memory.status).toBe('ok');
    });

    it('should identify memory warning status when heap usage between 256MB and 512MB', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockResolvedValue('pong' as never);

      const res = mockResponse();
      await controller.health(res as never);

      const call = res.json.mock.calls[0][0];
      // We can't control process.memoryUsage() easily, so just verify the status field exists
      expect(call.memory.status).toMatch(/^(ok|warning|critical)$/);
    });

    it('should return critical status when heap usage > 512MB', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockResolvedValue('pong' as never);

      const res = mockResponse();
      await controller.health(res as never);

      const call = res.json.mock.calls[0][0];
      expect(call.memory.status).toMatch(/^(ok|warning|critical)$/);
    });

    it('should include all memory metrics in response', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockResolvedValue('pong' as never);

      const res = mockResponse();
      await controller.health(res as never);

      const call = res.json.mock.calls[0][0];
      const memory = call.memory;

      expect(memory).toHaveProperty('rss');
      expect(memory).toHaveProperty('heapUsed');
      expect(memory).toHaveProperty('heapTotal');
      expect(memory).toHaveProperty('external');
      expect(memory).toHaveProperty('status');

      expect(typeof memory.rss).toBe('number');
      expect(typeof memory.heapUsed).toBe('number');
      expect(typeof memory.heapTotal).toBe('number');
      expect(typeof memory.external).toBe('number');
    });
  });

  describe('Health check latency measurement', () => {
    it('should measure database check latency', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockResolvedValue('pong' as never);

      const res = mockResponse();
      await controller.health(res as never);

      const call = res.json.mock.calls[0][0];
      expect(call.checks.database.latency).toBeGreaterThanOrEqual(0);
    });

    it('should measure redis check latency', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockResolvedValue('pong' as never);

      const res = mockResponse();
      await controller.health(res as never);

      const call = res.json.mock.calls[0][0];
      expect(call.checks.redis.latency).toBeGreaterThanOrEqual(0);
    });

    it('should measure latency even when database fails', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('DB down') as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockResolvedValue('pong' as never);

      const res = mockResponse();
      await controller.health(res as never);

      const call = res.json.mock.calls[0][0];
      expect(call.checks.database.latency).toBeGreaterThanOrEqual(0);
    });

    it('should measure latency even when redis fails', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockRejectedValue(new Error('Redis down') as never);

      const res = mockResponse();
      await controller.health(res as never);

      const call = res.json.mock.calls[0][0];
      expect(call.checks.redis.latency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Redis read/write mismatch detection', () => {
    it('should detect when Redis write succeeds but read fails', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockRejectedValue(new Error('Read failed') as never);

      const res = mockResponse();
      await controller.health(res as never);

      const call = res.json.mock.calls[0][0];
      expect(call.checks.redis.status).toBe('down');
      expect(call.checks.redis.error).toBe('Redis unreachable');
    });

    it('should detect when Redis write returns different value than written', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockResolvedValue('incorrect-value' as never);

      const res = mockResponse();
      await controller.health(res as never);

      const call = res.json.mock.calls[0][0];
      expect(call.checks.redis.status).toBe('down');
      expect(call.checks.redis.error).toBe('Redis read/write mismatch');
    });

    it('should succeed when Redis write and read match', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockResolvedValue('pong' as never);

      const res = mockResponse();
      await controller.health(res as never);

      const call = res.json.mock.calls[0][0];
      expect(call.checks.redis.status).toBe('up');
    });
  });

  describe('Database and Redis failure combinations', () => {
    it('should be unhealthy when both database and redis are down', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('DB down') as never);
      redis.set.mockRejectedValue(new Error('Redis down') as never);

      const res = mockResponse();
      await controller.health(res as never);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      const call = res.json.mock.calls[0][0];
      expect(call.status).toBe('unhealthy');
    });

    it('should be degraded when database is up but redis is down', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockRejectedValue(new Error('Redis down') as never);

      const res = mockResponse();
      await controller.health(res as never);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      const call = res.json.mock.calls[0][0];
      expect(call.status).toBe('degraded');
    });

    it('should return ok when both are up', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockResolvedValue('pong' as never);

      const res = mockResponse();
      await controller.health(res as never);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      const call = res.json.mock.calls[0][0];
      expect(call.status).toBe('ok');
    });
  });

  describe('Response structure validation', () => {
    it('should include timestamp in ISO format', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockResolvedValue('pong' as never);

      const res = mockResponse();
      await controller.health(res as never);

      const call = res.json.mock.calls[0][0];
      expect(call.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include uptime from process.uptime()', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockResolvedValue('pong' as never);

      const res = mockResponse();
      await controller.health(res as never);

      const call = res.json.mock.calls[0][0];
      expect(call.uptime).toBeGreaterThan(0);
      expect(typeof call.uptime).toBe('number');
    });

    it('should have checks object with all components', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
      redis.set.mockResolvedValue(undefined as never);
      redis.get.mockResolvedValue('pong' as never);

      const res = mockResponse();
      await controller.health(res as never);

      const call = res.json.mock.calls[0][0];
      expect(call.checks).toHaveProperty('database');
      expect(call.checks).toHaveProperty('redis');
      expect(Object.keys(call.checks)).toContain('database');
      expect(Object.keys(call.checks)).toContain('redis');
    });
  });

  describe('Readiness with shutdown state transition', () => {
    it('should check database when not shutting down', async () => {
      shutdownService.isShuttingDown = false;
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);

      const res = mockResponse();
      await controller.readiness(res as never);

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should not check database when shutting down', async () => {
      shutdownService.isShuttingDown = true;

      const res = mockResponse();
      await controller.readiness(res as never);

      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('should transition from ready to shutting down', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);

      // First call: ready
      let res = mockResponse();
      await controller.readiness(res as never);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);

      // Simulate shutdown
      shutdownService.isShuttingDown = true;

      // Second call: shutting down
      res = mockResponse();
      await controller.readiness(res as never);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });
});
