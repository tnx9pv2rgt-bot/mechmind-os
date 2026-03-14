/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, verifyWebhookSignature, PRICE_ID_TO_PLAN } from '@/lib/stripe/server';
import { prisma } from '@/lib/prisma';
import { SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';

/** Map Stripe subscription status to Prisma SubscriptionStatus enum */
function mapStripeStatus(stripeStatus: string, cancelAtPeriodEnd?: boolean): SubscriptionStatus {
  if (cancelAtPeriodEnd) return SubscriptionStatus.CANCELLED;
  const statusMap: Record<string, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    unpaid: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELLED,
    incomplete: SubscriptionStatus.SUSPENDED,
    incomplete_expired: SubscriptionStatus.EXPIRED,
    trialing: SubscriptionStatus.TRIAL,
    paused: SubscriptionStatus.SUSPENDED,
  };
  return statusMap[stripeStatus] ?? SubscriptionStatus.ACTIVE;
}

/** Get current_period_start from subscription items (Stripe v20+) */
function getSubscriptionPeriod(subscription: Stripe.Subscription): { start: number; end: number } {
  const item = subscription.items.data[0];
  return {
    start: item?.current_period_start ?? 0,
    end: item?.current_period_end ?? 0,
  };
}

// Disable body parsing for raw body access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Handle checkout.session.completed
 * - Activate tenant subscription
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenantId;
  const plan = session.metadata?.plan;
  const aiAddon = session.metadata?.aiAddon === 'true';

  if (!tenantId) {
    console.error('No tenant ID in checkout session metadata');
    return;
  }

  // Get subscription details
  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.error('No subscription ID in checkout session');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Update tenant with subscription info
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: 'ACTIVE',
      subscriptionPlan: plan || 'piccole',
      aiAddon: aiAddon,
      currentPeriodStart: new Date(getSubscriptionPeriod(subscription).start * 1000),
      currentPeriodEnd: new Date(getSubscriptionPeriod(subscription).end * 1000),
      gracePeriodEnd: null,
      isSuspended: false,
    },
  });

  // Send welcome email notification
  await sendNotification(tenantId, 'subscription_activated', {
    plan: plan || 'piccole',
    aiAddon,
  });

  console.info(`✅ Tenant ${tenantId} subscription activated (${plan})`);
}

/**
 * Handle customer.subscription.updated
 * - Update plan or status changes
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const tenant = await prisma.tenant.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!tenant) {
    console.error(`No tenant found for subscription ${subscription.id}`);
    return;
  }

  // Get plan from subscription items
  const mainItem = subscription.items.data.find(item => !item.price.id.includes('ai_addon'));
  const plan = mainItem ? PRICE_ID_TO_PLAN[mainItem.price.id] : tenant.subscriptionPlan;

  // Check for AI addon
  const hasAiAddon = subscription.items.data.some(item => item.price.id.includes('ai_addon'));

  // Map Stripe status to our SubscriptionStatus enum
  const status = mapStripeStatus(subscription.status, subscription.cancel_at_period_end);

  // Calculate grace period for failed payments
  let gracePeriodEnd = null;
  if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
    gracePeriodEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
  }

  // Update tenant
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      subscriptionStatus: status,
      subscriptionPlan: plan || tenant.subscriptionPlan,
      aiAddon: hasAiAddon,
      currentPeriodStart: new Date(getSubscriptionPeriod(subscription).start * 1000),
      currentPeriodEnd: new Date(getSubscriptionPeriod(subscription).end * 1000),
      gracePeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  // Send notification for important status changes
  if (subscription.status === 'past_due') {
    await sendNotification(tenant.id, 'payment_failed', {
      gracePeriodEnd: gracePeriodEnd?.toISOString(),
    });
  }

  console.info(`📝 Tenant ${tenant.id} subscription updated (${status})`);
}

/**
 * Handle customer.subscription.deleted
 * - Archive tenant or mark as canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const tenant = await prisma.tenant.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!tenant) {
    console.error(`No tenant found for subscription ${subscription.id}`);
    return;
  }

  // Mark tenant as canceled/archived
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      subscriptionStatus: 'CANCELLED',
      stripeSubscriptionId: null,
      isSuspended: true,
    },
  });

  // Send cancellation notification
  await sendNotification(tenant.id, 'subscription_canceled', {});

  console.info(`❌ Tenant ${tenant.id} subscription canceled`);
}

/**
 * Handle invoice.payment_failed
 * - Alert admin, start grace period
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const tenant = await prisma.tenant.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!tenant) {
    console.error(`No tenant found for customer ${customerId}`);
    return;
  }

  // Set grace period end (3 days from now)
  const gracePeriodEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      subscriptionStatus: 'PAST_DUE',
      gracePeriodEnd,
    },
  });

  // Send payment failure notification
  await sendNotification(tenant.id, 'payment_failed', {
    amount: invoice.amount_due / 100,
    currency: invoice.currency,
    gracePeriodEnd: gracePeriodEnd.toISOString(),
    invoiceId: invoice.id,
  });

  // Alert admin
  await alertAdmin('payment_failed', {
    tenantId: tenant.id,
    tenantName: tenant.name,
    amount: invoice.amount_due / 100,
    currency: invoice.currency,
  });

  console.info(`⚠️ Payment failed for tenant ${tenant.id}, grace period started`);
}

/**
 * Handle invoice.paid
 * - Confirm payment, clear grace period
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const tenant = await prisma.tenant.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!tenant) return;

  // Clear grace period if it was set
  if (tenant.gracePeriodEnd) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: 'ACTIVE',
        gracePeriodEnd: null,
      },
    });

    // Send payment success notification
    await sendNotification(tenant.id, 'payment_success', {
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
    });
  }

  console.info(`✅ Payment confirmed for tenant ${tenant.id}`);
}

/**
 * Handle invoice.created
 * - Send email notification
 */
async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  // Only send for subscription invoices
  if (!invoice.parent?.subscription_details) return;

  const customerId = invoice.customer as string;

  const tenant = await prisma.tenant.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!tenant) return;

  // Send invoice notification
  await sendNotification(tenant.id, 'invoice_created', {
    amount: invoice.amount_due / 100,
    currency: invoice.currency,
    dueDate: new Date(invoice.due_date! * 1000).toISOString(),
    invoiceId: invoice.id,
  });

  console.info(`📧 Invoice created notification sent to tenant ${tenant.id}`);
}

/**
 * Send notification to tenant
 */
async function sendNotification(
  tenantId: string,
  type: string,
  data: Record<string, string | number | boolean | undefined>
) {
  try {
    // Call the notifications API
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        type,
        data,
        channels: ['email'],
      }),
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

/**
 * Alert admin about critical issues
 */
async function alertAdmin(type: string, data: Record<string, string | number | boolean>) {
  try {
    // Send to admin email or notification channel
    console.info(`🚨 Admin alert: ${type}`, data);
    // TODO: Implement admin alerting (email, Slack, etc.)
  } catch (error) {
    console.error('Failed to alert admin:', error);
  }
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    let event: Stripe.Event;

    try {
      event = verifyWebhookSignature(payload, signature);
    } catch (err: unknown) {
      console.error(
        'Webhook signature verification failed:',
        err instanceof Error ? err.message : err
      );
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.info(`🔔 Webhook received: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.created':
        await handleInvoiceCreated(event.data.object as Stripe.Invoice);
        break;

      default:
        console.info(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
