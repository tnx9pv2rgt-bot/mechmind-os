# Stripe Billing Setup Guide

## Overview

This guide will help you set up Stripe Billing for MechMind OS.

## Prerequisites

1. Stripe account (test mode recommended for development)
2. Access to Stripe Dashboard: https://dashboard.stripe.com

## Step 1: Get API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
4. Add to `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

## Step 2: Create Products and Prices

### Create Products in Stripe Dashboard:

1. Go to https://dashboard.stripe.com/products
2. Click "Add product"

#### Product 1: Piccole
- **Name**: MechMind OS - Piccole
- **Description**: Per officine con fino a 3 dipendenti
- **Price**: €100.00 / month
- **Price ID**: Copy this and save as `STRIPE_PRICE_PICCOLE`

#### Product 2: Medie
- **Name**: MechMind OS - Medie
- **Description**: Per officine in crescita
- **Price**: €390.90 / month
- **Price ID**: Copy this and save as `STRIPE_PRICE_MEDIE`

#### Product 3: Enterprise
- **Name**: MechMind OS - Enterprise
- **Description**: Per grandi officine e gruppi
- **Price**: €999.00 / month (or contact sales)
- **Price ID**: Copy this and save as `STRIPE_PRICE_ENTERPRISE`

#### Product 4: AI Add-on
- **Name**: MechMind OS - AI Add-on
- **Description**: Funzionalità AI avanzate
- **Price**: €200.00 / month
- **Price ID**: Copy this and save as `STRIPE_PRICE_AI_ADDON`

## Step 3: Configure Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. **Endpoint URL**: `https://your-domain.com/api/stripe/webhook`
   - For local development, use Stripe CLI (see below)
4. **Events to listen for**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.created`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Step 4: Configure Customer Portal (Optional)

1. Go to https://dashboard.stripe.com/settings/billing/portal
2. Customize your portal:
   - Branding (logo, colors)
   - Allowed updates (plans, payment methods)
   - Cancellation flow
3. Copy the **Configuration ID** (starts with `bpc_`)
4. Add to `.env.local`:
   ```
   STRIPE_PORTAL_CONFIGURATION_ID=bpc_...
   ```

## Step 5: Local Development with Stripe CLI

For local webhook testing:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Copy the webhook signing secret and update `.env.local`

## Step 6: Database Migration

Run the Prisma migration to add the Tenant table:

```bash
npx prisma migrate dev --name add_tenant_billing
```

Or apply directly:

```bash
npx prisma db push
```

## Step 7: Test the Integration

1. Start your development server: `npm run dev`
2. Go to http://localhost:3000/dashboard/billing
3. Select a plan and complete the checkout using Stripe test cards:
   - **Success**: `4242 4242 4242 4242`
   - **Requires authentication**: `4000 0025 0000 3155`
   - **Declined**: `4000 0000 0000 0002`
4. Use any future date for expiry, any 3 digits for CVC, any ZIP

## Pricing Summary

| Piano | Prezzo | Caratteristiche |
|-------|--------|-----------------|
| Piccole | €100/mese | Fino a 3 utenti, 1 officina |
| Medie | €390.90/mese | Fino a 10 utenti, 3 officine |
| Enterprise | €999/mese | Utenti illimitati, API access |
| AI Add-on | €200/mese | Funzionalità AI avanzate |

## Webhook Events Handled

| Evento | Azione |
|--------|--------|
| `checkout.session.completed` | Attiva tenant, crea sottoscrizione |
| `customer.subscription.updated` | Aggiorna piano/stato |
| `customer.subscription.deleted` | Archivia tenant |
| `invoice.payment_failed` | Avvia grace period (3 giorni) |
| `invoice.paid` | Conferma pagamento |
| `invoice.created` | Invia notifica email |

## Troubleshooting

### Webhook signature verification failed
- Ensure `STRIPE_WEBHOOK_SECRET` is correct
- Check that the webhook endpoint URL matches exactly
- For local dev, make sure you're using the CLI-forwarded secret

### Price not found
- Verify Price IDs in Stripe Dashboard
- Check environment variables are loaded
- Ensure you're using the correct environment (test/live)

### Subscription not updating
- Check webhook events are being received
- Verify webhook event types are selected
- Check server logs for errors

## Going Live

1. Switch to Stripe Live mode
2. Create products and prices in Live mode
3. Update environment variables with Live keys
4. Update webhook endpoint to production URL
5. Test with a small real payment
6. Monitor webhook deliveries in Stripe Dashboard

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Test Cards: https://stripe.com/docs/testing#cards
