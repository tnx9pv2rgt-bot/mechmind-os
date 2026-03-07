# MechMind OS - PRICING TIERS SYSTEM

A comprehensive subscription management system for MechMind OS SaaS platform.

## Pricing Model

| Plan | Price | Users | Locations | API Calls | Storage |
|------|-------|-------|-----------|-----------|---------|
| **Piccole (Small)** | €100/mese | 3 | 1 | 5,000/mo | 10 GB |
| **Medie (Medium)** | €390.90/mese | 10 | 2 | 25,000/mo | 50 GB |
| **Grandi (Enterprise)** | Custom | Unlimited | Unlimited | Unlimited | Unlimited |
| **AI Add-on** | +€200/mese | - | - | - | - |

## Features by Plan

### Piccole (Small)
- OBD Integration
- Inventory Management
- Basic reporting

### Medie (Medium)
- Everything in Piccole, plus:
- Multi-Location Support
- API Access
- Advanced Analytics
- Custom Branding
- Priority Support

### Grandi (Enterprise)
- Everything in Medie, plus:
- AI Vehicle Inspections (or AI Add-on)
- Voice AI Assistant (or AI Add-on)
- White Label
- Blockchain Verification
- Custom Integrations
- Dedicated Account Manager
- SLA Guarantee

## Architecture

### Database Models

1. **Subscription** - Main subscription record per tenant
2. **SubscriptionFeature** - Feature flags per subscription
3. **UsageTracking** - Monthly usage snapshots
4. **SubscriptionChange** - Audit log for all changes
5. **PromoCode** - Discount codes management
6. **Location** - Multi-location support

### Services

1. **FeatureAccessService** - Check feature availability and limits
2. **SubscriptionService** - Manage subscriptions, upgrades, billing

### Guards

1. **FeatureGuard** - Protect routes based on features
2. **LimitGuard** - Enforce plan limits

## API Endpoints

### User Endpoints
- `GET /subscription/current` - Get current subscription
- `GET /subscription/usage` - Get usage statistics
- `GET /subscription/limits` - Check all limits
- `GET /subscription/pricing` - Get pricing information
- `POST /subscription/upgrade` - Upgrade subscription
- `POST /subscription/downgrade` - Downgrade subscription
- `POST /subscription/cancel` - Cancel subscription
- `POST /subscription/reactivate` - Reactivate subscription
- `POST /subscription/ai-addon` - Toggle AI add-on
- `POST /subscription/checkout-session` - Create Stripe checkout

### Admin Endpoints
- `GET /admin/subscriptions` - List all subscriptions
- `GET /admin/subscriptions/analytics` - Get analytics
- `PUT /admin/subscriptions/:tenantId` - Update subscription

### Webhooks
- `POST /webhooks/stripe` - Stripe webhook handler

## Usage

### Checking Feature Access

```typescript
// In a controller
@Get('inspections/ai')
@RequireFeature(FeatureFlag.AI_INSPECTIONS)
@UseGuards(FeatureGuard)
async getAiInspections() {
  // Only accessible if tenant has AI_INSPECTIONS feature
}
```

### Enforcing Limits

```typescript
// In a controller
@Post('users')
@CheckLimit('user')
@UseGuards(LimitGuard)
async createUser() {
  // Will fail if user limit reached
}
```

### Programmatic Feature Check

```typescript
// In a service
const canAccess = await this.featureAccessService.canAccessFeature(
  tenantId,
  FeatureFlag.AI_INSPECTIONS
);

if (!canAccess.allowed) {
  throw new ForbiddenException(canAccess.reason);
}
```

## Frontend Usage

### Subscription Provider

```tsx
// In layout or app root
import { SubscriptionProvider } from '@/hooks/useSubscription';

<SubscriptionProvider>
  <App />
</SubscriptionProvider>
```

### Check Feature Access

```tsx
import { useFeatureAccess } from '@/hooks/useSubscription';

function MyComponent() {
  const { hasAccess, isLoading } = useFeatureAccess(FeatureFlag.AI_INSPECTIONS);
  
  if (isLoading) return <Loading />;
  if (!hasAccess) return <UpgradePrompt />;
  
  return <AiInspectionComponent />;
}
```

### Show Upgrade Prompt

```tsx
import { UpgradePrompt } from '@/components/subscription';

function UserManagement() {
  const { limits } = usePlanLimits();
  
  return (
    <div>
      {limits && !limits.users.withinLimit && (
        <UpgradePrompt
          limit={limits.users}
          type="users"
          currentPlan={subscription.plan}
          onUpgrade={() => router.push('/dashboard/subscription')}
        />
      )}
      {/* User list */}
    </div>
  );
}
```

## Configuration

Edit `src/subscription/config/pricing.config.ts` to modify:
- Plan prices
- Feature availability
- Usage limits
- Warning thresholds

## Stripe Integration

1. Create products and prices in Stripe Dashboard
2. Set price IDs in environment variables
3. Configure webhook endpoint
4. Test with Stripe CLI

## Migration

Run the database migration:

```bash
cd mechmind-os/backend
npx prisma migrate dev --name add_subscription_models
```

Or apply the SQL directly:

```bash
psql $DATABASE_URL < prisma/migrations/009_add_subscription_models.sql
```

## Testing

```bash
# Run subscription tests
npm test -- --testPathPattern=subscription

# Run specific test
npm test -- subscription.service.spec.ts
```

## License

Part of MechMind OS - All rights reserved.
