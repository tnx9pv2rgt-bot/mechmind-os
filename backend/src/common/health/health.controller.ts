import { Controller, Get, HttpStatus, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { PrismaService } from '../services/prisma.service';
import { RedisService } from '../services/redis.service';
import { LoggerService } from '../services/logger.service';

interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: Record<string, ComponentCheck>;
}

interface ComponentCheck {
  status: 'up' | 'down';
  latency?: number;
  error?: string;
}

@ApiTags('Health')
@SkipThrottle()
@Controller({ version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * /health — Full health check (DB + Redis)
   * Returns 200 if all healthy, 503 if any critical component is down
   */
  @Get('health')
  @ApiOperation({ summary: 'Health check completo (DB + Redis)' })
  @ApiResponse({ status: 200, description: 'Tutti i componenti funzionanti o degradati' })
  @ApiResponse({ status: 503, description: 'Database non raggiungibile' })
  async health(@Res() res: Response): Promise<void> {
    const checks: Record<string, ComponentCheck> = {};

    const [dbCheck, redisCheck] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    checks.database =
      dbCheck.status === 'fulfilled' ? dbCheck.value : { status: 'down', error: 'Check failed' };
    checks.redis =
      redisCheck.status === 'fulfilled'
        ? redisCheck.value
        : { status: 'down', error: 'Check failed' };

    const allUp = Object.values(checks).every(c => c.status === 'up');
    const dbUp = checks.database?.status === 'up';

    const result: HealthCheckResult = {
      status: allUp ? 'ok' : dbUp ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };

    // Return 200 if DB is up (even with Redis down = degraded)
    // Only 503 if database is unreachable
    const statusCode = dbUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(statusCode).json(result);
  }

  /**
   * /liveness — Is the process alive?
   * Always returns 200 if the server can respond
   */
  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe - il processo e vivo?' })
  @ApiResponse({ status: 200, description: 'Processo attivo' })
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  /**
   * /readiness — Can the server handle requests?
   * Returns 200 only if DB is reachable
   */
  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe - il server puo gestire richieste?' })
  @ApiResponse({ status: 200, description: 'Server pronto' })
  @ApiResponse({ status: 503, description: 'Server non pronto' })
  async readiness(@Res() res: Response): Promise<void> {
    const dbCheck = await this.checkDatabase();

    const statusCode = dbCheck.status === 'up' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(statusCode).json({
      status: dbCheck.status === 'up' ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      database: dbCheck,
    });
  }

  private async checkDatabase(): Promise<ComponentCheck> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latency: Date.now() - start };
    } catch (error) {
      this.logger.error('Health check: database unreachable', (error as Error).message);
      return { status: 'down', latency: Date.now() - start, error: 'Database unreachable' };
    }
  }

  private async checkRedis(): Promise<ComponentCheck> {
    const start = Date.now();
    try {
      await this.redis.set('health:ping', 'pong', 10);
      const value = await this.redis.get('health:ping');
      if (value !== 'pong') {
        return { status: 'down', latency: Date.now() - start, error: 'Redis read/write mismatch' };
      }
      return { status: 'up', latency: Date.now() - start };
    } catch (error) {
      this.logger.error('Health check: redis unreachable', (error as Error).message);
      return { status: 'down', latency: Date.now() - start, error: 'Redis unreachable' };
    }
  }
}
