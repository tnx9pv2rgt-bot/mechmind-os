/**
 * USE SUBSCRIPTION HOOK
 * 
 * React hook for managing subscription state and feature access
 */

'use client';

import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { SubscriptionPlan, FeatureFlag, SubscriptionStatus } from '@prisma/client';
import subscriptionService, { 
  SubscriptionData, 
  UsageStats, 
  PricingPlan,
  FeatureAccessResponse,
} from '@/lib/subscription/service';

// ==========================================
// CONTEXT
// ==========================================

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  usage: UsageStats | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  canAccessFeature: (feature: FeatureFlag) => Promise<boolean>;
  checkLimit: (resourceType: 'users' | 'locations' | 'customers') => Promise<{
    withinLimit: boolean;
    current: number;
    limit: number | null;
    remaining: number;
  }>;
  upgrade: (plan: SubscriptionPlan, billingCycle: 'monthly' | 'yearly', aiAddon?: boolean) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [subData, usageData] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getUsageStats(),
      ]);
      
      setSubscription(subData);
      setUsage(usageData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const canAccessFeature = useCallback(async (feature: FeatureFlag): Promise<boolean> => {
    try {
      const result = await subscriptionService.checkFeatureAccess(feature);
      return result.allowed;
    } catch {
      return false;
    }
  }, []);

  const checkLimit = useCallback(async (resourceType: 'users' | 'locations' | 'customers') => {
    const limits = await subscriptionService.getLimits();
    const limitData = resourceType === 'users' ? limits.users :
                      resourceType === 'locations' ? limits.locations :
                      limits.customers;
    
    return {
      withinLimit: limitData.withinLimit,
      current: limitData.current,
      limit: limitData.limit,
      remaining: limitData.remaining,
    };
  }, []);

  const upgrade = useCallback(async (
    plan: SubscriptionPlan,
    billingCycle: 'monthly' | 'yearly',
    aiAddon?: boolean
  ) => {
    await subscriptionService.upgradeSubscription(plan, billingCycle, aiAddon);
    await fetchData();
  }, [fetchData]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        usage,
        isLoading,
        error,
        refresh: fetchData,
        canAccessFeature,
        checkLimit,
        upgrade,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// ==========================================
// HOOK
// ==========================================

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}

// ==========================================
// INDIVIDUAL HOOKS
// ==========================================

export function useFeatureAccess(feature: FeatureFlag) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      try {
        setIsLoading(true);
        const result = await subscriptionService.checkFeatureAccess(feature);
        if (!cancelled) {
          setHasAccess(result.allowed);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setHasAccess(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [feature]);

  return { hasAccess, isLoading, error };
}

export function usePricing() {
  const [pricing, setPricing] = useState<{ plans: PricingPlan[]; aiAddon: { name: string; monthlyPrice: number; yearlyPrice: number } } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPricing() {
      try {
        setIsLoading(true);
        const data = await subscriptionService.getPricing();
        setPricing(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchPricing();
  }, []);

  return { pricing, isLoading, error };
}

export function usePlanLimits() {
  const [limits, setLimits] = useState<{
    users: { withinLimit: boolean; current: number; limit: number | null; percentageUsed: number };
    locations: { withinLimit: boolean; current: number; limit: number | null; percentageUsed: number };
    apiCalls: { withinLimit: boolean; current: number; limit: number | null; percentageUsed: number };
    storage: { withinLimit: boolean; current: number; limit: number | null; percentageUsed: number };
    customers: { withinLimit: boolean; current: number; limit: number | null; percentageUsed: number };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await subscriptionService.getLimits();
      setLimits({
        users: data.users,
        locations: data.locations,
        apiCalls: data.apiCalls,
        storage: data.storage,
        customers: data.customers,
      });
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { limits, isLoading, refresh };
}
