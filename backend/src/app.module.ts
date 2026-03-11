import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_PIPE, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
// TODO: Enable when Prisma models are added
// import { FleetModule } from './fleet/fleet.module';
// import { TireModule } from './tire/tire.module';
// import { EstimateModule } from './estimate/estimate.module';
// import { LaborGuideModule } from './labor-guide/labor-guide.module';
// import { AccountingModule } from './accounting/accounting.module';
import { AdminModule } from './admin/admin.module';
import { LoggerInterceptor } from './common/interceptors/logger.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate limiting with in-memory storage (Upstash doesn't support Lua scripts)
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'default', ttl: 60000, limit: 100 },
        { name: 'strict', ttl: 60000, limit: 5 },
        { name: 'api', ttl: 60000, limit: 200 },
        { name: 'webhook', ttl: 60000, limit: 1000 },
      ],
      errorMessage: 'Rate limit exceeded. Please try again later.',
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
    // TODO: Enable when Prisma models are added
    // FleetModule,
    // TireModule,
    // EstimateModule,
    // LaborGuideModule,
    // AccountingModule,
    AdminModule,
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
