/**
 * useIsClient Hook
 * 
 * Returns true if the component is mounted on the client.
 * Use this to guard client-only code and prevent hydration mismatches.
 * 
 * @example
 * const isClient = useIsClient();
 * 
 * return (
 *   <div>
 *     {isClient ? <ClientOnlyComponent /> : <ServerFallback />}
 *   </div>
 * );
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to detect if code is running on the client
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

/**
 * Hook to safely access window object
 * Returns null during SSR, window object on client
 */
export function useWindow(): Window | null {
  const [win, setWin] = useState<Window | null>(null);

  useEffect(() => {
    setWin(window);
  }, []);

  return win;
}

/**
 * Hook to safely access navigator object
 * Returns null during SSR, navigator object on client
 */
export function useNavigator(): Navigator | null {
  const [navigator, setNavigator] = useState<Navigator | null>(null);

  useEffect(() => {
    setNavigator(window.navigator);
  }, []);

  return navigator;
}

/**
 * Hook to safely access localStorage
 * Returns null during SSR, localStorage on client
 */
export function useLocalStorage(): Storage | null {
  const [storage, setStorage] = useState<Storage | null>(null);

  useEffect(() => {
    setStorage(window.localStorage);
  }, []);

  return storage;
}

/**
 * Hook to safely access sessionStorage
 * Returns null during SSR, sessionStorage on client
 */
export function useSessionStorage(): Storage | null {
  const [storage, setStorage] = useState<Storage | null>(null);

  useEffect(() => {
    setStorage(window.sessionStorage);
  }, []);

  return storage;
}

/**
 * Hook to safely access document
 * Returns null during SSR, document on client
 */
export function useDocument(): Document | null {
  const [doc, setDoc] = useState<Document | null>(null);

  useEffect(() => {
    setDoc(document);
  }, []);

  return doc;
}

/**
 * Hook to get window dimensions with SSR safety
 */
interface WindowDimensions {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function useWindowSize(defaultWidth = 1024, defaultHeight = 768): WindowDimensions {
  const [dimensions, setDimensions] = useState<WindowDimensions>({
    width: defaultWidth,
    height: defaultHeight,
    isMobile: defaultWidth < 640,
    isTablet: defaultWidth >= 640 && defaultWidth < 1025,
    isDesktop: defaultWidth >= 1025,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDimensions({
        width,
        height,
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1025,
        isDesktop: width >= 1025,
      });
    };

    // Set initial size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return dimensions;
}

/**
 * Hook to safely use localStorage with state synchronization
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    setIsInitialized(true);
  }, [key]);

  // Update localStorage when state changes
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
        return valueToStore;
      });
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}

/**
 * Hook to detect online/offline status
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook to detect reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to detect touch device
 */
export function useIsTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  return isTouchDevice;
}

export default useIsClient;
