/**
 * Tests for useSubscription hook (hooks/useSubscription.tsx)
 * Tests: subscription context provider, feature access, limits checking, upgrade.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useSubscription,
  useFeatureAccess,
  usePricing,
  usePlanLimits,
  SubscriptionProvider,
} from '@/hooks/useSubscription';

// =============================================================================
// Mocks
// =============================================================================
const mockGetCurrentSubscription = jest.fn(() =>
  Promise.resolve({
    plan: 'PROFESSIONAL',
    status: 'ACTIVE',
    currentPeriodEnd: new Date().toISOString(),
  })
);

const mockGetUsageStats = jest.fn(() =>
  Promise.resolve({
    users: 5,
    locations: 2,
    customers: 150,
  })
);

const mockCheckFeatureAccess = jest.fn((feature: string) =>
  Promise.resolve({ allowed: true, feature })
);

const mockGetLimits = jest.fn(() =>
  Promise.resolve({
    users: { withinLimit: true, current: 5, limit: 10, remaining: 5, percentageUsed: 50 },
    locations: { withinLimit: true, current: 2, limit: 5, remaining: 3, percentageUsed: 40 },
    apiCalls: {
      withinLimit: true,
      current: 1000,
      limit: 10000,
      remaining: 9000,
      percentageUsed: 10,
    },
    storage: { withinLimit: true, current: 100, limit: 500, remaining: 400, percentageUsed: 20 },
    customers: { withinLimit: true, current: 150, limit: 1000, remaining: 850, percentageUsed: 15 },
  })
);

const mockGetPricing = jest.fn(() =>
  Promise.resolve({
    plans: [
      { id: 'STARTER', name: 'Starter', monthlyPrice: 29, yearlyPrice: 290 },
      { id: 'PROFESSIONAL', name: 'Professional', monthlyPrice: 99, yearlyPrice: 990 },
    ],
    aiAddon: { name: 'AI Analysis', monthlyPrice: 49, yearlyPrice: 490 },
  })
);

const mockUpgradeSubscription = jest.fn(() => Promise.resolve());

jest.mock('@/lib/subscription/service', () => ({
  __esModule: true,
  default: {
    getCurrentSubscription: () => mockGetCurrentSubscription(),
    getUsageStats: () => mockGetUsageStats(),
    checkFeatureAccess: (feature: string) => mockCheckFeatureAccess(feature),
    getLimits: () => mockGetLimits(),
    getPricing: () => mockGetPricing(),
    upgradeSubscription: (plan: string, cycle: string, aiAddon?: boolean) =>
      mockUpgradeSubscription(plan, cycle, aiAddon),
  },
}));

// =============================================================================
// Tests
// =============================================================================
const MOCK_SUBSCRIPTION = {
  plan: 'PROFESSIONAL',
  status: 'ACTIVE',
  currentPeriodEnd: new Date().toISOString(),
};
const MOCK_USAGE = { users: 5, locations: 2, customers: 150 };

function resetMocks() {
  // clearAllMocks azzera le chiamate ma non le implementazioni:
  // re-impostiamo con mockResolvedValue per garantire dati stabili in ogni test
  mockGetCurrentSubscription.mockResolvedValue(MOCK_SUBSCRIPTION);
  mockGetUsageStats.mockResolvedValue(MOCK_USAGE);
  mockCheckFeatureAccess.mockResolvedValue({ allowed: true });
  mockGetLimits.mockResolvedValue({
    users: { withinLimit: true, current: 5, limit: 10, remaining: 5, percentageUsed: 50 },
    locations: { withinLimit: true, current: 2, limit: 5, remaining: 3, percentageUsed: 40 },
    apiCalls: {
      withinLimit: true,
      current: 1000,
      limit: 10000,
      remaining: 9000,
      percentageUsed: 10,
    },
    storage: { withinLimit: true, current: 100, limit: 500, remaining: 400, percentageUsed: 20 },
    customers: { withinLimit: true, current: 150, limit: 1000, remaining: 850, percentageUsed: 15 },
  });
  mockGetPricing.mockResolvedValue({
    plans: [
      { id: 'STARTER', name: 'Starter', monthlyPrice: 29, yearlyPrice: 290 },
      { id: 'PROFESSIONAL', name: 'Professional', monthlyPrice: 99, yearlyPrice: 990 },
    ],
    aiAddon: { name: 'AI Analysis', monthlyPrice: 49, yearlyPrice: 490 },
  });
  mockUpgradeSubscription.mockResolvedValue(undefined);
}

describe('useSubscription hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMocks();
  });

  it('throws error when used outside SubscriptionProvider', () => {
    // Suppress error logs for this test
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      renderHook(() => useSubscription());
    }).toThrow('useSubscription must be used within SubscriptionProvider');

    consoleError.mockRestore();
  });

  it('provides subscription data when inside provider', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SubscriptionProvider>{children}</SubscriptionProvider>
    );

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current).toHaveProperty('subscription');
    expect(result.current).toHaveProperty('usage');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refresh');
    expect(result.current).toHaveProperty('canAccessFeature');
    expect(result.current).toHaveProperty('checkLimit');
    expect(result.current).toHaveProperty('upgrade');
  });

  it('loads subscription and usage data on mount', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SubscriptionProvider>{children}</SubscriptionProvider>
    );

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscription).toBeTruthy();
    expect(result.current.usage).toBeTruthy();
  });

  it('canAccessFeature checks feature access', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SubscriptionProvider>{children}</SubscriptionProvider>
    );

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let hasAccess = false;
    await act(async () => {
      hasAccess = await result.current.canAccessFeature('PREMIUM');
    });

    expect(typeof hasAccess).toBe('boolean');
    expect(mockCheckFeatureAccess).toHaveBeenCalledWith('PREMIUM');
  });

  it('checkLimit returns resource limits', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SubscriptionProvider>{children}</SubscriptionProvider>
    );

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let limitData = null;
    await act(async () => {
      limitData = await result.current.checkLimit('users');
    });

    expect(limitData).toMatchObject({
      withinLimit: expect.any(Boolean),
      current: expect.any(Number),
      limit: expect.any(Number),
      remaining: expect.any(Number),
    });
  });

  it('upgrade calls upgradeSubscription with plan', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SubscriptionProvider>{children}</SubscriptionProvider>
    );

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.upgrade('PROFESSIONAL', 'monthly', true);
    });

    expect(mockUpgradeSubscription).toHaveBeenCalledWith('PROFESSIONAL', 'monthly', true);
  });

  it('refresh reloads subscription data', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SubscriptionProvider>{children}</SubscriptionProvider>
    );

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const callCountBefore = mockGetCurrentSubscription.mock.calls.length;

    await act(async () => {
      await result.current.refresh();
    });

    const callCountAfter = mockGetCurrentSubscription.mock.calls.length;
    expect(callCountAfter).toBeGreaterThan(callCountBefore);
  });
});

describe('useFeatureAccess hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMocks();
  });

  it('checks feature access asynchronously', async () => {
    const { result } = renderHook(() => useFeatureAccess('PREMIUM'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current).toHaveProperty('hasAccess');
    expect(typeof result.current.hasAccess).toBe('boolean');
  });

  it('returns error when feature check fails', async () => {
    mockCheckFeatureAccess.mockRejectedValueOnce(new Error('Check failed'));

    const { result } = renderHook(() => useFeatureAccess('UNKNOWN'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.hasAccess).toBe(false);
  });
});

describe('usePricing hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMocks();
  });

  it('fetches pricing data on mount', async () => {
    const { result } = renderHook(() => usePricing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pricing).toBeTruthy();
    expect(result.current.pricing?.plans).toBeDefined();
    expect(result.current.pricing?.aiAddon).toBeDefined();
  });

  it('returns error when pricing fetch fails', async () => {
    mockGetPricing.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePricing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});

describe('usePlanLimits hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMocks();
  });

  it('fetches plan limits on mount', async () => {
    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.limits).toBeTruthy();
    expect(result.current.limits?.users).toBeDefined();
    expect(result.current.limits?.customers).toBeDefined();
  });

  it('provides refresh method to reload limits', async () => {
    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.limits).toBeDefined();
    expect(result.current.limits?.users).toBeDefined();
  });
});
