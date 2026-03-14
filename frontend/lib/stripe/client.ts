/**
 * Stripe Client Configuration
 * Frontend-only Stripe utilities
 */

import { loadStripe, Stripe } from '@stripe/stripe-js'

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

// ============================================
// TYPES
// ============================================

export type SubscriptionPlan = 'piccole' | 'medie' | 'enterprise'

export interface SubscriptionPrice {
  id: string
  plan: SubscriptionPlan
  name: string
  description: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  popular?: boolean
}

export interface SubscriptionDetails {
  id: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'trialing'
  plan: SubscriptionPlan
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  aiAddonActive: boolean
  aiAddonAmount?: number
}

export interface Invoice {
  id: string
  number: string
  amount: number
  currency: string
  status: 'paid' | 'open' | 'void' | 'uncollectible'
  created: string
  pdfUrl?: string
  lineItems: {
    description: string
    amount: number
  }[]
}

export interface PaymentMethod {
  id: string
  type: 'card' | 'sepa_debit'
  card?: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
}

export interface TenantBillingInfo {
  subscription: SubscriptionDetails | null
  invoices: Invoice[]
  paymentMethod: PaymentMethod | null
  usage: {
    inspectionsThisMonth: number
    aiCallsThisMonth: number
    storageUsed: number
  }
}

// ============================================
// PRICING CONFIGURATION
// ============================================

export const PRICING_CONFIG: Record<SubscriptionPlan, SubscriptionPrice> = {
  piccole: {
    id: process.env.NEXT_PUBLIC_STRIPE_PRICE_PICCOLE || 'price_piccole',
    plan: 'piccole',
    name: 'Piccole',
    description: 'Per officine con fino a 3 dipendenti',
    amount: 10000, // €100.00 in cents
    currency: 'eur',
    interval: 'month',
    features: [
      'Fino a 3 utenti',
      'Ispezioni illimitate',
      'Report base',
      'Supporto email',
      '1 officina',
    ],
  },
  medie: {
    id: process.env.NEXT_PUBLIC_STRIPE_PRICE_MEDIE || 'price_medie',
    plan: 'medie',
    name: 'Medie',
    description: 'Per officine in crescita',
    amount: 39090, // €390.90 in cents
    currency: 'eur',
    interval: 'month',
    features: [
      'Fino a 10 utenti',
      'Ispezioni illimitate',
      'Report avanzati',
      'Supporto prioritario',
      'Fino a 3 officine',
      'Integrazione garanzie',
    ],
    popular: true,
  },
  enterprise: {
    id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
    plan: 'enterprise',
    name: 'Enterprise',
    description: 'Per grandi officine e gruppi',
    amount: 99900, // €999.00 in cents
    currency: 'eur',
    interval: 'month',
    features: [
      'Utenti illimitati',
      'Ispezioni illimitate',
      'Report personalizzati',
      'Supporto dedicato 24/7',
      'Officine illimitate',
      'API access',
      'White label',
    ],
  },
}

export const AI_ADDON_PRICE = {
  id: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_ADDON || 'price_ai_addon',
  name: 'AI Add-on',
  description: 'Funzionalità AI avanzate',
  amount: 20000, // €200.00 in cents
  currency: 'eur',
  interval: 'month' as const,
}

// ============================================
// API CLIENT FUNCTIONS
// ============================================

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(params: {
  plan: SubscriptionPlan
  aiAddon?: boolean
  successUrl: string
  cancelUrl: string
}): Promise<{ sessionId: string; url: string }> {
  const response = await fetch('/api/stripe/checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create checkout session')
  }

  return response.json()
}

/**
 * Create a customer portal session
 */
export async function createPortalSession(returnUrl: string): Promise<{ url: string }> {
  const response = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnUrl }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create portal session')
  }

  return response.json()
}

/**
 * Get current billing information
 */
export async function getBillingInfo(): Promise<TenantBillingInfo> {
  const response = await fetch('/api/stripe/billing-info')

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch billing info')
  }

  return response.json()
}

/**
 * Update subscription plan
 */
export async function updateSubscription(plan: SubscriptionPlan): Promise<void> {
  const response = await fetch('/api/stripe/subscription', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to update subscription')
  }
}

/**
 * Toggle AI addon
 */
export async function toggleAiAddon(enabled: boolean): Promise<void> {
  const response = await fetch('/api/stripe/ai-addon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to toggle AI addon')
  }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(): Promise<void> {
  const response = await fetch('/api/stripe/subscription', {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to cancel subscription')
  }
}

/**
 * Resume canceled subscription
 */
export async function resumeSubscription(): Promise<void> {
  const response = await fetch('/api/stripe/subscription/resume', {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to resume subscription')
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

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
 * Get subscription status label (Italian)
 */
export function getSubscriptionStatusLabel(status: SubscriptionDetails['status']): string {
  const labels: Record<SubscriptionDetails['status'], string> = {
    active: 'Attivo',
    canceled: 'Cancellato',
    past_due: 'Pagamento in ritardo',
    unpaid: 'Non pagato',
    incomplete: 'Incompleto',
    trialing: 'Periodo di prova',
  }
  return labels[status] || status
}

/**
 * Get subscription status color
 */
export function getSubscriptionStatusColor(status: SubscriptionDetails['status']): string {
  const colors: Record<SubscriptionDetails['status'], string> = {
    active: 'bg-green-100 text-green-800',
    trialing: 'bg-blue-100 text-blue-800',
    canceled: 'bg-gray-100 text-gray-800',
    past_due: 'bg-yellow-100 text-yellow-800',
    unpaid: 'bg-red-100 text-red-800',
    incomplete: 'bg-orange-100 text-orange-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Calculate days until date
 */
export function daysUntil(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Get plan name
 */
export function getPlanName(plan: SubscriptionPlan): string {
  return PRICING_CONFIG[plan]?.name || plan
}

// ============================================
// ERROR HANDLING
// ============================================

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
function isStripeErrorLike(error: unknown): error is { message: string; code?: string; type?: string; decline_code?: string } {
  if (typeof error !== 'object' || error === null) return false
  if (!('message' in error)) return false
  const obj = error as Record<string, unknown>
  return typeof obj.message === 'string'
}

export function parseStripeError(error: unknown): StripeError {
  if (isStripeErrorLike(error)) {
    return new StripeError(
      error.message,
      error.code || 'unknown',
      error.type || 'api_error',
      error.decline_code
    )
  }
  return new StripeError(
    String(error),
    'unknown',
    'api_error'
  )
}
