/**
 * React Hook for Stripe Billing
 * Simplifies billing operations in components
 */

import { useState, useEffect, useCallback } from 'react'
import {
  TenantBillingInfo,
  SubscriptionPlan,
  createCheckoutSession,
  createPortalSession,
  toggleAiAddon,
  cancelSubscription,
  resumeSubscription,
} from '@/lib/stripe/client'

interface UseBillingReturn {
  billingInfo: TenantBillingInfo | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  subscribe: (plan: SubscriptionPlan, aiAddon?: boolean) => Promise<void>
  managePayment: () => Promise<void>
  toggleAi: (enabled: boolean) => Promise<void>
  cancel: () => Promise<void>
  resume: () => Promise<void>
}

export function useBilling(): UseBillingReturn {
  const [billingInfo, setBillingInfo] = useState<TenantBillingInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBillingInfo = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/stripe/billing-info')
      
      if (!response.ok) {
        throw new Error('Failed to fetch billing info')
      }
      
      const data = await response.json()
      setBillingInfo(data)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Billing hook error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBillingInfo()
  }, [fetchBillingInfo])

  const subscribe = useCallback(async (plan: SubscriptionPlan, aiAddon: boolean = false) => {
    const { url } = await createCheckoutSession({
      plan,
      aiAddon,
      successUrl: `${window.location.origin}/billing/success`,
      cancelUrl: `${window.location.origin}/billing/cancel`,
    })
    window.location.href = url
  }, [])

  const managePayment = useCallback(async () => {
    const { url } = await createPortalSession(`${window.location.origin}/dashboard/billing`)
    window.location.href = url
  }, [])

  const toggleAi = useCallback(async (enabled: boolean) => {
    await toggleAiAddon(enabled)
    await fetchBillingInfo()
  }, [fetchBillingInfo])

  const cancel = useCallback(async () => {
    await cancelSubscription()
    await fetchBillingInfo()
  }, [fetchBillingInfo])

  const resume = useCallback(async () => {
    await resumeSubscription()
    await fetchBillingInfo()
  }, [fetchBillingInfo])

  return {
    billingInfo,
    isLoading,
    error,
    refetch: fetchBillingInfo,
    subscribe,
    managePayment,
    toggleAi,
    cancel,
    resume,
  }
}
