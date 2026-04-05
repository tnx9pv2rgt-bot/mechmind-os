/**
 * SUBSCRIPTION MODULE
 *
 * Handles pricing tiers, feature gating, and subscription management
 */

import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionService } from './services/subscription.service';
import { FeatureAccessService } from './services/feature-access.service';
import { VoicePricingService } from './services/voice-pricing.service';
import {
  SubscriptionController,
  AdminSubscriptionController,
  StripeWebhookController,
} from './controllers/subscription.controller';
import { FeatureGuard } from './guards/feature.guard';
import { LimitGuard, ApiUsageMiddleware } from './guards/limit.guard';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, CommonModule, AuthModule],
  controllers: [SubscriptionController, AdminSubscriptionController, StripeWebhookController],
  providers: [
    SubscriptionService,
    FeatureAccessService,
    VoicePricingService,
    FeatureGuard,
    LimitGuard,
    ApiUsageMiddleware,
  ],
  exports: [
    SubscriptionService,
    FeatureAccessService,
    VoicePricingService,
    FeatureGuard,
    LimitGuard,
  ],
})
export class SubscriptionModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply API usage tracking to all API routes
    consumer
      .apply(ApiUsageMiddleware)
      .forRoutes(
        { path: 'api/*', method: RequestMethod.ALL },
        { path: 'subscription/*', method: RequestMethod.ALL },
      );
  }
}
