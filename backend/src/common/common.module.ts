import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from './services/prisma.service';
import { EncryptionService } from './services/encryption.service';
import { QueueService } from './services/queue.service';
import { LoggerService } from './services/logger.service';
import { TenantGuard } from './guard/tenant.guard';

@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB || '0'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'booking' },
      { name: 'voice' },
      { name: 'notification' },
    ),
  ],
  providers: [PrismaService, EncryptionService, QueueService, LoggerService, TenantGuard],
  exports: [PrismaService, EncryptionService, QueueService, LoggerService, BullModule, TenantGuard],
})
export class CommonModule {}
