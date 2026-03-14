/**
 * SUBSCRIPTION SERVICE - FRONTEND
 * 
 * Client-side subscription management and API calls
 */

// Local type definitions to avoid @prisma/client import in client-side code
type SubscriptionPlan = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
type FeatureFlag = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'AI_ANALYSIS' | 'UNLIMITED_USERS' | 'API_ACCESS' | 'PRIORITY_SUPPORT';
type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';

export interface SubscriptionData {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  aiAddonEnabled: boolean;
  features: string[];
  limits: {
    maxUsers: number | null;
    maxLocations: number | null;
    maxApiCallsPerMonth: number | null;
    maxStorageBytes: number | null;
  };
  stripe: {
    customerId?: string;
    subscriptionId?: string;
    paymentMethodRequired: boolean;
  };
}

export interface UsageStats {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  aiAddonEnabled: boolean;
  period: {
    start: string;
    end: string;
    daysRemaining: number;
  };
  usage: {
    users: { current: number; limit: number | null; percentage: number };
    locations: { current: number; limit: number | null; percentage: number };
    apiCalls: { current: number; limit: number | null; percentage: number };
    storage: { current: number; limit: number | null; percentage: number };
    customers: { current: number; limit: number | null; percentage: number };
    inspections: { current: number; limit: number | null; percentage: number };
  };
}

export interface PricingPlan {
  id: SubscriptionPlan;
  name: string;
  nameIt: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyDiscountPercent: number;
  monthlyPriceFormatted: string;
  yearlyPriceFormatted: string;
  isCustomPricing: boolean;
}

export interface FeatureAccessResponse {
  allowed: boolean;
  reason?: string;
  requiredPlan?: SubscriptionPlan;
  requiresAiAddon?: boolean;
}

const API_BASE = '/api';

class SubscriptionService {
  // ==========================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================

  async getCurrentSubscription(): Promise<SubscriptionData> {
    const response = await fetch(`${API_BASE}/subscription/current`);
    if (!response.ok) throw new Error('Failed to fetch subscription');
    return response.json();
  }

  async getUsageStats(): Promise<UsageStats> {
    const response = await fetch(`${API_BASE}/subscription/usage`);
    if (!response.ok) throw new Error('Failed to fetch usage stats');
    return response.json();
  }

  async getLimits(): Promise<{
    users: { withinLimit: boolean; current: number; limit: number | null; remaining: number; percentageUsed: number };
    locations: { withinLimit: boolean; current: number; limit: number | null; remaining: number; percentageUsed: number };
    apiCalls: { withinLimit: boolean; current: number; limit: number | null; remaining: number; percentageUsed: number };
    storage: { withinLimit: boolean; current: number; limit: number | null; remaining: number; percentageUsed: number };
    customers: { withinLimit: boolean; current: number; limit: number | null; remaining: number; percentageUsed: number };
    inspections: { withinLimit: boolean; current: number; limit: number | null; remaining: number; percentageUsed: number };
  }> {
    const response = await fetch(`${API_BASE}/subscription/limits`);
    if (!response.ok) throw new Error('Failed to fetch limits');
    return response.json();
  }

  // ==========================================
  // FEATURE ACCESS
  // ==========================================

  async checkFeatureAccess(feature: FeatureFlag): Promise<FeatureAccessResponse> {
    const response = await fetch(`${API_BASE}/subscription/features/${feature}`);
    if (!response.ok) throw new Error('Failed to check feature access');
    return response.json();
  }

  async checkMultipleFeatures(features: FeatureFlag[]): Promise<Record<FeatureFlag, FeatureAccessResponse>> {
    const response = await fetch(`${API_BASE}/subscription/features/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
    });
    if (!response.ok) throw new Error('Failed to check features');
    return response.json();
  }

  // ==========================================
  // UPGRADE / DOWNGRADE
  // ==========================================

  async upgradeSubscription(
    newPlan: SubscriptionPlan,
    billingCycle: 'monthly' | 'yearly',
    aiAddon?: boolean
  ): Promise<{ subscription: SubscriptionData; proratedAmount: number; immediate: boolean }> {
    const response = await fetch(`${API_BASE}/subscription/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPlan, billingCycle, aiAddon }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upgrade subscription');
    }
    return response.json();
  }

  async downgradeSubscription(newPlan: SubscriptionPlan): Promise<{ subscription: SubscriptionData; effectiveDate: string }> {
    const response = await fetch(`${API_BASE}/subscription/downgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPlan }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to downgrade subscription');
    }
    return response.json();
  }

  // ==========================================
  // AI ADD-ON
  // ==========================================

  async toggleAiAddon(enabled: boolean): Promise<SubscriptionData> {
    const response = await fetch(`${API_BASE}/subscription/ai-addon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (!response.ok) throw new Error('Failed to toggle AI addon');
    return response.json();
  }

  // ==========================================
  // CANCELLATION
  // ==========================================

  async cancelSubscription(immediate: boolean = false): Promise<{ subscription: SubscriptionData; dataRetentionDate: string }> {
    const response = await fetch(`${API_BASE}/subscription/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ immediate }),
    });
    if (!response.ok) throw new Error('Failed to cancel subscription');
    return response.json();
  }

  async reactivateSubscription(): Promise<SubscriptionData> {
    const response = await fetch(`${API_BASE}/subscription/reactivate`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to reactivate subscription');
    return response.json();
  }

  // ==========================================
  // STRIPE CHECKOUT
  // ==========================================

  async createCheckoutSession(
    plan: SubscriptionPlan,
    billingCycle: 'monthly' | 'yearly',
    aiAddon: boolean,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    const response = await fetch(`${API_BASE}/subscription/checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, billingCycle, aiAddon, successUrl, cancelUrl }),
    });
    if (!response.ok) throw new Error('Failed to create checkout session');
    return response.json();
  }

  // ==========================================
  // PRICING INFORMATION
  // ==========================================

  async getPricing(): Promise<{ plans: PricingPlan[]; aiAddon: { name: string; monthlyPrice: number; yearlyPrice: number; monthlyPriceFormatted: string; yearlyPriceFormatted: string } }> {
    const response = await fetch(`${API_BASE}/subscription/pricing`);
    if (!response.ok) throw new Error('Failed to fetch pricing');
    return response.json();
  }

  async getPlanFeatures(plan: SubscriptionPlan): Promise<{ plan: SubscriptionPlan; features: FeatureFlag[] }> {
    const response = await fetch(`${API_BASE}/subscription/pricing/${plan}/features`);
    if (!response.ok) throw new Error('Failed to fetch plan features');
    return response.json();
  }

  async comparePlans(): Promise<{ comparison: Array<{ plan: SubscriptionPlan; name: string; nameIt: string; price: { monthly: string; yearly: string }; features: FeatureFlag[] }> }> {
    const response = await fetch(`${API_BASE}/subscription/pricing/compare`);
    if (!response.ok) throw new Error('Failed to compare plans');
    return response.json();
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
