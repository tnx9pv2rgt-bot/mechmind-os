# Stripe Billing Integration - MechMind OS

## 📋 Overview

Complete Stripe Billing integration for MechMind OS with support for:
- **Piccole Plan**: €100/mese (fino a 3 utenti)
- **Medie Plan**: €390.90/mese (fino a 10 utenti)
- **Enterprise Plan**: €999/mese (utenti illimitati)
- **AI Add-on**: €200/mese (opzionale, aggiungibile in qualsiasi momento)

## 📁 File Structure

```
frontend/
├── lib/stripe/
│   ├── client.ts              # Frontend Stripe utilities
│   ├── server.ts              # Backend Stripe utilities (Node.js only)
│   ├── grace-period.ts        # Grace period management
│   ├── email-notifications.ts # Billing email templates
│   └── index.ts               # Barrel exports
├── app/api/stripe/
│   ├── checkout-session/route.ts      # Create checkout session
│   ├── portal/route.ts                # Customer portal
│   ├── webhook/route.ts               # Stripe webhooks
│   ├── billing-info/route.ts          # Get billing info
│   ├── subscription/route.ts          # Update/cancel subscription
│   ├── subscription/resume/route.ts   # Resume subscription
│   ├── ai-addon/route.ts              # Toggle AI addon
│   ├── verify-session/route.ts        # Verify checkout session
│   └── grace-period-check/route.ts    # Cron job for grace periods
├── app/dashboard/billing/
│   └── page.tsx               # Billing dashboard
├── app/billing/
│   ├── success/page.tsx       # Payment success page
│   └── cancel/page.tsx        # Payment cancel page
├── hooks/
│   └── useBilling.ts          # React hook for billing
└── prisma/
    ├── schema-updates.prisma  # Tenant model additions
    └── migrations/009_add_tenant_billing/migration.sql
```

## 🚀 Quick Start

### 1. Environment Variables

Add to `.env.local`:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs (from Stripe Dashboard)
STRIPE_PRICE_PICCOLE=price_...
STRIPE_PRICE_MEDIE=price_...
STRIPE_PRICE_ENTERPRISE=price_...
STRIPE_PRICE_AI_ADDON=price_...

NEXT_PUBLIC_STRIPE_PRICE_PICCOLE=price_...
NEXT_PUBLIC_STRIPE_PRICE_MEDIE=price_...
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE=price_...
NEXT_PUBLIC_STRIPE_PRICE_AI_ADDON=price_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Database Migration

```bash
npx prisma migrate dev --name add_tenant_billing
# or
npx prisma db push
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Configure Stripe Webhook (Local)

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 💳 Features

### Subscription Management
- ✅ Checkout with Stripe
- ✅ Plan upgrades/downgrades (prorated)
- ✅ AI Add-on toggle (prorated)
- ✅ Cancel at period end
- ✅ Resume canceled subscription

### Billing Dashboard
- 📊 Current plan display
- 📈 Usage statistics
- 💳 Payment method management
- 📄 Invoice history
- ⚙️ Stripe Customer Portal integration

### Webhook Handling
| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activate tenant subscription |
| `customer.subscription.updated` | Sync plan/status changes |
| `customer.subscription.deleted` | Archive tenant |
| `invoice.payment_failed` | Start 3-day grace period |
| `invoice.paid` | Confirm payment, clear grace period |
| `invoice.created` | Send invoice notification |

### Error Handling & Grace Period
- ⚠️ 3-day grace period for failed payments
- 🚫 Automatic suspension after grace period
- 📧 Email notifications for billing events
- 🔄 Retry logic for failed payments

## 🔌 API Endpoints

### POST /api/stripe/checkout-session
Create a checkout session for subscription.

```json
{
  "plan": "medie",
  "aiAddon": true,
  "successUrl": "https://...",
  "cancelUrl": "https://..."
}
```

### POST /api/stripe/portal
Create a customer portal session.

```json
{
  "returnUrl": "https://..."
}
```

### GET /api/stripe/billing-info
Get tenant billing information.

### PATCH /api/stripe/subscription
Update subscription plan.

```json
{
  "plan": "enterprise"
}
```

### DELETE /api/stripe/subscription
Cancel subscription at period end.

### POST /api/stripe/subscription/resume
Resume a canceled subscription.

### POST /api/stripe/ai-addon
Toggle AI addon.

```json
{
  "enabled": true
}
```

## 🎨 React Hook Usage

```tsx
import { useBilling } from '@/hooks/useBilling'

function MyComponent() {
  const { 
    billingInfo, 
    isLoading, 
    subscribe, 
    managePayment,
    toggleAi,
    cancel 
  } = useBilling()

  if (isLoading) return <Loading />

  return (
    <div>
      <p>Plan: {billingInfo?.subscription?.plan}</p>
      <button onClick={() => subscribe('medie')}>
        Upgrade
      </button>
    </div>
  )
}
```

## 🧪 Testing

### Test Cards

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Success |
| `4000 0025 0000 3155` | Requires 3D Secure |
| `4000 0000 0000 9995` | Declined |
| `4000 0000 0000 0002` | Generic decline |

Use any future date for expiry, any 3 digits for CVC.

### Test Webhook Events

```bash
# Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```

## 📅 Cron Job Configuration

### Vercel

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/stripe/grace-period-check",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Other Platforms

Set up a daily HTTP POST request to:
```
POST /api/stripe/grace-period-check
Authorization: Bearer YOUR_CRON_SECRET
```

## 📧 Email Notifications

The system sends emails for:
- Subscription activated
- Subscription canceled
- Payment successful
- Payment failed (with grace period info)
- Invoice created
- Invoice paid
- Grace period warning (1 day before)
- Account suspended

Configure in `lib/stripe/email-notifications.ts`

## 🔒 Security Considerations

1. **Webhook Verification**: All webhooks verify Stripe signature
2. **Client-Side Safety**: Server-only code in `lib/stripe/server.ts`
3. **Tenant Isolation**: All billing data scoped to tenant
4. **Grace Period**: Prevents immediate suspension on payment failure
5. **Cron Authentication**: Requires `CRON_SECRET` header

## 🐛 Troubleshooting

### Webhook signature verification failed
- Check `STRIPE_WEBHOOK_SECRET` is correct
- Ensure webhook endpoint URL matches exactly
- For local dev, use CLI-forwarded secret

### Price not found
- Verify Price IDs in Stripe Dashboard
- Check environment variables are loaded
- Ensure correct environment (test/live)

### Subscription not updating
- Check webhook events are being received
- Verify webhook event types are selected
- Check server logs for errors

## 📚 Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Customer Portal](https://stripe.com/docs/customer-management)

## 📝 License

Part of MechMind OS - Enterprise Automotive Management Platform
