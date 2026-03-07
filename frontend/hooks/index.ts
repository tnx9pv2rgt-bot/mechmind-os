// Hooks Exports
export { useMemoryOptimization, useVirtualList, useDebouncedCallback, useThrottle } from './useMemoryOptimization'
export { useInView } from './useInView'
export { useAuth, AuthProvider } from './useAuth'

// Client-side safe hooks (prevent hydration mismatches)
export {
  useIsClient,
  useWindow,
  useNavigator,
  useLocalStorage,
  useSessionStorage,
  useDocument,
  useWindowSize,
  useLocalStorageState,
  useOnlineStatus,
  useReducedMotion,
  useIsTouchDevice,
} from './useIsClient'

// Re-export ClientOnly component from components
export { ClientOnly, ClientOnlyWrapper } from '@/components/ClientOnly'
