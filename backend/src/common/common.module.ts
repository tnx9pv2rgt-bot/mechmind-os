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

@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      useFactory: () => {
        const redisHost = process.env.REDIS_HOST;
        if (!redisHost) {
          console.warn('[BullMQ] REDIS_HOST not configured - queues will not process jobs');
        }

        const connection: Record<string, unknown> = {
          host: redisHost || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB || '0'),
          lazyConnect: true,
          maxRetriesPerRequest: 3,
        };

        if (process.env.REDIS_TLS === 'true') {
          connection.tls = {};
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
    BullModule.registerQueue(
      { name: 'booking' },
      { name: 'voice' },
      { name: 'notification' },
    ),
  ],
  providers: [PrismaService, EncryptionService, QueueService, LoggerService, S3Service, RedisService, TenantGuard],
  exports: [PrismaService, EncryptionService, QueueService, LoggerService, S3Service, RedisService, BullModule, TenantGuard],
})
export class CommonModule {}
