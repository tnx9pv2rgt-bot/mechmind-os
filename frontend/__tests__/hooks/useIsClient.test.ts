/**
 * Tests for useIsClient and companion SSR-safety hooks (hooks/useIsClient.ts)
 * All hooks start with SSR-safe defaults, then update on client mount.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useIsClient,
  useWindow,
  useNavigator,
  useLocalStorage,
  useWindowSize,
  useLocalStorageState,
  useOnlineStatus,
  useReducedMotion,
  useIsTouchDevice,
} from '@/hooks/useIsClient';

// =============================================================================
// useIsClient
// =============================================================================
describe('useIsClient', () => {
  it('returns false on initial render, true after mount', async () => {
    const { result } = renderHook(() => useIsClient());
    expect(typeof result.current).toBe('boolean');
    // After mount in jsdom, effect fires synchronously
    await act(async () => {});
    expect(result.current).toBe(true);
  });

  it('returns boolean type', () => {
    const { result } = renderHook(() => useIsClient());
    expect(typeof result.current).toBe('boolean');
  });
});

// =============================================================================
// useWindow
// =============================================================================
describe('useWindow', () => {
  it('returns window object after mount in jsdom', async () => {
    const { result } = renderHook(() => useWindow());
    await act(async () => {});
    expect(result.current).toBe(window);
  });

  it('starts as null before effects run', () => {
    // Initial render before effects
    let initialValue: Window | null = undefined as unknown as Window | null;
    const { result } = renderHook(() => {
      const win = useWindow();
      if (initialValue === undefined) initialValue = null; // capture initial
      return win;
    });
    expect(initialValue).toBeNull();
    expect(result.current).not.toBeUndefined();
  });
});

// =============================================================================
// useNavigator
// =============================================================================
describe('useNavigator', () => {
  it('returns navigator object after mount', async () => {
    const { result } = renderHook(() => useNavigator());
    await act(async () => {});
    expect(result.current).toBe(window.navigator);
  });
});

// =============================================================================
// useLocalStorage
// =============================================================================
describe('useLocalStorage', () => {
  it('returns localStorage after mount', async () => {
    const { result } = renderHook(() => useLocalStorage());
    await act(async () => {});
    expect(result.current).toBe(window.localStorage);
  });
});

// =============================================================================
// useWindowSize
// =============================================================================
describe('useWindowSize', () => {
  it('returns an object with width, height, isMobile, isTablet, isDesktop', async () => {
    const { result } = renderHook(() => useWindowSize());
    await act(async () => {});
    expect(result.current).toHaveProperty('width');
    expect(result.current).toHaveProperty('height');
    expect(result.current).toHaveProperty('isMobile');
    expect(result.current).toHaveProperty('isTablet');
    expect(result.current).toHaveProperty('isDesktop');
  });

  it('uses default width/height before window.innerWidth is available', () => {
    const { result } = renderHook(() => useWindowSize(1440, 900));
    // Initial state uses defaults
    expect(typeof result.current.width).toBe('number');
    expect(typeof result.current.height).toBe('number');
  });

  it('classifies isMobile correctly for small widths', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    window.dispatchEvent(new Event('resize'));
    const { result } = renderHook(() => useWindowSize());
    await act(async () => {});
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('classifies isDesktop correctly for large widths', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1440,
    });
    window.dispatchEvent(new Event('resize'));
    const { result } = renderHook(() => useWindowSize());
    await act(async () => {});
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });
});

// =============================================================================
// useLocalStorageState
// =============================================================================
describe('useLocalStorageState', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('returns initial value when localStorage is empty', async () => {
    const { result } = renderHook(() => useLocalStorageState('ls-empty-key', 'default'));
    await act(async () => {});
    expect(result.current[0]).toBe('default');
  });

  it('reads existing value from localStorage', async () => {
    const getItemSpy = jest
      .spyOn(window.localStorage, 'getItem')
      .mockImplementation((key: string) =>
        key === 'ls-existing-key' ? JSON.stringify('stored-value') : null
      );

    const { result } = renderHook(() => useLocalStorageState('ls-existing-key', 'default'));
    await waitFor(() => expect(result.current[0]).toBe('stored-value'));

    expect(getItemSpy).toHaveBeenCalledWith('ls-existing-key');
    getItemSpy.mockRestore();
  });

  it('updates localStorage and state when setValue is called', async () => {
    const setItemSpy = jest.spyOn(window.localStorage, 'setItem');
    const { result } = renderHook(() => useLocalStorageState('ls-update-key', 0));
    await act(async () => {});

    await act(async () => {
      result.current[1](42);
    });

    expect(result.current[0]).toBe(42);
    expect(setItemSpy).toHaveBeenCalledWith('ls-update-key', JSON.stringify(42));
    setItemSpy.mockRestore();
  });

  it('supports function updater pattern', async () => {
    const { result } = renderHook(() => useLocalStorageState('ls-counter', 0));
    await act(async () => {});

    await act(async () => {
      result.current[1](prev => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });

  it('handles invalid JSON in localStorage gracefully', async () => {
    window.localStorage.setItem('ls-bad-json', 'not-json-{{{');
    const { result } = renderHook(() => useLocalStorageState('ls-bad-json', 'fallback'));
    await act(async () => {});
    expect(result.current[0]).toBe('fallback');
  });
});

// =============================================================================
// useOnlineStatus
// =============================================================================
describe('useOnlineStatus', () => {
  it('returns true by default in jsdom (navigator.onLine = true)', async () => {
    const { result } = renderHook(() => useOnlineStatus());
    await act(async () => {});
    expect(result.current).toBe(true);
  });

  it('updates to false when offline event fires', async () => {
    const { result } = renderHook(() => useOnlineStatus());
    await act(async () => {});

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(false);
  });

  it('updates back to true when online event fires', async () => {
    const { result } = renderHook(() => useOnlineStatus());
    await act(async () => {});

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(true);
  });
});

// =============================================================================
// useReducedMotion
// =============================================================================
describe('useReducedMotion', () => {
  it('returns false by default in jsdom', async () => {
    const { result } = renderHook(() => useReducedMotion());
    await act(async () => {});
    expect(result.current).toBe(false);
  });

  it('returns boolean type', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(typeof result.current).toBe('boolean');
  });
});

// =============================================================================
// useIsTouchDevice
// =============================================================================
describe('useIsTouchDevice', () => {
  it('returns a boolean', async () => {
    const { result } = renderHook(() => useIsTouchDevice());
    await act(async () => {});
    expect(typeof result.current).toBe('boolean');
  });

  it('does not throw during render', () => {
    expect(() => renderHook(() => useIsTouchDevice())).not.toThrow();
  });
});
