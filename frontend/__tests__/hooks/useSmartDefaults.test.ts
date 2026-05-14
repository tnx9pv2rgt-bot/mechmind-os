/**
 * Tests for useSmartDefaults hook (hooks/useSmartDefaults.ts)
 * Tests: device detection, geolocation, language, timezone.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSmartDefaults } from '@/hooks/useSmartDefaults';

// =============================================================================
// Mocks
// =============================================================================
const mockFetch = jest.fn();
global.fetch = mockFetch;

// =============================================================================
// Tests
// =============================================================================
describe('useSmartDefaults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns defaults object with all properties', () => {
    const { result } = renderHook(() => useSmartDefaults());

    expect(result.current).toHaveProperty('location');
    expect(result.current).toHaveProperty('deviceType');
    expect(result.current).toHaveProperty('language');
    expect(result.current).toHaveProperty('timezone');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
  });

  it('initializes with isLoading true', () => {
    const { result } = renderHook(() => useSmartDefaults());

    expect(result.current.isLoading).toBe(true);
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('detects mobile device from user agent', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
      configurable: true,
    });

    const { result } = renderHook(() => useSmartDefaults());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.deviceType).toBe('mobile');
  });

  it('detects tablet device from user agent', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X)',
      configurable: true,
    });

    const { result } = renderHook(() => useSmartDefaults());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.deviceType).toBe('tablet');
  });

  it('detects desktop device from user agent', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      configurable: true,
    });

    const { result } = renderHook(() => useSmartDefaults());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.deviceType).toBe('desktop');
  });

  it('uses default location when geolocation API fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSmartDefaults());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.location).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets error to null on successful load', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        country_name: 'Italy',
        country_code: 'IT',
      }),
    });

    const { result } = renderHook(() => useSmartDefaults());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
  });

  it('sets isLoading to false after initialization', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        country_name: 'Italy',
        country_code: 'IT',
      }),
    });

    const { result } = renderHook(() => useSmartDefaults());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
