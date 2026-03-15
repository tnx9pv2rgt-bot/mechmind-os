import { Global, Module } from '@nestjs/common';
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
            console.warn('[BullMQ] Invalid REDIS_URL, falling back to individual vars');
          }
        }

        if (!connection.host) {
          const redisHost = process.env.REDIS_HOST;
          if (!redisHost) {
            console.warn('[BullMQ] REDIS_HOST not configured - queues will not process jobs');
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
  controllers: [HealthController],
  providers: [
    PrismaService,
    EncryptionService,
    QueueService,
    LoggerService,
    S3Service,
    RedisService,
    TenantGuard,
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
  ],
})
export class CommonModule {}
