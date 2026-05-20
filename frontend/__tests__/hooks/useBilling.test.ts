/**
 * Tests for useBilling hook (hooks/useBilling.ts)
 * Tests: fetch billingInfo, loading state, error state, refetch, subscribe, cancel.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useBilling } from '@/hooks/useBilling';

// =============================================================================
// Mocks
// =============================================================================
const mockFetch = jest.fn();
global.fetch = mockFetch;

const MOCK_BILLING_INFO = {
  tenantId: 'test-tenant',
  subscriptionStatus: 'ACTIVE',
  plan: 'PROFESSIONAL',
  currentPeriodEnd: '2026-06-01T00:00:00Z',
  aiAddonActive: false,
  paymentMethod: { brand: 'visa', last4: '4242' },
};

const mockCreateCheckoutSession = jest.fn();
const mockCreatePortalSession = jest.fn();
const mockToggleAiAddon = jest.fn();
const mockCancelSubscription = jest.fn();
const mockResumeSubscription = jest.fn();

jest.mock('@/lib/stripe/client', () => ({
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
  createPortalSession: (...args: unknown[]) => mockCreatePortalSession(...args),
  toggleAiAddon: (...args: unknown[]) => mockToggleAiAddon(...args),
  cancelSubscription: (...args: unknown[]) => mockCancelSubscription(...args),
  resumeSubscription: (...args: unknown[]) => mockResumeSubscription(...args),
}));

// =============================================================================
// Tests
// =============================================================================
describe('useBilling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts with isLoading=true and billingInfo=null', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_BILLING_INFO,
    });
    const { result } = renderHook(() => useBilling());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.billingInfo).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('loads billingInfo on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_BILLING_INFO,
    });
    const { result } = renderHook(() => useBilling());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.billingInfo).toEqual(MOCK_BILLING_INFO);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith('/api/stripe/billing-info');
  });

  it('sets error when fetch fails (non-ok response)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const { result } = renderHook(() => useBilling());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to fetch billing info');
    expect(result.current.billingInfo).toBeNull();
  });

  it('sets error when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useBilling());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Network error');
  });

  it('refetch reloads billingInfo', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_BILLING_INFO })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...MOCK_BILLING_INFO, plan: 'ENTERPRISE' }),
      });

    const { result } = renderHook(() => useBilling());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.billingInfo).toMatchObject({ plan: 'ENTERPRISE' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('subscribe calls createCheckoutSession with plan', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => MOCK_BILLING_INFO });
    mockCreateCheckoutSession.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/test' });

    const { result } = renderHook(() => useBilling());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.subscribe('PROFESSIONAL');
    });

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'PROFESSIONAL', aiAddon: false })
    );
  });

  it('managePayment calls createPortalSession', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => MOCK_BILLING_INFO });
    mockCreatePortalSession.mockResolvedValueOnce({ url: '' });

    const { result } = renderHook(() => useBilling());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.managePayment();
    });

    expect(mockCreatePortalSession).toHaveBeenCalledTimes(1);
  });

  it('toggleAi calls toggleAiAddon with enabled flag', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => MOCK_BILLING_INFO });
    mockToggleAiAddon.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useBilling());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleAi(true);
    });

    expect(mockToggleAiAddon).toHaveBeenCalledWith(true);
  });

  it('cancel calls cancelSubscription', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => MOCK_BILLING_INFO });
    mockCancelSubscription.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useBilling());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.cancel();
    });

    expect(mockCancelSubscription).toHaveBeenCalledTimes(1);
  });

  it('resume calls resumeSubscription', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => MOCK_BILLING_INFO });
    mockResumeSubscription.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useBilling());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.resume();
    });

    expect(mockResumeSubscription).toHaveBeenCalledTimes(1);
  });
});
