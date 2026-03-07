'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  isConditionalMediationAvailable,
  registerPasskey,
  authenticateWithPasskey,
  authenticateWithConditionalPasskey,
  getPasskeyBrowserInfo,
  fetchRegistrationChallenge,
  fetchAuthenticationChallenge,
  savePasskeyToServer,
  verifyPasskeyWithServer,
  deletePasskey,
  fetchUserPasskeys,
  getPasskeyErrorMessage,
  type PasskeyBrowserInfo,
  type PasskeyRegistrationData,
  type PasskeyAuthenticationData,
} from '@/lib/auth/webauthn'

// ============================================
// TYPES
// ============================================

export interface UsePasskeyOptions {
  onSuccess?: (data: { token?: string; user?: unknown }) => void
  onError?: (error: string) => void
  onRegisterSuccess?: () => void
}

export interface PasskeyState {
  isSupported: boolean
  isPlatformAvailable: boolean
  isLoading: boolean
  isRegistering: boolean
  isAuthenticating: boolean
  error: string | null
  browserInfo: PasskeyBrowserInfo | null
  userPasskeys: Array<{
    id: string
    credentialId: string
    deviceName: string
    createdAt: string
    lastUsedAt?: string
  }>
}

export interface PasskeyActions {
  // Registration
  register: (userId: string, email: string, deviceName?: string) => Promise<boolean>
  
  // Authentication
  authenticate: () => Promise<boolean>
  authenticateConditional: () => Promise<boolean>
  
  // Management
  deletePasskey: (credentialId: string) => Promise<boolean>
  refreshPasskeys: () => Promise<void>
  
  // State
  clearError: () => void
}

// ============================================
// HOOK
// ============================================

export function usePasskey(options: UsePasskeyOptions = {}): PasskeyState & PasskeyActions {
  const { onSuccess, onError, onRegisterSuccess } = options

  // State
  const [isSupported, setIsSupported] = useState(false)
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [browserInfo, setBrowserInfo] = useState<PasskeyBrowserInfo | null>(null)
  const [userPasskeys, setUserPasskeys] = useState<PasskeyState['userPasskeys']>([])

  // Refs per evitare richieste multiple
  const isCheckingSupport = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    if (isCheckingSupport.current) return
    isCheckingSupport.current = true

    const checkSupport = async () => {
      const supported = isWebAuthnSupported()
      setIsSupported(supported)

      if (supported) {
        const platformAvailable = await isPlatformAuthenticatorAvailable()
        setIsPlatformAvailable(platformAvailable)

        const info = await getPasskeyBrowserInfo()
        setBrowserInfo(info)
      }
    }

    checkSupport()
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // ============================================
  // ERROR HANDLER
  // ============================================

  const handleError = useCallback((err: unknown) => {
    const message = getPasskeyErrorMessage(err)
    setError(message)
    onError?.(message)
    return false
  }, [onError])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // ============================================
  // REGISTRATION
  // ============================================

  const register = useCallback(async (
    userId: string,
    email: string,
    deviceName?: string
  ): Promise<boolean> => {
    if (!isSupported) {
      return handleError(new Error('WebAuthn not supported'))
    }

    setIsRegistering(true)
    setIsLoading(true)
    setError(null)

    // Crea nuovo abort controller
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    try {
      // 1. Fetch challenge from server
      const challenge = await fetchRegistrationChallenge()

      // 2. Create credential
      const registrationData = await registerPasskey({
        userId,
        email,
        challenge,
      })

      // 3. Save to server
      await savePasskeyToServer(registrationData, {
        deviceName: deviceName || getDefaultDeviceName(),
        platform: browserInfo?.platform || 'unknown',
      })

      // 4. Refresh passkey list
      await refreshPasskeys()

      onRegisterSuccess?.()
      return true
    } catch (err) {
      return handleError(err)
    } finally {
      setIsRegistering(false)
      setIsLoading(false)
    }
  }, [isSupported, browserInfo, onRegisterSuccess, handleError])

  // ============================================
  // AUTHENTICATION
  // ============================================

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return handleError(new Error('WebAuthn not supported'))
    }

    setIsAuthenticating(true)
    setIsLoading(true)
    setError(null)

    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    try {
      // 1. Fetch challenge from server
      const challenge = await fetchAuthenticationChallenge()

      // 2. Get credential
      const authData = await authenticateWithPasskey({ challenge })

      // 3. Verify with server
      const result = await verifyPasskeyWithServer(authData)

      if (result.success) {
        onSuccess?.({ token: result.token, user: result.user })
        return true
      } else {
        throw new Error('Authentication verification failed')
      }
    } catch (err) {
      return handleError(err)
    } finally {
      setIsAuthenticating(false)
      setIsLoading(false)
    }
  }, [isSupported, onSuccess, handleError])

  // ============================================
  // CONDITIONAL AUTHENTICATION (AUTOFILL)
  // ============================================

  const authenticateConditional = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    const isAvailable = await isConditionalMediationAvailable()
    if (!isAvailable) return false

    setIsLoading(true)

    try {
      // Note: conditional requests don't need a challenge upfront
      // The server should be ready to handle the response
      const challenge = await fetchAuthenticationChallenge()
      
      const authData = await authenticateWithConditionalPasskey(challenge)

      if (!authData) return false

      const result = await verifyPasskeyWithServer(authData)

      if (result.success) {
        onSuccess?.({ token: result.token, user: result.user })
        return true
      }
      return false
    } catch (err) {
      // Conditional auth fails silently, don't show error
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, onSuccess])

  // ============================================
  // MANAGEMENT
  // ============================================

  const refreshPasskeys = useCallback(async () => {
    try {
      const passkeys = await fetchUserPasskeys()
      setUserPasskeys(passkeys)
    } catch (err) {
      console.error('Failed to fetch passkeys:', err)
    }
  }, [])

  const deleteUserPasskey = useCallback(async (credentialId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      await deletePasskey(credentialId)
      await refreshPasskeys()
      return true
    } catch (err) {
      return handleError(err)
    } finally {
      setIsLoading(false)
    }
  }, [refreshPasskeys, handleError])

  // ============================================
  // UTILS
  // ============================================

  const getDefaultDeviceName = (): string => {
    const platform = browserInfo?.platform || 'unknown'
    const date = new Date().toLocaleDateString('it-IT', {
      month: 'short',
      day: 'numeric',
    })
    
    const platformNames: Record<string, string> = {
      ios: 'iPhone',
      android: 'Android',
      macos: 'Mac',
      windows: 'Windows PC',
      unknown: 'Dispositivo',
    }

    return `${platformNames[platform]} (${date})`
  }

  return {
    // State
    isSupported,
    isPlatformAvailable,
    isLoading,
    isRegistering,
    isAuthenticating,
    error,
    browserInfo,
    userPasskeys,

    // Actions
    register,
    authenticate,
    authenticateConditional,
    deletePasskey: deleteUserPasskey,
    refreshPasskeys,
    clearError,
  }
}

// ============================================
// ADDITIONAL HOOKS
// ============================================

/**
 * Hook per il form di autenticazione con passkey condizionale
 * Usato per input autofill
 */
export function useConditionalPasskey(
  onSuccess: (data: { token?: string; user?: unknown }) => void
) {
  const [isAvailable, setIsAvailable] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    isConditionalMediationAvailable().then(setIsAvailable)
  }, [])

  useEffect(() => {
    if (!isAvailable || !inputRef.current) return

    let mounted = true

    const startConditional = async () => {
      try {
        const challenge = await fetchAuthenticationChallenge()
        const authData = await authenticateWithConditionalPasskey(challenge)

        if (!mounted || !authData) return

        const result = await verifyPasskeyWithServer(authData)

        if (result.success) {
          onSuccess({ token: result.token, user: result.user })
        }
      } catch {
        // Fail silently
      }
    }

    startConditional()

    return () => {
      mounted = false
    }
  }, [isAvailable, onSuccess])

  return {
    inputRef,
    isAvailable,
    autoComplete: isAvailable ? 'webauthn' as const : 'email' as const,
  }
}

/**
 * Hook per verificare il supporto passkey
 */
export function usePasskeySupport() {
  const [support, setSupport] = useState({
    isSupported: false,
    isPlatformAvailable: false,
    isConditionalAvailable: false,
    isLoading: true,
  })

  useEffect(() => {
    const check = async () => {
      const isSupported = !!window.PublicKeyCredential
      const isPlatformAvailable = isSupported 
        ? await isPlatformAuthenticatorAvailable()
        : false
      const isConditionalAvailable = isSupported
        ? await isConditionalMediationAvailable()
        : false

      setSupport({
        isSupported,
        isPlatformAvailable,
        isConditionalAvailable,
        isLoading: false,
      })
    }

    check()
  }, [])

  return support
}

export default usePasskey
