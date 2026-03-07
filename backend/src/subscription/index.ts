/**
 * SUBSCRIPTION MODULE - PUBLIC API
 */

// Services
export { SubscriptionService, CreateSubscriptionDto, UpgradeRequest } from './services/subscription.service';
export { FeatureAccessService, FeatureAccessCheck, LimitCheck, UsageStatus } from './services/feature-access.service';

// Guards
export { FeatureGuard, RequireFeature, createFeatureGuard, REQUIRED_FEATURE_KEY } from './guards/feature.guard';
export { LimitGuard, CheckLimit, createLimitGuard, ApiUsageMiddleware, LIMIT_CHECK_KEY } from './guards/limit.guard';

// Config
export {
  PLAN_PRICING,
  AI_ADDON,
  PLAN_LIMITS,
  PLAN_FEATURES,
  AI_ADDON_FEATURES,
  FEATURE_DETAILS,
  USAGE_WARNING_THRESHOLDS,
  getPlanPrice,
  getFormattedPrice,
  calculateProratedAmount,
  getFeaturesForPlan,
  formatBytes,
  getLimitDisplayValue,
  PlanPricing,
  PlanLimits,
  FeatureDetail,
} from './config/pricing.config';

// Module
export { SubscriptionModule } from './subscription.module';
