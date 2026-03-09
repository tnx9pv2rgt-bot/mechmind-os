import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_PIPE, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Redis } from 'ioredis';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { BookingModule } from './booking/booking.module';
import { VoiceModule } from './voice/voice.module';
import { CustomerModule } from './customer/customer.module';
import { GdprModule } from './gdpr/gdpr.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DviModule } from './dvi/dvi.module';
import { ObdModule } from './obd/obd.module';
import { PartsModule } from './parts/parts.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { IotModule } from './iot/iot.module';
import { LoggerInterceptor } from './common/interceptors/logger.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate limiting with Redis storage for distributed setup (falls back to in-memory)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const throttlers = [
          { name: 'default', ttl: 60000, limit: 100 },
          { name: 'auth', ttl: 60000, limit: 5 },
          { name: 'api', ttl: 60000, limit: 200 },
          { name: 'webhook', ttl: 60000, limit: 1000 },
        ];

        const redisHost = config.get<string>('REDIS_HOST');
        if (!redisHost) {
          console.warn('[Throttler] REDIS_HOST not configured - using in-memory storage');
          return { throttlers };
        }

        try {
          const redisOptions: Record<string, unknown> = {
            host: redisHost,
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get<string>('REDIS_PASSWORD'),
            db: config.get<number>('REDIS_THROTTLE_DB', 1),
            lazyConnect: true,
            maxRetriesPerRequest: 3,
          };

          if (config.get<string>('REDIS_TLS') === 'true') {
            redisOptions.tls = {};
          }

          const storage = new ThrottlerStorageRedisService(new Redis(redisOptions));
          return { throttlers, storage: storage as unknown as ThrottlerStorage };
        } catch (error) {
          console.warn('[Throttler] Failed to connect to Redis, using in-memory storage:', error);
          return { throttlers };
        }
      },
    }),

    // Feature modules
    CommonModule,
    AuthModule,
    BookingModule,
    VoiceModule,
    CustomerModule,
    GdprModule,
    AnalyticsModule,
    NotificationsModule,
    DviModule,
    ObdModule,
    PartsModule,
    SubscriptionModule,
    IotModule,
  ],
  providers: [
    // Global validation pipe
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: {
            enableImplicitConversion: true,
          },
        }),
    },
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
