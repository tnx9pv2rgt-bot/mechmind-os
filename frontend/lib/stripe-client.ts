import { loadStripe, Stripe } from '@stripe/stripe-js'
import { useState } from 'react'

// Stripe configuration
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

// Stripe instance cache
let stripePromise: Promise<Stripe | null> | null = null

/**
 * Initialize and get Stripe instance
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY || '')
  }
  return stripePromise
}

/**
 * Reset Stripe instance (useful for testing)
 */
export function resetStripe(): void {
  stripePromise = null
}

// Types for Stripe Connect and payments
export interface StripeAccount {
  id: string
  email: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  requirements: {
    currentlyDue: string[]
    eventuallyDue: string[]
    pastDue: string[]
    disabledReason?: string
  }
  settings?: {
    branding?: {
      icon?: string
      logo?: string
      primaryColor?: string
    }
    dashboard?: {
      displayName?: string
      timezone?: string
    }
  }
}

export interface PaymentIntent {
  id: string
  clientSecret: string
  amount: number
  currency: string
  status: PaymentIntentStatus
  customerId?: string
  invoiceId?: string
  metadata?: Record<string, string>
}

export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'canceled'
  | 'succeeded'

export interface PaymentMethod {
  id: string
  type: 'card' | 'sepa_debit' | 'ideal' | 'bancontact' | string
  card?: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
    country: string
    funding: 'credit' | 'debit' | 'prepaid' | 'unknown'
  }
  billingDetails?: {
    name?: string
    email?: string
    phone?: string
    address?: {
      city?: string
      country?: string
      line1?: string
      line2?: string
      postalCode?: string
      state?: string
    }
  }
}

export interface Refund {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'succeeded' | 'failed' | 'canceled'
  paymentIntentId: string
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | string
  createdAt: string
}

export interface WebhookEvent {
  id: string
  type: WebhookEventType
  data: {
    object: any
  }
  created: number
}

export type WebhookEventType =
  | 'payment_intent.created'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.canceled'
  | 'charge.succeeded'
  | 'charge.failed'
  | 'charge.refunded'
  | 'charge.dispute.created'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'account.updated'
  | 'account.application.authorized'
  | 'account.application.deauthorized'
  | 'payout.created'
  | 'payout.paid'
  | 'payout.failed'

// Stripe Connect types
export interface ConnectAccount {
  id: string
  type: 'standard' | 'express' | 'custom'
  email: string
  country: string
  businessType?: 'individual' | 'company'
  capabilities: {
    cardPayments?: 'active' | 'inactive' | 'pending'
    transfers?: 'active' | 'inactive' | 'pending'
  }
  requirements: {
    currentlyDue: string[]
    eventuallyDue: string[]
    pastDue: string[]
    disabledReason?: string
    currentDeadline?: number
  }
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  created: number
}

export interface Transfer {
  id: string
  amount: number
  currency: string
  destination: string
  sourceTransaction?: string
  status: 'paid' | 'pending' | 'in_transit' | 'canceled' | 'failed'
  created: number
}

// API Client functions

/**
 * Create a payment intent
 */
export async function createPaymentIntent(params: {
  amount: number
  currency?: string
  customerId?: string
  invoiceId?: string
  metadata?: Record<string, string>
}): Promise<PaymentIntent> {
  const response = await fetch('/api/stripe/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create payment intent')
  }

  return response.json()
}

/**
 * Confirm a payment intent on the client side
 */
export async function confirmPayment(
  stripe: Stripe,
  clientSecret: string,
  paymentMethod: {
    card?: any
    billingDetails?: PaymentMethod['billingDetails']
  }
): Promise<{ error?: any; paymentIntent?: any }> {
  return stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: paymentMethod.card,
      billing_details: paymentMethod.billingDetails,
    },
  })
}

/**
 * Create a refund
 */
export async function createRefund(params: {
  paymentIntentId: string
  amount?: number
  reason?: string
}): Promise<Refund> {
  const response = await fetch('/api/stripe/create-refund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create refund')
  }

  return response.json()
}

/**
 * Get payment intent status
 */
export async function getPaymentIntentStatus(paymentIntentId: string): Promise<PaymentIntent> {
  const response = await fetch(`/api/stripe/payment-intents/${paymentIntentId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to get payment intent')
  }

  return response.json()
}

// Stripe Connect functions

/**
 * Create a Connect account
 */
export async function createConnectAccount(params: {
  type: 'standard' | 'express' | 'custom'
  email: string
  country: string
  businessType?: 'individual' | 'company'
}): Promise<ConnectAccount> {
  const response = await fetch('/api/stripe/connect/create-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create Connect account')
  }

  return response.json()
}

/**
 * Create an account link for onboarding
 */
export async function createAccountLink(accountId: string): Promise<{ url: string }> {
  const response = await fetch('/api/stripe/connect/create-account-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountId,
      refreshUrl: `${window.location.origin}/dashboard/invoices/connect/refresh`,
      returnUrl: `${window.location.origin}/dashboard/invoices/connect/success`,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create account link')
  }

  return response.json()
}

/**
 * Get Connect account details
 */
export async function getConnectAccount(accountId: string): Promise<ConnectAccount> {
  const response = await fetch(`/api/stripe/connect/accounts/${accountId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to get Connect account')
  }

  return response.json()
}

/**
 * Create a transfer to a connected account
 */
export async function createTransfer(params: {
  amount: number
  currency?: string
  destination: string
  sourceTransaction?: string
}): Promise<Transfer> {
  const response = await fetch('/api/stripe/connect/create-transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create transfer')
  }

  return response.json()
}

// Webhook handlers

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): WebhookEvent {
  // In production: use Stripe's library to verify
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
  // return stripe.webhooks.constructEvent(payload, signature, secret)
  
  // For client-side, verification should happen on the server
  throw new Error('Webhook verification must be done on the server')
}

/**
 * Handle webhook event
 */
export function handleWebhookEvent(event: WebhookEvent): {
  type: string
  data: any
  action?: string
} {
  const handlers: Record<string, (data: any) => { action: string; data: any }> = {
    'payment_intent.succeeded': (data) => ({
      action: 'mark_invoice_paid',
      data: {
        paymentIntentId: data.id,
        amount: data.amount,
        invoiceId: data.metadata?.invoiceId,
      },
    }),
    'payment_intent.payment_failed': (data) => ({
      action: 'mark_payment_failed',
      data: {
        paymentIntentId: data.id,
        invoiceId: data.metadata?.invoiceId,
        error: data.last_payment_error,
      },
    }),
    'charge.refunded': (data) => ({
      action: 'process_refund',
      data: {
        chargeId: data.id,
        amount: data.amount_refunded,
        paymentIntentId: data.payment_intent,
      },
    }),
    'invoice.payment_succeeded': (data) => ({
      action: 'process_subscription_payment',
      data: {
        invoiceId: data.id,
        subscriptionId: data.subscription,
        amount: data.amount_paid,
      },
    }),
    'account.updated': (data) => ({
      action: 'update_connect_account',
      data: {
        accountId: data.id,
        chargesEnabled: data.charges_enabled,
        payoutsEnabled: data.payouts_enabled,
        requirements: data.requirements,
      },
    }),
  }

  const handler = handlers[event.type]
  if (handler) {
    return {
      type: event.type,
      ...handler(event.data.object),
    }
  }

  return {
    type: event.type,
    data: event.data.object,
  }
}

// Utility functions

/**
 * Format amount for display (Stripe uses cents)
 */
export function formatStripeAmount(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

/**
 * Convert amount to Stripe format (cents)
 */
export function toStripeAmount(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Convert amount from Stripe format
 */
export function fromStripeAmount(amount: number): number {
  return amount / 100
}

/**
 * Get payment status color
 */
export function getPaymentStatusColor(status: PaymentIntentStatus): string {
  const colors: Record<PaymentIntentStatus, string> = {
    requires_payment_method: 'bg-yellow-100 text-yellow-800',
    requires_confirmation: 'bg-blue-100 text-blue-800',
    requires_action: 'bg-orange-100 text-orange-800',
    processing: 'bg-purple-100 text-purple-800',
    requires_capture: 'bg-indigo-100 text-indigo-800',
    canceled: 'bg-red-100 text-red-800',
    succeeded: 'bg-green-100 text-green-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Get payment status label (Italian)
 */
export function getPaymentStatusLabel(status: PaymentIntentStatus): string {
  const labels: Record<PaymentIntentStatus, string> = {
    requires_payment_method: 'Metodo di pagamento richiesto',
    requires_confirmation: 'Richiede conferma',
    requires_action: 'Azione richiesta',
    processing: 'In elaborazione',
    requires_capture: 'Richiede addebito',
    canceled: 'Annullato',
    succeeded: 'Completato',
  }
  return labels[status] || status
}

// React Hook for Stripe payments
export function useStripePayment() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processPayment = async ({
    amount,
    invoiceId,
    customerId,
  }: {
    amount: number
    invoiceId: string
    customerId?: string
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      // Create payment intent
      const paymentIntent = await createPaymentIntent({
        amount: toStripeAmount(amount),
        invoiceId,
        customerId,
      })

      return paymentIntent
    } catch (err: any) {
      setError(err.message || 'Payment failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const processRefund = async ({
    paymentIntentId,
    amount,
    reason,
  }: {
    paymentIntentId: string
    amount?: number
    reason?: string
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const refund = await createRefund({
        paymentIntentId,
        amount: amount ? toStripeAmount(amount) : undefined,
        reason,
      })

      return refund
    } catch (err: any) {
      setError(err.message || 'Refund failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    error,
    processPayment,
    processRefund,
  }
}

// Error handling
export class StripeError extends Error {
  constructor(
    message: string,
    public code: string,
    public type: string,
    public declineCode?: string
  ) {
    super(message)
    this.name = 'StripeError'
  }
}

/**
 * Parse Stripe error
 */
export function parseStripeError(error: any): StripeError {
  return new StripeError(
    error.message || 'An unknown error occurred',
    error.code || 'unknown',
    error.type || 'api_error',
    error.decline_code
  )
}
