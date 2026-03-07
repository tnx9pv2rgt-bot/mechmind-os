# MechMind OS - PRICING TIERS IMPLEMENTATION SUMMARY

## Overview
Complete PRICING TIERS system implemented for MechMind OS SaaS platform at `/mechmind-os/frontend`.

## Pricing Model

| Plan | Price (Monthly) | Users | Locations | API Calls | Storage |
|------|-----------------|-------|-----------|-----------|---------|
| **Piccole (Small)** | €100 | 3 | 1 | 5,000/mo | 10 GB |
| **Medie (Medium)** | €390.90 | 10 | 2 | 25,000/mo | 50 GB |
| **Grandi (Enterprise)** | Custom | Unlimited | Unlimited | Unlimited | Unlimited |
| **AI Add-on** | +€200 | - | - | - | - |

## Files Created

### 1. Database Schema (`mechmind-os/backend/prisma/`)
- **Migration**: `009_add_subscription_models.sql` - Complete SQL migration
- **Schema Updates**: `schema.prisma` - Added:
  - `Subscription` model
  - `SubscriptionFeature` model  
  - `UsageTracking` model
  - `SubscriptionChange` model
  - `PromoCode` model
  - `Location` model
  - Enums: `SubscriptionPlan`, `SubscriptionStatus`, `FeatureFlag`

### 2. Backend Configuration (`mechmind-os/backend/src/subscription/`)
- **`config/pricing.config.ts`** - Centralized pricing configuration:
  - Plan definitions and pricing
  - Feature availability by plan
  - Usage limits
  - Helper functions for pricing calculations

### 3. Backend Services (`mechmind-os/backend/src/subscription/services/`)
- **`feature-access.service.ts`** - Feature gating and limit enforcement
  - `canAccessFeature()` - Check if tenant can use a feature
  - `canAccessFeatures()` - Check multiple features
  - `assertCanAccessFeature()` - Throw if no access
  - `checkAllLimits()` - Check all plan limits
  - `canAddResource()` - Check if adding one more would exceed limit
  - `recordApiCall()` - Track API usage
  - `getUsageStats()` - Get comprehensive usage statistics

- **`subscription.service.ts`** - Subscription management
  - `getSubscription()` - Get subscription details
  - `upgradeSubscription()` - Handle upgrades with prorated billing
  - `downgradeSubscription()` - Schedule downgrades
  - `toggleAiAddon()` - Enable/disable AI add-on
  - `cancelSubscription()` - Cancel with data retention
  - `reactivateSubscription()` - Reactivate cancelled subscription
  - `createStripeCheckoutSession()` - Stripe integration
  - `handleStripeWebhook()` - Webhook handling
  - `adminUpdateSubscription()` - Admin override functions
  - `getSubscriptionAnalytics()` - Usage analytics

### 4. Backend Guards (`mechmind-os/backend/src/subscription/guards/`)
- **`feature.guard.ts`** - Route protection by feature
  - `@RequireFeature()` decorator
  - `FeatureGuard` for automatic checking
  - `createFeatureGuard()` factory

- **`limit.guard.ts`** - Plan limit enforcement
  - `@CheckLimit()` decorator
  - `LimitGuard` for automatic enforcement
  - `ApiUsageMiddleware` for tracking
  - `createLimitGuard()` factory

### 5. Backend Controllers (`mechmind-os/backend/src/subscription/controllers/`)
- **`subscription.controller.ts`** - REST API endpoints:
  - User endpoints: `/subscription/*`
  - Admin endpoints: `/admin/subscriptions/*`
  - Stripe webhooks: `/webhooks/stripe`
  - Pricing info: `/subscription/pricing/*`

### 6. Backend Module (`mechmind-os/backend/src/subscription/`)
- **`subscription.module.ts`** - NestJS module configuration
- **`index.ts`** - Public API exports
- **`middleware/subscription.middleware.ts`** - Express middleware
- **`README.md`** - Complete documentation

### 7. Frontend Service (`mechmind-os/frontend/lib/subscription/`)
- **`service.ts`** - Client-side API wrapper
  - All subscription API calls
  - Type definitions
  - Error handling

### 8. Frontend Hooks (`mechmind-os/frontend/hooks/`)
- **`useSubscription.ts`** - React hooks:
  - `SubscriptionProvider` - Context provider
  - `useSubscription()` - Main subscription hook
  - `useFeatureAccess()` - Feature checking hook
  - `usePricing()` - Pricing info hook
  - `usePlanLimits()` - Limit checking hook

### 9. Frontend Components (`mechmind-os/frontend/components/subscription/`)
- **`SubscriptionManager.tsx`** - Admin dashboard component
  - View all subscriptions
  - Filter and search
  - Edit subscriptions
  - View usage analytics

- **`PricingCards.tsx`** - Pricing display component
  - Plan comparison cards
  - Billing cycle toggle
  - AI add-on toggle
  - Feature lists
  - Stripe checkout integration

- **`UpgradePrompt.tsx`** - Limit warning component
  - Automatic limit detection
  - Warning banners
  - Upgrade CTAs
  - Usage details dialog

- **`index.ts`** - Public component exports

### 10. Frontend Pages
- **`app/dashboard/subscription/page.tsx`** - User subscription management
- **`app/dashboard/admin/subscriptions/page.tsx`** - Admin subscription dashboard

### 11. Configuration & Documentation
- **`.env.example`** - Environment variables for Stripe
- **`PRICING_IMPLEMENTATION_SUMMARY.md`** - This summary

## Key Features Implemented

### 1. Database Schema ✓
- Subscription model with tenantId, plan, status, billing period
- Plan enum (SMALL, MEDIUM, ENTERPRISE, TRIAL)
- FeatureFlags model for granular feature access
- Usage tracking for API calls, storage, users, locations
- Automatic subscription creation on tenant signup
- SQL triggers for timestamp updates

### 2. Feature Gating ✓
- `canAccessFeature(tenantId, feature): boolean`
- `assertCanAccessFeature()` for throwing errors
- `FeatureGuard` for route protection
- `@RequireFeature()` decorator
- Features: AI, multi-location, API access, advanced reports, etc.

### 3. Plan Limits Enforcement ✓
- Max users per plan (3/10/Unlimited)
- Max locations per plan (1/2/Unlimited)
- Max API calls per month (5K/25K/Unlimited)
- Storage limits (10GB/50GB/Unlimited)
- `LimitGuard` for automatic enforcement
- `@CheckLimit()` decorator
- Upgrade prompts when limits reached

### 4. Pricing Configuration ✓
- `lib/config/pricing.ts` - Centralized config
- Plan details, features, limits
- Easy price modification
- Helper functions for formatting
- Support for discounts (promo codes structure ready)

### 5. Upgrade/Downgrade Flow ✓
- `POST /api/subscription/upgrade` - With prorated billing
- `POST /api/subscription/downgrade` - Scheduled at period end
- Prorated billing calculation
- Data retention on downgrade (6 months)
- Stripe checkout integration

### 6. Admin Dashboard ✓
- `SubscriptionManager` component
- View all tenant subscriptions
- Filter by status/plan
- Manual plan changes
- Usage analytics
- Trial conversion tracking

### 7. Stripe Integration ✓
- Checkout session creation
- Webhook handling
- Subscription sync
- Payment method management
- Proration support

## API Endpoints

### User Endpoints
```
GET    /subscription/current           # Get current subscription
GET    /subscription/usage             # Get usage statistics
GET    /subscription/limits            # Check all limits
GET    /subscription/features/:feature # Check feature access
POST   /subscription/features/check    # Check multiple features
GET    /subscription/pricing           # Get pricing info
GET    /subscription/pricing/compare   # Compare plans
POST   /subscription/upgrade           # Upgrade subscription
POST   /subscription/downgrade         # Downgrade subscription
POST   /subscription/ai-addon          # Toggle AI add-on
POST   /subscription/cancel            # Cancel subscription
POST   /subscription/reactivate        # Reactivate subscription
POST   /subscription/checkout-session  # Create Stripe checkout
```

### Admin Endpoints
```
GET    /admin/subscriptions            # List all subscriptions
GET    /admin/subscriptions/analytics  # Get analytics
GET    /admin/subscriptions/:tenantId  # Get specific subscription
PUT    /admin/subscriptions/:tenantId  # Update subscription
```

## Usage Examples

### Protect a Route by Feature
```typescript
@Get('ai-inspections')
@RequireFeature(FeatureFlag.AI_INSPECTIONS)
@UseGuards(FeatureGuard)
async getAiInspections() {
  // Only accessible with AI feature
}
```

### Enforce User Limit
```typescript
@Post('users')
@CheckLimit('user')
@UseGuards(LimitGuard)
async createUser() {
  // Fails if user limit reached
}
```

### Check Feature in Frontend
```tsx
const { hasAccess } = useFeatureAccess(FeatureFlag.AI_INSPECTIONS);

if (!hasAccess) {
  return <UpgradePrompt />;
}
```

### Show Limit Warning
```tsx
const { limits } = usePlanLimits();

{limits && !limits.users.withinLimit && (
  <UpgradePrompt
    limit={limits.users}
    type="users"
    currentPlan={subscription.plan}
    onUpgrade={() => router.push('/dashboard/subscription')}
  />
)}
```

## Environment Variables
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_SMALL=price_...
STRIPE_PRICE_MEDIUM=price_...
STRIPE_PRICE_ENTERPRISE=price_...
STRIPE_PRICE_AI_ADDON=price_...
```

## Next Steps

1. **Run Migration**:
   ```bash
   cd mechmind-os/backend
   npx prisma migrate dev --name add_subscription_models
   ```

2. **Set up Stripe**:
   - Create products in Stripe Dashboard
   - Set price IDs in environment
   - Configure webhook endpoint

3. **Test**:
   ```bash
   npm test -- subscription
   ```

4. **Deploy**:
   - Deploy backend with new module
   - Configure Stripe webhooks
   - Test in staging

## Notes

- All existing tenants will automatically get a TRIAL subscription (via database trigger)
- AI Add-on requires Medium plan or higher
- Enterprise plan has custom pricing - contact sales
- Data retained for 6 months after cancellation
- Usage counters reset monthly for active subscriptions
