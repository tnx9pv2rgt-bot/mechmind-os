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
});
