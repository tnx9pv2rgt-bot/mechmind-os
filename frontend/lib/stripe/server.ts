/**
 * Stripe Server Configuration
 * Backend-only Stripe utilities - DO NOT IMPORT IN CLIENT COMPONENTS
 */

import Stripe from 'stripe'

// Initialize Stripe with secret key (or dummy key for build time)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

// Use dummy key during build if not set (runtime will fail appropriately)
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'
const effectiveKey = stripeSecretKey || (isBuildTime ? 'sk_test_dummy' : '')

if (!stripeSecretKey && !isBuildTime) {
  console.warn('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(effectiveKey || 'sk_test_dummy', {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

// Webhook secret for verifying events
export const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

// ============================================
// PRICE IDs (from environment or defaults)
// ============================================

export const STRIPE_PRICE_IDS = {
  piccole: process.env.STRIPE_PRICE_PICCOLE || 'price_piccole',
  medie: process.env.STRIPE_PRICE_MEDIE || 'price_medie',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
  aiAddon: process.env.STRIPE_PRICE_AI_ADDON || 'price_ai_addon',
}

// Plan to price ID mapping
export const PLAN_TO_PRICE_ID: Record<string, string> = {
  piccole: STRIPE_PRICE_IDS.piccole,
  medie: STRIPE_PRICE_IDS.medie,
  enterprise: STRIPE_PRICE_IDS.enterprise,
}

// Price ID to plan mapping
export const PRICE_ID_TO_PLAN: Record<string, string> = {
  [STRIPE_PRICE_IDS.piccole]: 'piccole',
  [STRIPE_PRICE_IDS.medie]: 'medie',
  [STRIPE_PRICE_IDS.enterprise]: 'enterprise',
}

// ============================================
// CUSTOMER MANAGEMENT
// ============================================

/**
 * Create a new Stripe customer
 */
export async function createCustomer(params: {
  email: string
  name?: string
  tenantId: string
  metadata?: Record<string, string>
}): Promise<Stripe.Customer> {
  const { email, name, tenantId, metadata = {} } = params

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      tenantId,
      ...metadata,
    },
  })

  return customer
}

/**
 * Get or create customer for tenant
 */
export async function getOrCreateCustomer(params: {
  tenantId: string
  email: string
  name?: string
  stripeCustomerId?: string | null
}): Promise<Stripe.Customer> {
  const { tenantId, email, name, stripeCustomerId } = params

  // If we already have a customer ID, try to retrieve it
  if (stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId)
      if (!customer.deleted) {
        return customer as Stripe.Customer
      }
    } catch (error) {
      console.log('Customer not found, creating new one')
    }
  }

  // Create new customer
  return createCustomer({
    email,
    name,
    tenantId,
  })
}

/**
 * Update customer
 */
export async function updateCustomer(
  customerId: string,
  params: Stripe.CustomerUpdateParams
): Promise<Stripe.Customer> {
  return stripe.customers.update(customerId, params)
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Create a subscription
 */
export async function createSubscription(params: {
  customerId: string
  plan: string
  aiAddon?: boolean
  trialDays?: number
}): Promise<Stripe.Subscription> {
  const { customerId, plan, aiAddon = false, trialDays = 0 } = params

  const priceId = PLAN_TO_PRICE_ID[plan]
  if (!priceId) {
    throw new Error(`Invalid plan: ${plan}`)
  }

  const items: Stripe.SubscriptionCreateParams.Item[] = [
    { price: priceId },
  ]

  // Add AI addon if requested
  if (aiAddon) {
    items.push({ price: STRIPE_PRICE_IDS.aiAddon })
  }

  const subscriptionData: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items,
    metadata: {
      plan,
      aiAddon: aiAddon ? 'true' : 'false',
    },
    automatic_tax: {
      enabled: true,
    },
    collection_method: 'charge_automatically',
  }

  // Add trial if specified
  if (trialDays > 0) {
    subscriptionData.trial_period_days = trialDays
  }

  return stripe.subscriptions.create(subscriptionData)
}

/**
 * Update subscription to new plan
 */
export async function updateSubscription(
  subscriptionId: string,
  newPlan: string
): Promise<Stripe.Subscription> {
  const priceId = PLAN_TO_PRICE_ID[newPlan]
  if (!priceId) {
    throw new Error(`Invalid plan: ${newPlan}`)
  }

  // Get current subscription
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Find the main subscription item (not AI addon)
  const mainItem = subscription.items.data.find(
    (item) => !item.price.id.includes('ai_addon')
  )

  if (!mainItem) {
    throw new Error('Main subscription item not found')
  }

  // Update subscription
  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: mainItem.id,
        price: priceId,
      },
    ],
    metadata: {
      plan: newPlan,
    },
    proration_behavior: 'create_prorations',
  })
}

/**
 * Toggle AI addon on subscription
 */
export async function toggleAiAddon(
  subscriptionId: string,
  enabled: boolean
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Check if AI addon already exists
  const aiItem = subscription.items.data.find(
    (item) => item.price.id === STRIPE_PRICE_IDS.aiAddon
  )

  if (enabled && !aiItem) {
    // Add AI addon
    return stripe.subscriptions.update(subscriptionId, {
      items: [
        ...subscription.items.data.map((item) => ({ id: item.id })),
        { price: STRIPE_PRICE_IDS.aiAddon },
      ],
      metadata: {
        ...subscription.metadata,
        aiAddon: 'true',
      },
      proration_behavior: 'create_prorations',
    })
  } else if (!enabled && aiItem) {
    // Remove AI addon
    return stripe.subscriptions.update(subscriptionId, {
      items: subscription.items.data
        .filter((item) => item.id !== aiItem.id)
        .map((item) => ({ id: item.id })),
      metadata: {
        ...subscription.metadata,
        aiAddon: 'false',
      },
      proration_behavior: 'create_prorations',
    })
  }

  return subscription
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}

/**
 * Resume canceled subscription
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method'],
  })
}

// ============================================
// CHECKOUT SESSION
// ============================================

export interface CheckoutSessionParams {
  customerId: string
  plan: string
  aiAddon?: boolean
  successUrl: string
  cancelUrl: string
  tenantId: string
  mode?: 'subscription' | 'setup'
}

/**
 * Create a checkout session
 */
export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<Stripe.Checkout.Session> {
  const {
    customerId,
    plan,
    aiAddon = false,
    successUrl,
    cancelUrl,
    tenantId,
    mode = 'subscription',
  } = params

  const priceId = PLAN_TO_PRICE_ID[plan]
  if (!priceId && mode === 'subscription') {
    throw new Error(`Invalid plan: ${plan}`)
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

  if (mode === 'subscription') {
    lineItems.push({
      price: priceId,
      quantity: 1,
    })

    if (aiAddon) {
      lineItems.push({
        price: STRIPE_PRICE_IDS.aiAddon,
        quantity: 1,
      })
    }
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      tenantId,
      plan,
      aiAddon: aiAddon ? 'true' : 'false',
    },
    automatic_tax: {
      enabled: true,
    },
    customer_update: {
      address: 'auto',
    },
    billing_address_collection: 'required',
    ...(mode === 'subscription' && { line_items: lineItems }),
  }

  // For setup mode, configure subscription data
  if (mode === 'setup') {
    sessionParams.subscription_data = {
      metadata: {
        tenantId,
        plan,
      },
    }
  }

  return stripe.checkout.sessions.create(sessionParams)
}

// ============================================
// CUSTOMER PORTAL
// ============================================

/**
 * Create a billing portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
    configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID,
  })
}

// ============================================
// INVOICE MANAGEMENT
// ============================================

/**
 * Get customer invoices
 */
export async function getInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  })

  return invoices.data
}

/**
 * Get upcoming invoice
 */
export async function getUpcomingInvoice(
  customerId: string,
  subscriptionId?: string
): Promise<Stripe.UpcomingInvoice | null> {
  try {
    const params: Stripe.InvoiceRetrieveUpcomingParams = {
      customer: customerId,
    }
    if (subscriptionId) {
      params.subscription = subscriptionId
    }
    return await stripe.invoices.retrieveUpcoming(params)
  } catch (error) {
    // No upcoming invoice
    return null
  }
}

// ============================================
// WEBHOOK HANDLING
// ============================================

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

/**
 * Get event from webhook
 */
export async function constructEventFromPayload(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  return verifyWebhookSignature(payload, signature)
}

// ============================================
// PAYMENT METHOD MANAGEMENT
// ============================================

/**
 * Get customer's default payment method
 */
export async function getDefaultPaymentMethod(
  customerId: string
): Promise<Stripe.PaymentMethod | null> {
  const customer = await stripe.customers.retrieve(customerId)
  
  if (customer.deleted || !customer.invoice_settings?.default_payment_method) {
    return null
  }

  const paymentMethodId = customer.invoice_settings.default_payment_method as string
  return stripe.paymentMethods.retrieve(paymentMethodId)
}

/**
 * List customer payment methods
 */
export async function listPaymentMethods(
  customerId: string,
  type: Stripe.PaymentMethodListParams.Type = 'card'
): Promise<Stripe.PaymentMethod[]> {
  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type,
  })

  return methods.data
}

// ============================================
// ERROR HANDLING
// ============================================

export class StripeServerError extends Error {
  constructor(
    message: string,
    public code?: string,
    public stripeError?: Stripe.StripeError
  ) {
    super(message)
    this.name = 'StripeServerError'
  }
}

/**
 * Handle Stripe errors
 */
export function handleStripeError(error: any): StripeServerError {
  if (error instanceof Stripe.errors.StripeError) {
    return new StripeServerError(
      error.message,
      error.code,
      error
    )
  }

  return new StripeServerError(
    error.message || 'Unknown error occurred',
    'unknown_error'
  )
}

// ============================================
// TYPES
// ============================================

export type WebhookEventType =
  | 'checkout.session.completed'
  | 'checkout.session.async_payment_failed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.created'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'invoice.upcoming'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
