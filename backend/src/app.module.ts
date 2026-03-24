import { Module, MiddlewareConsumer, NestModule, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE, APP_INTERCEPTOR, APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
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
import { FleetModule } from './fleet/fleet.module';
import { TireModule } from './tire/tire.module';
import { EstimateModule } from './estimate/estimate.module';
import { LaborGuideModule } from './labor-guide/labor-guide.module';
import { AccountingModule } from './accounting/accounting.module';
import { AdminModule } from './admin/admin.module';
import { InvoiceModule } from './invoice/invoice.module';
import { WorkOrderModule } from './work-order/work-order.module';
import { CannedJobModule } from './canned-job/canned-job.module';
import { SmsModule } from './sms/sms.module';
import { ReviewModule } from './reviews/review.module';
import { CampaignModule } from './campaign/campaign.module';
import { LocationModule } from './location/location.module';
import { RentriModule } from './rentri/rentri.module';
import { SecurityIncidentModule } from './security-incident/security-incident.module';
import { AiComplianceModule } from './ai-compliance/ai-compliance.module';
import { LoggerInterceptor } from './common/interceptors/logger.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

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
    FleetModule,
    TireModule,
    EstimateModule,
    LaborGuideModule,
    AccountingModule,
    AdminModule,
    InvoiceModule,
    WorkOrderModule,
    CannedJobModule,
    SmsModule,
    ReviewModule,
    CampaignModule,
    LocationModule,
    RentriModule,
    SecurityIncidentModule,
    AiComplianceModule,
  ],
  providers: [
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
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
    // Idempotency interceptor (caches POST/PUT/PATCH responses by Idempotency-Key header)
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
