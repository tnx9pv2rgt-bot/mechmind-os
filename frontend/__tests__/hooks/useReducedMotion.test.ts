/**
 * Tests for useReducedMotion hook (hooks/useReducedMotion.ts)
 * Tests: system preference detection, manual override, localStorage persistence.
 */

import { renderHook, act } from '@testing-library/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// =============================================================================
// Mocks
// =============================================================================
const mockMatchMedia = jest.fn();

beforeEach(() => {
  window.matchMedia = mockMatchMedia;
  window.localStorage.clear();
  jest.clearAllMocks();
});

// =============================================================================
// Tests
// =============================================================================
describe('useReducedMotion', () => {
  beforeEach(() => {
    // setup.ts mocks localStorage.getItem as jest.fn() returning undefined by default.
    // undefined !== null so the hook would call setManualOverride — reset to null to simulate empty storage.
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
  });

  it('returns all expected properties', () => {
    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toHaveProperty('prefersReducedMotion');
    expect(result.current).toHaveProperty('isManuallySet');
    expect(result.current).toHaveProperty('enable');
    expect(result.current).toHaveProperty('disable');
    expect(result.current).toHaveProperty('toggle');
    expect(result.current).toHaveProperty('reset');
  });

  it('initializes with system preference (false by default in jsdom)', () => {
    mockMatchMedia.mockReturnValueOnce({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current.prefersReducedMotion).toBe(false);
    expect(result.current.isManuallySet).toBe(false);
  });

  it('detects system preference for reduced motion', () => {
    mockMatchMedia.mockReturnValueOnce({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current.prefersReducedMotion).toBe(true);
  });

  it('enable sets reduced motion to true', () => {
    const { result } = renderHook(() => useReducedMotion());

    expect(result.current.prefersReducedMotion).toBe(false);

    act(() => {
      result.current.enable();
    });

    expect(result.current.prefersReducedMotion).toBe(true);
    expect(result.current.isManuallySet).toBe(true);
  });

  it('disable sets reduced motion to false', () => {
    mockMatchMedia.mockReturnValueOnce({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current.prefersReducedMotion).toBe(true);

    act(() => {
      result.current.disable();
    });

    expect(result.current.prefersReducedMotion).toBe(false);
    expect(result.current.isManuallySet).toBe(true);
  });

  it('toggle switches reduced motion state', () => {
    const { result } = renderHook(() => useReducedMotion());

    expect(result.current.prefersReducedMotion).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.prefersReducedMotion).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.prefersReducedMotion).toBe(false);
  });

  it('reset clears manual override and returns to system preference', () => {
    const { result } = renderHook(() => useReducedMotion());

    act(() => {
      result.current.enable();
    });

    expect(result.current.isManuallySet).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isManuallySet).toBe(false);
  });

  it('persists preference to localStorage when persist is true', () => {
    const { result } = renderHook(() => useReducedMotion({ persist: true }));

    act(() => {
      result.current.enable();
    });

    expect(window.localStorage.setItem).toHaveBeenCalledWith('a11y_reduced_motion', 'true');
    expect(result.current.prefersReducedMotion).toBe(true);
  });

  it('does not persist when persist is false', () => {
    const { result } = renderHook(() => useReducedMotion({ persist: false }));

    act(() => {
      result.current.enable();
    });

    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(result.current.prefersReducedMotion).toBe(true);
  });

  it('motionClass is motion-reduce when reduced', () => {
    const { result } = renderHook(() => useReducedMotion());

    act(() => {
      result.current.enable();
    });

    expect(result.current.motionClass).toBe('motion-reduce');
  });

  it('motionClass is motion-safe when not reduced', () => {
    const { result } = renderHook(() => useReducedMotion());

    act(() => {
      result.current.disable();
    });

    expect(result.current.motionClass).toBe('motion-safe');
  });

  it('applies data-reduced-motion attribute to document', () => {
    const { result } = renderHook(() => useReducedMotion());

    act(() => {
      result.current.enable();
    });

    expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('true');
  });

  it('removes data-reduced-motion attribute when disabled', () => {
    const { result } = renderHook(() => useReducedMotion());

    act(() => {
      result.current.enable();
    });

    expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('true');

    act(() => {
      result.current.disable();
    });

    expect(document.documentElement.getAttribute('data-reduced-motion')).toBeNull();
  });
});
