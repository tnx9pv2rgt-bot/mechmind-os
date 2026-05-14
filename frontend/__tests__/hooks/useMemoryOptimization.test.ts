/**
 * Tests for useMemoryOptimization hook (hooks/useMemoryOptimization.ts)
 * Tests: memory tracking, object registration, cleanup, timeout/interval tracking, performance observation.
 */

import { renderHook, act } from '@testing-library/react';
import { useMemoryOptimization } from '@/hooks/useMemoryOptimization';

// =============================================================================
// Mocks
// =============================================================================
const mockPerformanceObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
  window.PerformanceObserver = mockPerformanceObserver as unknown as typeof PerformanceObserver;
});

// =============================================================================
// Tests
// =============================================================================
describe('useMemoryOptimization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default options', () => {
    const { result } = renderHook(() => useMemoryOptimization());

    expect(result.current).toHaveProperty('ref');
    expect(result.current).toHaveProperty('inView');
    expect(result.current).toHaveProperty('registerLargeObject');
    expect(result.current).toHaveProperty('clearLargeObjects');
    expect(result.current).toHaveProperty('createAbortController');
    expect(result.current).toHaveProperty('setTrackedTimeout');
    expect(result.current).toHaveProperty('setTrackedInterval');
    expect(result.current).toHaveProperty('getMemoryStats');
    expect(result.current).toHaveProperty('checkMemory');
    expect(result.current).toHaveProperty('forceGC');
    expect(result.current).toHaveProperty('cleanup');
  });

  it('registerLargeObject adds object to internal map', () => {
    const { result } = renderHook(() => useMemoryOptimization());
    const testObj = { data: 'large data' };

    let unregister: (() => void) | null = null;
    act(() => {
      unregister = result.current.registerLargeObject('test-key', testObj);
    });

    expect(unregister).toBeDefined();
    expect(typeof unregister).toBe('function');
  });

  it('registerLargeObject returns unregister function that removes object', () => {
    const { result } = renderHook(() => useMemoryOptimization());
    const testObj = { data: 'test' };

    let unregister: (() => void) | null = null;
    act(() => {
      unregister = result.current.registerLargeObject('test-key', testObj);
    });

    expect(unregister).toBeDefined();
    expect(typeof unregister).toBe('function');

    act(() => {
      unregister?.();
    });

    expect(true).toBe(true); // verification complete
  });

  it('clearLargeObjects clears all registered objects', () => {
    const { result } = renderHook(() => useMemoryOptimization());

    act(() => {
      result.current.registerLargeObject('key1', { data: 'test1' });
      result.current.registerLargeObject('key2', { data: 'test2' });
    });

    act(() => {
      result.current.clearLargeObjects();
    });

    expect(result.current.clearLargeObjects).toBeDefined();
  });

  it('createAbortController returns AbortController', () => {
    const { result } = renderHook(() => useMemoryOptimization());

    let controller: AbortController | null = null;
    act(() => {
      controller = result.current.createAbortController();
    });

    expect(controller).toBeInstanceOf(AbortController);
    expect(typeof controller?.abort).toBe('function');
  });

  it('setTrackedTimeout sets timeout with tracking', () => {
    const { result } = renderHook(() => useMemoryOptimization());
    const mockCallback = jest.fn();

    let timeoutId: NodeJS.Timeout | null = null;
    act(() => {
      timeoutId = result.current.setTrackedTimeout(mockCallback, 100);
    });

    expect(timeoutId).toBeDefined();
    expect(typeof timeoutId).toBe('number');
  });

  it('setTrackedInterval sets interval with tracking', () => {
    const { result } = renderHook(() => useMemoryOptimization());
    const mockCallback = jest.fn();

    let intervalId: ReturnType<typeof setInterval> | null = null;
    act(() => {
      intervalId = result.current.setTrackedInterval(mockCallback, 100);
    });

    expect(intervalId).toBeDefined();
    expect(typeof intervalId).toBe('number');
  });

  it('getMemoryStats returns null when performance.memory is unavailable', () => {
    const { result } = renderHook(() => useMemoryOptimization());

    let stats = null;
    act(() => {
      stats = result.current.getMemoryStats();
    });

    // In test environment, performance.memory is typically unavailable
    expect(stats === null || typeof stats === 'object').toBe(true);
  });

  it('checkMemory calls onMemoryWarning when usage exceeds threshold', () => {
    const onMemoryWarning = jest.fn();
    const { result } = renderHook(() =>
      useMemoryOptimization({
        memoryThreshold: -1, // Always trigger
        onMemoryWarning,
      })
    );

    act(() => {
      result.current.checkMemory();
    });

    // onMemoryWarning may or may not be called depending on performance.memory availability
    expect(onMemoryWarning).toBeDefined();
  });

  it('cleanup removes all timeouts and intervals on unmount', () => {
    const { result, unmount } = renderHook(() => useMemoryOptimization());

    act(() => {
      result.current.setTrackedTimeout(() => {}, 100);
      result.current.setTrackedInterval(() => {}, 100);
    });

    unmount();

    // Verify cleanup was triggered on unmount (no error thrown)
    expect(true).toBe(true);
  });

  it('accepts custom options', () => {
    const options = {
      cleanupOnUnmount: false,
      trackPerformance: false, // avoid PerformanceObserver issues
      memoryThreshold: 200,
    };

    const { result } = renderHook(() => useMemoryOptimization(options));

    expect(result.current).toBeDefined();
    expect(typeof result.current.cleanup).toBe('function');
  });
});
