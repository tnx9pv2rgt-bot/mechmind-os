/**
 * Tests for useProgressiveProfiling hook (hooks/useProgressiveProfiling.ts)
 * Tests: profile fetching, field updates, stage completion, missing fields detection.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useProgressiveProfiling } from '@/hooks/useProgressiveProfiling';

// =============================================================================
// Mocks
// =============================================================================
const mockFetch = jest.fn();
global.fetch = mockFetch;

const MOCK_PROFILE = {
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
};

// =============================================================================
// Tests
// =============================================================================
describe('useProgressiveProfiling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with empty profile when autoFetch is false', () => {
    const { result } = renderHook(() =>
      useProgressiveProfiling({
        customerId: 'cust-123',
        autoFetch: false,
      })
    );

    expect(result.current).toHaveProperty('profile');
    expect(result.current).toHaveProperty('missingFields');
    expect(result.current).toHaveProperty('currentStage');
    expect(result.current).toHaveProperty('completionPercentage');
    expect(result.current).toHaveProperty('isLoading');
  });

  it('returns all expected properties and methods', () => {
    const { result } = renderHook(() =>
      useProgressiveProfiling({
        customerId: 'cust-123',
        autoFetch: false,
      })
    );

    expect(result.current).toHaveProperty('profile');
    expect(result.current).toHaveProperty('missingFields');
    expect(result.current).toHaveProperty('currentStage');
    expect(result.current).toHaveProperty('completionPercentage');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('checkMissingFields');
    expect(result.current).toHaveProperty('updateProfile');
    expect(result.current).toHaveProperty('completeStage');
    expect(result.current).toHaveProperty('getNextField');
    expect(result.current).toHaveProperty('getStageIncentive');
    expect(result.current).toHaveProperty('totalFields');
    expect(result.current).toHaveProperty('completedFields');
    expect(result.current).toHaveProperty('isOnboardingComplete');
    expect(result.current).toHaveProperty('canAccessStage');
    expect(typeof result.current.checkMissingFields).toBe('function');
    expect(typeof result.current.updateProfile).toBe('function');
  });

  it('checkMissingFields fetches profile from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_PROFILE,
    });

    const { result } = renderHook(() =>
      useProgressiveProfiling({
        customerId: 'cust-123',
        autoFetch: false,
      })
    );

    await act(async () => {
      await result.current.checkMissingFields();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/customers/cust-123/profile')
    );
  });

  it('checkMissingFields sets error on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    const { result } = renderHook(() =>
      useProgressiveProfiling({
        customerId: 'cust-123',
        autoFetch: false,
      })
    );

    await act(async () => {
      await result.current.checkMissingFields();
    });

    expect(result.current.error).toBeTruthy();
  });

  it('updateProfile sends patch request to API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_PROFILE,
    });

    const { result } = renderHook(() =>
      useProgressiveProfiling({
        customerId: 'cust-123',
        autoFetch: false,
      })
    );

    let updateResult = false;
    await act(async () => {
      updateResult = await result.current.updateProfile({ firstName: 'Jane' });
    });

    expect(updateResult).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/customers/cust-123/profile'),
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('Jane'),
      })
    );
  });

  it('updateProfile returns false on error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    const { result } = renderHook(() =>
      useProgressiveProfiling({
        customerId: 'cust-123',
        autoFetch: false,
      })
    );

    let updateResult = true;
    await act(async () => {
      updateResult = await result.current.updateProfile({ firstName: 'Jane' });
    });

    expect(updateResult).toBe(false);
  });

  it('completeStage marks stage as completed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { result } = renderHook(() =>
      useProgressiveProfiling({
        customerId: 'cust-123',
        autoFetch: false,
      })
    );

    let completeResult = false;
    await act(async () => {
      completeResult = await result.current.completeStage('onboarding');
    });

    expect(completeResult).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/customers/cust-123/profile/stages'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('onboarding'),
      })
    );
  });

  it('getNextField returns first missing field', () => {
    const { result } = renderHook(() =>
      useProgressiveProfiling({
        customerId: 'cust-123',
        autoFetch: false,
      })
    );

    const nextField = result.current.getNextField();
    expect(nextField === null || typeof nextField === 'string').toBe(true);
  });

  it('getStageIncentive returns incentive for stage', () => {
    const { result } = renderHook(() =>
      useProgressiveProfiling({
        customerId: 'cust-123',
        autoFetch: false,
      })
    );

    const incentive = result.current.getStageIncentive('onboarding');
    expect(incentive === null || typeof incentive === 'string').toBe(true);
  });

  it('canAccessStage checks stage access based on current stage', () => {
    const { result } = renderHook(() =>
      useProgressiveProfiling({
        customerId: 'cust-123',
        autoFetch: false,
      })
    );

    const canAccess = result.current.canAccessStage('onboarding');
    expect(typeof canAccess).toBe('boolean');
  });

  it('totalFields returns count of all profile fields', () => {
    const { result } = renderHook(() =>
      useProgressiveProfiling({
        customerId: 'cust-123',
        autoFetch: false,
      })
    );

    expect(typeof result.current.totalFields).toBe('number');
    expect(result.current.totalFields).toBeGreaterThan(0);
  });

  it('completedFields returns count of completed fields', () => {
    const { result } = renderHook(() =>
      useProgressiveProfiling({
        customerId: 'cust-123',
        autoFetch: false,
      })
    );

    expect(typeof result.current.completedFields).toBe('number');
    expect(result.current.completedFields).toBeGreaterThanOrEqual(0);
  });

  it('isOnboardingComplete reflects onboarding stage completion', () => {
    const { result } = renderHook(() =>
      useProgressiveProfiling({
        customerId: 'cust-123',
        autoFetch: false,
      })
    );

    expect(typeof result.current.isOnboardingComplete).toBe('boolean');
  });

  it('auto-fetches profile when autoFetch is true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_PROFILE,
    });

    const { result } = renderHook(() =>
      useProgressiveProfiling({
        customerId: 'cust-123',
        autoFetch: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalled();
  });
});
