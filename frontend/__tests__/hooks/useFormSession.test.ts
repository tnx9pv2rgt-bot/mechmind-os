/**
 * Tests for useFormSession hook (hooks/useFormSession.ts)
 * Tests: sessionStorage persistence, data loading, saving, clearing.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useFormSession } from '@/hooks/useFormSession';

// =============================================================================
// Mocks
// =============================================================================
const STORAGE_KEY = 'customer_form_data';

// =============================================================================
// Tests
// =============================================================================
describe('useFormSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('initializes with empty formData when no stored data', async () => {
    const { result } = renderHook(() => useFormSession());
    await act(async () => {});
    expect(result.current.formData).toEqual({});
  });

  it('sets isLoaded to true after mount', async () => {
    const { result } = renderHook(() => useFormSession());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.formData).toEqual({});
  });

  it('loads formData from sessionStorage on mount', () => {
    const testData = { name: 'John', email: 'john@example.com' };
    const payload = {
      step: 1,
      data: testData,
      timestamp: Date.now(),
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    const { result } = renderHook(() => useFormSession());

    act(() => {});

    expect(result.current.formData).toEqual(testData);
  });

  it('ignores expired data (> 24 hours old)', () => {
    const testData = { name: 'John' };
    const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
    const payload = {
      step: 1,
      data: testData,
      timestamp: oldTimestamp,
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    const { result } = renderHook(() => useFormSession());

    act(() => {});

    expect(result.current.formData).toEqual({});
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps valid data (< 24 hours old)', () => {
    const testData = { name: 'Jane' };
    const recentTimestamp = Date.now() - 12 * 60 * 60 * 1000; // 12 hours ago
    const payload = {
      step: 1,
      data: testData,
      timestamp: recentTimestamp,
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    const { result } = renderHook(() => useFormSession());

    act(() => {});

    expect(result.current.formData).toEqual(testData);
  });

  it('saveStep merges and persists data', () => {
    const { result } = renderHook(() => useFormSession());

    act(() => {
      result.current.saveStep(1, { name: 'Alice' });
    });

    expect(result.current.formData).toEqual({ name: 'Alice' });

    const saved = sessionStorage.getItem(STORAGE_KEY);
    expect(saved).toBeDefined();
    const parsed = JSON.parse(saved!);
    expect(parsed.data).toEqual({ name: 'Alice' });
    expect(parsed.step).toBe(1);
  });

  it('saveStep merges with existing data', () => {
    const { result } = renderHook(() => useFormSession());

    act(() => {
      result.current.saveStep(1, { name: 'Bob' });
    });

    act(() => {
      result.current.saveStep(2, { email: 'bob@example.com' });
    });

    expect(result.current.formData).toEqual({
      name: 'Bob',
      email: 'bob@example.com',
    });
  });

  it('getStepData retrieves only specified fields', () => {
    const { result } = renderHook(() => useFormSession());

    act(() => {
      result.current.saveStep(1, { name: 'Charlie', email: 'charlie@example.com', phone: '123' });
    });

    const stepData = result.current.getStepData(['name', 'email']);

    expect(stepData).toEqual({ name: 'Charlie', email: 'charlie@example.com' });
    expect(stepData.phone).toBeUndefined();
  });

  it('getStepData skips undefined fields', () => {
    const { result } = renderHook(() => useFormSession());

    act(() => {
      result.current.saveStep(1, { name: 'Diana' });
    });

    const stepData = result.current.getStepData(['name', 'email', 'phone']);

    expect(stepData).toEqual({ name: 'Diana' });
    expect(Object.keys(stepData).length).toBe(1);
  });

  it('clearForm removes data and resets state', () => {
    const { result } = renderHook(() => useFormSession());

    act(() => {
      result.current.saveStep(1, { name: 'Eve' });
    });

    expect(result.current.formData).toEqual({ name: 'Eve' });

    act(() => {
      result.current.clearForm();
    });

    expect(result.current.formData).toEqual({});
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('handles invalid JSON in sessionStorage gracefully', () => {
    sessionStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');

    const { result } = renderHook(() => useFormSession());

    act(() => {});

    expect(result.current.formData).toEqual({});
    expect(result.current.isLoaded).toBe(true);
  });

  it('returns object with all expected methods', () => {
    const { result } = renderHook(() => useFormSession());

    expect(result.current).toHaveProperty('formData');
    expect(result.current).toHaveProperty('isLoaded');
    expect(result.current).toHaveProperty('saveStep');
    expect(result.current).toHaveProperty('getStepData');
    expect(result.current).toHaveProperty('clearForm');
    expect(typeof result.current.saveStep).toBe('function');
    expect(typeof result.current.getStepData).toBe('function');
    expect(typeof result.current.clearForm).toBe('function');
  });
});
