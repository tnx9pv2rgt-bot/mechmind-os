/**
 * Stripe Module - Barrel Export
 * 
 * Client-side exports (safe for browser):
 * - All types, constants, and client functions
 * 
 * Server-side exports (Node.js only):
 * - All server functions from './server'
 * - Database services from './grace-period'
 */

// Client-side exports
export * from './client'

// Types
export type {
  SubscriptionPlan,
  SubscriptionPrice,
  SubscriptionDetails,
  Invoice,
  PaymentMethod,
  TenantBillingInfo,
} from './client'

// Re-export server modules with explicit paths
// These should only be imported in server contexts (API routes, server components)

// Example usage:
// Client component: import { createCheckoutSession, PRICING_CONFIG } from '@/lib/stripe'
// API route: import { stripe, createCustomer } from '@/lib/stripe/server'
// Grace period service: import { startGracePeriod } from '@/lib/stripe/grace-period'
