import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from './services/prisma.service';
import { EncryptionService } from './services/encryption.service';
import { QueueService } from './services/queue.service';
import { LoggerService } from './services/logger.service';
import { S3Service } from './services/s3.service';
import { RedisService } from './services/redis.service';
import { TenantGuard } from './guard/tenant.guard';
import { HealthController } from './health/health.controller';
import { MetricsService } from './metrics/metrics.service';
import { MetricsController } from './metrics/metrics.controller';
import { ShutdownService } from './services/shutdown.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      useFactory: () => {
        const connection: Record<string, unknown> = {
          lazyConnect: true,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        };

        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
          try {
            const url = new URL(redisUrl);
            connection.host = url.hostname;
            connection.port = parseInt(url.port, 10) || 6379;
            connection.password = url.password || undefined;
            connection.db = parseInt(url.pathname.slice(1), 10) || 0;
            if (url.protocol === 'rediss:') {
              connection.tls = {};
            }
          } catch {
            Logger.warn('Invalid REDIS_URL, falling back to individual vars', 'BullMQ');
          }
        }

        if (!connection.host) {
          const redisHost = process.env.REDIS_HOST;
          if (!redisHost) {
            Logger.warn('REDIS_HOST not configured - queues will not process jobs', 'BullMQ');
          }
          connection.host = redisHost || 'localhost';
          connection.port = parseInt(process.env.REDIS_PORT || '6379');
          connection.password = process.env.REDIS_PASSWORD || undefined;
          connection.db = parseInt(process.env.REDIS_DB || '0');
          if (process.env.REDIS_TLS === 'true') {
            connection.tls = {};
          }
        }

        return {
          connection,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          },
        };
      },
    }),
    BullModule.registerQueue({ name: 'booking' }, { name: 'voice' }, { name: 'notification' }),
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    PrismaService,
    EncryptionService,
    QueueService,
    LoggerService,
    S3Service,
    RedisService,
    TenantGuard,
    MetricsService,
    ShutdownService,
    CircuitBreakerService,
  ],
  exports: [
    PrismaService,
    EncryptionService,
    QueueService,
    LoggerService,
    S3Service,
    RedisService,
    BullModule,
    TenantGuard,
    MetricsService,
    ShutdownService,
    CircuitBreakerService,
  ],
})
export class CommonModule {}
