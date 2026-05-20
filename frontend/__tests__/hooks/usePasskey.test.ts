/**
 * Tests for usePasskey Hook (hooks/usePasskey.ts)
 *
 * @module __tests__/hooks/usePasskey.test
 */

import { renderHook, act, waitFor } from '@testing-library/react'

// =========================================================================
// Mocks
// =========================================================================

const mockIsWebAuthnSupported = jest.fn()
const mockIsPlatformAuthenticatorAvailable = jest.fn()
const mockIsConditionalMediationAvailable = jest.fn()
const mockRegisterPasskey = jest.fn()
const mockAuthenticateWithPasskey = jest.fn()
const mockAuthenticateWithConditionalPasskey = jest.fn()
const mockGetPasskeyBrowserInfo = jest.fn()
const mockFetchRegistrationChallenge = jest.fn()
const mockFetchAuthenticationChallenge = jest.fn()
const mockSavePasskeyToServer = jest.fn()
const mockVerifyPasskeyWithServer = jest.fn()
const mockDeletePasskey = jest.fn()
const mockFetchUserPasskeys = jest.fn()
const mockGetPasskeyErrorMessage = jest.fn()

jest.mock('@/lib/auth/webauthn', () => ({
  isWebAuthnSupported: () => mockIsWebAuthnSupported(),
  isPlatformAuthenticatorAvailable: () => mockIsPlatformAuthenticatorAvailable(),
  isConditionalMediationAvailable: () => mockIsConditionalMediationAvailable(),
  registerPasskey: (...args: unknown[]) => mockRegisterPasskey(...args),
  authenticateWithPasskey: (...args: unknown[]) => mockAuthenticateWithPasskey(...args),
  authenticateWithConditionalPasskey: (...args: unknown[]) => mockAuthenticateWithConditionalPasskey(...args),
  getPasskeyBrowserInfo: () => mockGetPasskeyBrowserInfo(),
  fetchRegistrationChallenge: () => mockFetchRegistrationChallenge(),
  fetchAuthenticationChallenge: () => mockFetchAuthenticationChallenge(),
  savePasskeyToServer: (...args: unknown[]) => mockSavePasskeyToServer(...args),
  verifyPasskeyWithServer: (...args: unknown[]) => mockVerifyPasskeyWithServer(...args),
  deletePasskey: (...args: unknown[]) => mockDeletePasskey(...args),
  fetchUserPasskeys: () => mockFetchUserPasskeys(),
  getPasskeyErrorMessage: (err: unknown) => mockGetPasskeyErrorMessage(err),
  PasskeyError: class PasskeyError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.name = 'PasskeyError'
      this.code = code
    }
  },
}))

import { usePasskey, useConditionalPasskey, usePasskeySupport } from '@/hooks/usePasskey'

describe('usePasskey', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsWebAuthnSupported.mockReturnValue(false)
    mockIsPlatformAuthenticatorAvailable.mockResolvedValue(false)
    mockIsConditionalMediationAvailable.mockResolvedValue(false)
    mockGetPasskeyBrowserInfo.mockResolvedValue({
      isSupported: false,
      isPlatformAuthenticatorAvailable: false,
      userAgent: 'test',
      platform: 'unknown',
    })
    mockFetchUserPasskeys.mockResolvedValue([])
    mockGetPasskeyErrorMessage.mockImplementation((err: unknown) => {
      if (err instanceof Error) return err.message
      return 'Unknown error'
    })
  })

  // =========================================================================
  // Initialization
  // =========================================================================
  describe('initialization', () => {
    it('should detect WebAuthn support', async () => {
      mockIsWebAuthnSupported.mockReturnValue(true)
      mockIsPlatformAuthenticatorAvailable.mockResolvedValue(true)
      mockGetPasskeyBrowserInfo.mockResolvedValue({
        isSupported: true,
        isPlatformAuthenticatorAvailable: true,
        userAgent: 'test-agent',
        platform: 'macos',
      })

      const { result } = renderHook(() => usePasskey())

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
        expect(result.current.isPlatformAvailable).toBe(true)
        expect(result.current.browserInfo).not.toBeNull()
        expect(result.current.browserInfo?.platform).toBe('macos')
      })
    })

    it('should detect lack of WebAuthn support', async () => {
      mockIsWebAuthnSupported.mockReturnValue(false)

      const { result } = renderHook(() => usePasskey())

      await waitFor(() => {
        expect(result.current.isSupported).toBe(false)
        expect(result.current.isPlatformAvailable).toBe(false)
      })
    })

    it('should start with no error and not loading', () => {
      const { result } = renderHook(() => usePasskey())

      expect(result.current.error).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isRegistering).toBe(false)
      expect(result.current.isAuthenticating).toBe(false)
    })

    it('should start with empty userPasskeys', () => {
      const { result } = renderHook(() => usePasskey())

      expect(result.current.userPasskeys).toEqual([])
    })
  })

  // =========================================================================
  // Registration
  // =========================================================================
  describe('register', () => {
    it('should return false when WebAuthn is not supported', async () => {
      mockIsWebAuthnSupported.mockReturnValue(false)

      const { result } = renderHook(() => usePasskey())

      let success = false
      await act(async () => {
        success = await result.current.register('user-1', 'test@example.com')
      })

      expect(success).toBe(false)
      expect(result.current.error).not.toBeNull()
    })

    it('should complete registration flow successfully', async () => {
      mockIsWebAuthnSupported.mockReturnValue(true)
      mockIsPlatformAuthenticatorAvailable.mockResolvedValue(true)
      mockGetPasskeyBrowserInfo.mockResolvedValue({
        isSupported: true,
        isPlatformAuthenticatorAvailable: true,
        userAgent: 'test',
        platform: 'macos',
      })

      mockFetchRegistrationChallenge.mockResolvedValue('test-challenge')
      mockRegisterPasskey.mockResolvedValue({
        credentialId: 'cred-id',
        clientDataJSON: 'data',
        attestationObject: 'obj',
      })
      mockSavePasskeyToServer.mockResolvedValue(undefined)
      mockFetchUserPasskeys.mockResolvedValue([
        { id: '1', credentialId: 'cred-id', deviceName: 'Mac', createdAt: '2025-01-01' },
      ])

      const onRegisterSuccess = jest.fn()
      const { result } = renderHook(() =>
        usePasskey({ onRegisterSuccess })
      )

      // Wait for support check to complete
      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
      })

      let success = false
      await act(async () => {
        success = await result.current.register('user-1', 'test@example.com', 'My Mac')
      })

      expect(success).toBe(true)
      expect(mockFetchRegistrationChallenge).toHaveBeenCalled()
      expect(mockRegisterPasskey).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          email: 'test@example.com',
          challenge: 'test-challenge',
        })
      )
      expect(mockSavePasskeyToServer).toHaveBeenCalled()
      expect(onRegisterSuccess).toHaveBeenCalled()
    })

    it('should handle registration error', async () => {
      mockIsWebAuthnSupported.mockReturnValue(true)
      mockIsPlatformAuthenticatorAvailable.mockResolvedValue(true)
      mockGetPasskeyBrowserInfo.mockResolvedValue({
        isSupported: true,
        isPlatformAuthenticatorAvailable: true,
        userAgent: 'test',
        platform: 'macos',
      })
      mockFetchRegistrationChallenge.mockRejectedValue(
        new Error('Challenge failed')
      )

      const onError = jest.fn()
      const { result } = renderHook(() => usePasskey({ onError }))

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
      })

      let success = false
      await act(async () => {
        success = await result.current.register('user-1', 'test@example.com')
      })

      expect(success).toBe(false)
      expect(onError).toHaveBeenCalled()
      expect(result.current.isRegistering).toBe(false)
      expect(result.current.isLoading).toBe(false)
    })
  })

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('authenticate', () => {
    it('should return false when WebAuthn is not supported', async () => {
      mockIsWebAuthnSupported.mockReturnValue(false)

      const { result } = renderHook(() => usePasskey())

      let success = false
      await act(async () => {
        success = await result.current.authenticate()
      })

      expect(success).toBe(false)
    })

    it('should complete authentication flow successfully', async () => {
      mockIsWebAuthnSupported.mockReturnValue(true)
      mockIsPlatformAuthenticatorAvailable.mockResolvedValue(true)
      mockGetPasskeyBrowserInfo.mockResolvedValue({
        isSupported: true,
        isPlatformAuthenticatorAvailable: true,
        userAgent: 'test',
        platform: 'ios',
      })
      mockFetchAuthenticationChallenge.mockResolvedValue('auth-challenge')
      mockAuthenticateWithPasskey.mockResolvedValue({
        credentialId: 'cred-id',
        clientDataJSON: 'data',
        authenticatorData: 'auth-data',
        signature: 'sig',
      })
      mockVerifyPasskeyWithServer.mockResolvedValue({
        success: true,
        token: 'jwt-token',
        user: { id: '1' },
      })

      const onSuccess = jest.fn()
      const { result } = renderHook(() => usePasskey({ onSuccess }))

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
      })

      let success = false
      await act(async () => {
        success = await result.current.authenticate()
      })

      expect(success).toBe(true)
      expect(onSuccess).toHaveBeenCalledWith({
        token: 'jwt-token',
        user: { id: '1' },
      })
      expect(result.current.isAuthenticating).toBe(false)
    })

    it('should handle authentication verification failure', async () => {
      mockIsWebAuthnSupported.mockReturnValue(true)
      mockIsPlatformAuthenticatorAvailable.mockResolvedValue(true)
      mockGetPasskeyBrowserInfo.mockResolvedValue({
        isSupported: true,
        isPlatformAuthenticatorAvailable: true,
        userAgent: 'test',
        platform: 'macos',
      })
      mockFetchAuthenticationChallenge.mockResolvedValue('challenge')
      mockAuthenticateWithPasskey.mockResolvedValue({
        credentialId: 'id',
        clientDataJSON: 'data',
        authenticatorData: 'auth',
        signature: 'sig',
      })
      mockVerifyPasskeyWithServer.mockResolvedValue({ success: false })

      const { result } = renderHook(() => usePasskey())

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
      })

      let success = false
      await act(async () => {
        success = await result.current.authenticate()
      })

      expect(success).toBe(false)
      expect(result.current.error).not.toBeNull()
    })

    it('should handle authentication error', async () => {
      mockIsWebAuthnSupported.mockReturnValue(true)
      mockIsPlatformAuthenticatorAvailable.mockResolvedValue(true)
      mockGetPasskeyBrowserInfo.mockResolvedValue({
        isSupported: true,
        isPlatformAuthenticatorAvailable: true,
        userAgent: 'test',
        platform: 'macos',
      })
      mockFetchAuthenticationChallenge.mockRejectedValue(
        new Error('Challenge failed')
      )

      const onError = jest.fn()
      const { result } = renderHook(() => usePasskey({ onError }))

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
      })

      let success = false
      await act(async () => {
        success = await result.current.authenticate()
      })

      expect(success).toBe(false)
      expect(onError).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Delete Passkey
  // =========================================================================
  describe('deletePasskey', () => {
    it('should delete a passkey and refresh the list', async () => {
      mockDeletePasskey.mockResolvedValue(undefined)
      mockFetchUserPasskeys.mockResolvedValue([])

      const { result } = renderHook(() => usePasskey())

      let success = false
      await act(async () => {
        success = await result.current.deletePasskey('cred-to-delete')
      })

      expect(success).toBe(true)
      expect(mockDeletePasskey).toHaveBeenCalledWith('cred-to-delete')
      expect(mockFetchUserPasskeys).toHaveBeenCalled()
    })

    it('should handle delete error', async () => {
      mockDeletePasskey.mockRejectedValue(new Error('Delete failed'))

      const onError = jest.fn()
      const { result } = renderHook(() => usePasskey({ onError }))

      let success = false
      await act(async () => {
        success = await result.current.deletePasskey('id')
      })

      expect(success).toBe(false)
      expect(onError).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Clear Error
  // =========================================================================
  describe('clearError', () => {
    it('should clear the error state', async () => {
      mockIsWebAuthnSupported.mockReturnValue(false)

      const { result } = renderHook(() => usePasskey())

      // Trigger an error
      await act(async () => {
        await result.current.authenticate()
      })

      expect(result.current.error).not.toBeNull()

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  // =========================================================================
  // refreshPasskeys
  // =========================================================================
  describe('refreshPasskeys', () => {
    it('should fetch and update userPasskeys', async () => {
      const passkeys = [
        { id: '1', credentialId: 'c1', deviceName: 'iPhone', createdAt: '2025-01-01' },
        { id: '2', credentialId: 'c2', deviceName: 'Mac', createdAt: '2025-01-02' },
      ]
      mockFetchUserPasskeys.mockResolvedValue(passkeys)

      const { result } = renderHook(() => usePasskey())

      await act(async () => {
        await result.current.refreshPasskeys()
      })

      expect(result.current.userPasskeys).toEqual(passkeys)
    })

    it('should handle fetch error silently', async () => {
      mockFetchUserPasskeys.mockRejectedValue(new Error('Failed'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const { result } = renderHook(() => usePasskey())

      await act(async () => {
        await result.current.refreshPasskeys()
      })

      // Should not throw and passkeys remain empty
      expect(result.current.userPasskeys).toEqual([])
      consoleSpy.mockRestore()
    })
  })

  // =========================================================================
  // authenticateConditional
  // =========================================================================
  describe('authenticateConditional', () => {
    it('should return false immediately when WebAuthn is not supported', async () => {
      mockIsWebAuthnSupported.mockReturnValue(false)
      const { result } = renderHook(() => usePasskey())

      let success: boolean | undefined
      await act(async () => {
        success = await result.current.authenticateConditional()
      })

      expect(success).toBe(false)
    })

    it('should return false when conditional mediation is not available', async () => {
      mockIsWebAuthnSupported.mockReturnValue(true)
      mockIsPlatformAuthenticatorAvailable.mockResolvedValue(true)
      mockGetPasskeyBrowserInfo.mockResolvedValue({
        isSupported: true,
        isPlatformAuthenticatorAvailable: true,
        userAgent: 'test',
        platform: 'macos',
      })
      mockIsConditionalMediationAvailable.mockResolvedValue(false)

      const { result } = renderHook(() => usePasskey())
      await waitFor(() => expect(result.current.isSupported).toBe(true))

      let success: boolean | undefined
      await act(async () => {
        success = await result.current.authenticateConditional()
      })

      expect(success).toBe(false)
    })

    it('should return false when authenticateWithConditionalPasskey returns null', async () => {
      mockIsWebAuthnSupported.mockReturnValue(true)
      mockIsPlatformAuthenticatorAvailable.mockResolvedValue(true)
      mockGetPasskeyBrowserInfo.mockResolvedValue({
        isSupported: true,
        isPlatformAuthenticatorAvailable: true,
        userAgent: 'test',
        platform: 'macos',
      })
      mockIsConditionalMediationAvailable.mockResolvedValue(true)
      mockFetchAuthenticationChallenge.mockResolvedValue('challenge')
      mockAuthenticateWithConditionalPasskey.mockResolvedValue(null)

      const { result } = renderHook(() => usePasskey())
      await waitFor(() => expect(result.current.isSupported).toBe(true))

      let success: boolean | undefined
      await act(async () => {
        success = await result.current.authenticateConditional()
      })

      expect(success).toBe(false)
    })

    it('should return true and call onSuccess when authentication succeeds', async () => {
      mockIsWebAuthnSupported.mockReturnValue(true)
      mockIsPlatformAuthenticatorAvailable.mockResolvedValue(true)
      mockGetPasskeyBrowserInfo.mockResolvedValue({
        isSupported: true,
        isPlatformAuthenticatorAvailable: true,
        userAgent: 'test',
        platform: 'macos',
      })
      mockIsConditionalMediationAvailable.mockResolvedValue(true)
      mockFetchAuthenticationChallenge.mockResolvedValue('challenge')
      mockAuthenticateWithConditionalPasskey.mockResolvedValue({ credentialId: 'c' })
      mockVerifyPasskeyWithServer.mockResolvedValue({ success: true, token: 'tok', user: { id: '1' } })

      const onSuccess = jest.fn()
      const { result } = renderHook(() => usePasskey({ onSuccess }))
      await waitFor(() => expect(result.current.isSupported).toBe(true))

      let success: boolean | undefined
      await act(async () => {
        success = await result.current.authenticateConditional()
      })

      expect(success).toBe(true)
      expect(onSuccess).toHaveBeenCalledWith({ token: 'tok', user: { id: '1' } })
    })

    it('should return false when verify result.success is false', async () => {
      mockIsWebAuthnSupported.mockReturnValue(true)
      mockIsPlatformAuthenticatorAvailable.mockResolvedValue(true)
      mockGetPasskeyBrowserInfo.mockResolvedValue({
        isSupported: true,
        isPlatformAuthenticatorAvailable: true,
        userAgent: 'test',
        platform: 'macos',
      })
      mockIsConditionalMediationAvailable.mockResolvedValue(true)
      mockFetchAuthenticationChallenge.mockResolvedValue('challenge')
      mockAuthenticateWithConditionalPasskey.mockResolvedValue({ credentialId: 'c' })
      mockVerifyPasskeyWithServer.mockResolvedValue({ success: false })

      const { result } = renderHook(() => usePasskey())
      await waitFor(() => expect(result.current.isSupported).toBe(true))

      let success: boolean | undefined
      await act(async () => {
        success = await result.current.authenticateConditional()
      })

      expect(success).toBe(false)
    })

    it('should return false silently when an error is thrown (no onError callback)', async () => {
      mockIsWebAuthnSupported.mockReturnValue(true)
      mockIsPlatformAuthenticatorAvailable.mockResolvedValue(true)
      mockGetPasskeyBrowserInfo.mockResolvedValue({
        isSupported: true,
        isPlatformAuthenticatorAvailable: true,
        userAgent: 'test',
        platform: 'macos',
      })
      mockIsConditionalMediationAvailable.mockResolvedValue(true)
      mockFetchAuthenticationChallenge.mockRejectedValue(new Error('Network'))

      const onError = jest.fn()
      const { result } = renderHook(() => usePasskey({ onError }))
      await waitFor(() => expect(result.current.isSupported).toBe(true))

      let success: boolean | undefined
      await act(async () => {
        success = await result.current.authenticateConditional()
      })

      expect(success).toBe(false)
      expect(onError).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // register — getDefaultDeviceName path
  // =========================================================================
  describe('register — getDefaultDeviceName', () => {
    it('uses platform-based device name when deviceName is omitted', async () => {
      mockIsWebAuthnSupported.mockReturnValue(true)
      mockIsPlatformAuthenticatorAvailable.mockResolvedValue(true)
      mockGetPasskeyBrowserInfo.mockResolvedValue({
        isSupported: true,
        isPlatformAuthenticatorAvailable: true,
        userAgent: 'test',
        platform: 'ios',
      })
      mockFetchRegistrationChallenge.mockResolvedValue('challenge')
      mockRegisterPasskey.mockResolvedValue({
        credentialId: 'c',
        clientDataJSON: 'd',
        attestationObject: 'o',
      })
      mockSavePasskeyToServer.mockResolvedValue(undefined)
      mockFetchUserPasskeys.mockResolvedValue([])

      const { result } = renderHook(() => usePasskey())
      await waitFor(() => expect(result.current.isSupported).toBe(true))

      await act(async () => {
        await result.current.register('user-1', 'test@example.com')
      })

      expect(mockSavePasskeyToServer).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ deviceName: expect.stringContaining('iPhone') })
      )
    })
  })
})

// =============================================================================
// useConditionalPasskey
// =============================================================================

describe('useConditionalPasskey', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConditionalMediationAvailable.mockResolvedValue(false)
  })

  it('starts with isAvailable=false and autoComplete=email', () => {
    const { result } = renderHook(() => useConditionalPasskey(jest.fn()))
    expect(result.current.isAvailable).toBe(false)
    expect(result.current.autoComplete).toBe('email')
  })

  it('sets isAvailable=true and autoComplete=webauthn when mediation is available', async () => {
    mockIsConditionalMediationAvailable.mockResolvedValue(true)
    const { result } = renderHook(() => useConditionalPasskey(jest.fn()))
    await waitFor(() => expect(result.current.isAvailable).toBe(true))
    expect(result.current.autoComplete).toBe('webauthn')
  })

  it('returns an inputRef (initially null)', () => {
    const { result } = renderHook(() => useConditionalPasskey(jest.fn()))
    expect(result.current.inputRef).toBeDefined()
    expect(result.current.inputRef.current).toBeNull()
  })

  it('calls onSuccess when inputRef is set before isAvailable resolves', async () => {
    let resolveMeditation!: (v: boolean) => void
    const deferred = new Promise<boolean>((res) => { resolveMeditation = res })
    mockIsConditionalMediationAvailable.mockReturnValueOnce(deferred)
    mockFetchAuthenticationChallenge.mockResolvedValue('challenge')
    mockAuthenticateWithConditionalPasskey.mockResolvedValue({ credentialId: 'c' })
    mockVerifyPasskeyWithServer.mockResolvedValue({ success: true, token: 'tok', user: { id: '1' } })

    const onSuccess = jest.fn()
    const { result } = renderHook(() => useConditionalPasskey(onSuccess))

    // Attach ref before isAvailable becomes true so the guard passes
    result.current.inputRef.current = document.createElement('input')

    await act(async () => {
      resolveMeditation(true)
    })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ token: 'tok', user: { id: '1' } })
    })
  })

  it('does not call onSuccess when auth flow throws (fails silently)', async () => {
    let resolveMeditation!: (v: boolean) => void
    const deferred = new Promise<boolean>((res) => { resolveMeditation = res })
    mockIsConditionalMediationAvailable.mockReturnValueOnce(deferred)
    mockFetchAuthenticationChallenge.mockRejectedValue(new Error('fail'))

    const onSuccess = jest.fn()
    const { result } = renderHook(() => useConditionalPasskey(onSuccess))

    result.current.inputRef.current = document.createElement('input')

    await act(async () => {
      resolveMeditation(true)
    })

    await waitFor(() => expect(result.current.isAvailable).toBe(true))
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('skips auth flow when isAvailable is true but inputRef is null', async () => {
    mockIsConditionalMediationAvailable.mockResolvedValue(true)
    mockFetchAuthenticationChallenge.mockResolvedValue('challenge')

    const onSuccess = jest.fn()
    renderHook(() => useConditionalPasskey(onSuccess))

    await waitFor(() => {
      expect(mockIsConditionalMediationAvailable).toHaveBeenCalled()
    })

    // inputRef.current remains null → auth flow skipped
    expect(mockFetchAuthenticationChallenge).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })
})

// =============================================================================
// usePasskeySupport
// =============================================================================

describe('usePasskeySupport', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const origPublicKeyCredential = (global as any).PublicKeyCredential

  afterEach(() => {
    if (origPublicKeyCredential !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(global as any).PublicKeyCredential = origPublicKeyCredential
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any).PublicKeyCredential
    }
    jest.clearAllMocks()
  })

  it('returns isLoading=false after check completes', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).PublicKeyCredential
    const { result } = renderHook(() => usePasskeySupport())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  it('returns isSupported=false when PublicKeyCredential is not available', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).PublicKeyCredential

    const { result } = renderHook(() => usePasskeySupport())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isSupported).toBe(false)
    expect(result.current.isPlatformAvailable).toBe(false)
    expect(result.current.isConditionalAvailable).toBe(false)
    expect(mockIsPlatformAuthenticatorAvailable).not.toHaveBeenCalled()
    expect(mockIsConditionalMediationAvailable).not.toHaveBeenCalled()
  })

  it('returns isSupported=true and calls platform/conditional checks when PublicKeyCredential is available', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global as any).PublicKeyCredential = function PublicKeyCredential() {}
    mockIsPlatformAuthenticatorAvailable.mockResolvedValue(true)
    mockIsConditionalMediationAvailable.mockResolvedValue(true)

    const { result } = renderHook(() => usePasskeySupport())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isSupported).toBe(true)
    expect(result.current.isPlatformAvailable).toBe(true)
    expect(result.current.isConditionalAvailable).toBe(true)
  })

  it('returns isPlatformAvailable=false and isConditionalAvailable=false when checks resolve false', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global as any).PublicKeyCredential = function PublicKeyCredential() {}
    mockIsPlatformAuthenticatorAvailable.mockResolvedValue(false)
    mockIsConditionalMediationAvailable.mockResolvedValue(false)

    const { result } = renderHook(() => usePasskeySupport())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isSupported).toBe(true)
    expect(result.current.isPlatformAvailable).toBe(false)
    expect(result.current.isConditionalAvailable).toBe(false)
  })
})
