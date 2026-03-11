/**
 * Tests for WebAuthn Utilities (lib/auth/webauthn.ts)
 *
 * @module __tests__/lib/auth/webauthn.test
 */

// Ensure TextEncoder is available in jsdom
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder } = require('util')
global.TextEncoder = NodeTextEncoder
global.TextDecoder = NodeTextDecoder

import {
  bufferToBase64URL,
  base64URLToBuffer,
  stringToBuffer,
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerPasskey,
  authenticateWithPasskey,
  PasskeyError,
  getPasskeyErrorMessage,
  fetchRegistrationChallenge,
  fetchAuthenticationChallenge,
  savePasskeyToServer,
  verifyPasskeyWithServer,
  deletePasskey,
  fetchUserPasskeys,
} from '@/lib/auth/webauthn'

// =========================================================================
// Mocks
// =========================================================================

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('webauthn utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  // =========================================================================
  // Base64 URL Utilities
  // =========================================================================
  describe('bufferToBase64URL', () => {
    it('should convert an ArrayBuffer to base64url string', () => {
      const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer // "Hello"
      const result = bufferToBase64URL(buffer)
      expect(result).toBe('SGVsbG8') // base64url of "Hello" without padding
    })

    it('should handle empty buffer', () => {
      const buffer = new Uint8Array([]).buffer
      const result = bufferToBase64URL(buffer)
      expect(result).toBe('')
    })

    it('should replace + with - and / with _', () => {
      // Construct bytes that produce + and / in standard base64
      const buffer = new Uint8Array([251, 239, 190]).buffer // produces ++++ in base64
      const result = bufferToBase64URL(buffer)
      expect(result).not.toContain('+')
      expect(result).not.toContain('/')
      expect(result).not.toContain('=')
    })
  })

  describe('base64URLToBuffer', () => {
    it('should convert base64url string to ArrayBuffer', () => {
      const result = base64URLToBuffer('SGVsbG8')
      const bytes = new Uint8Array(result)
      expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111])
    })

    it('should handle base64url with - and _', () => {
      // First encode something, then decode it
      const original = new Uint8Array([251, 239, 190]).buffer
      const encoded = bufferToBase64URL(original)
      const decoded = base64URLToBuffer(encoded)
      expect(new Uint8Array(decoded)).toEqual(new Uint8Array(original))
    })

    it('should roundtrip correctly', () => {
      const testData = new Uint8Array([0, 1, 2, 255, 128, 64, 32, 16])
      const encoded = bufferToBase64URL(testData.buffer)
      const decoded = base64URLToBuffer(encoded)
      expect(new Uint8Array(decoded)).toEqual(testData)
    })
  })

  describe('stringToBuffer', () => {
    it('should convert a string to ArrayBuffer', () => {
      const result = stringToBuffer('hello')
      const bytes = new Uint8Array(result)
      expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111])
    })

    it('should handle empty string', () => {
      const result = stringToBuffer('')
      expect(new Uint8Array(result).length).toBe(0)
    })

    it('should handle UTF-8 characters', () => {
      const result = stringToBuffer('caf\u00E9')
      expect(new Uint8Array(result).length).toBeGreaterThan(0)
    })
  })

  // =========================================================================
  // Feature Detection
  // =========================================================================
  describe('isWebAuthnSupported', () => {
    it('should return true when PublicKeyCredential exists', () => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: jest.fn(),
        writable: true,
        configurable: true,
      })
      expect(isWebAuthnSupported()).toBe(true)
    })

    it('should return false when PublicKeyCredential does not exist', () => {
      const original = window.PublicKeyCredential
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      expect(isWebAuthnSupported()).toBe(false)

      // Restore
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: original,
        writable: true,
        configurable: true,
      })
    })
  })

  describe('isPlatformAuthenticatorAvailable', () => {
    it('should return false when WebAuthn is not supported', async () => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const result = await isPlatformAuthenticatorAvailable()
      expect(result).toBe(false)
    })

    it('should return true when platform authenticator is available', async () => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: {
          isUserVerifyingPlatformAuthenticatorAvailable: jest
            .fn()
            .mockResolvedValue(true),
        },
        writable: true,
        configurable: true,
      })

      const result = await isPlatformAuthenticatorAvailable()
      expect(result).toBe(true)
    })

    it('should return false on error', async () => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: {
          isUserVerifyingPlatformAuthenticatorAvailable: jest
            .fn()
            .mockRejectedValue(new Error('Not supported')),
        },
        writable: true,
        configurable: true,
      })

      const result = await isPlatformAuthenticatorAvailable()
      expect(result).toBe(false)
    })
  })

  // =========================================================================
  // Registration
  // =========================================================================
  describe('registerPasskey', () => {
    it('should create a credential and return registration data', async () => {
      const mockCredential = {
        rawId: new Uint8Array([1, 2, 3]).buffer,
        response: {
          clientDataJSON: new Uint8Array([4, 5, 6]).buffer,
          attestationObject: new Uint8Array([7, 8, 9]).buffer,
        },
        type: 'public-key',
      }

      Object.defineProperty(window, 'PublicKeyCredential', {
        value: jest.fn(),
        writable: true,
        configurable: true,
      })

      const mockCreate = jest.fn().mockResolvedValue(mockCredential)
      Object.defineProperty(navigator, 'credentials', {
        value: { create: mockCreate },
        writable: true,
        configurable: true,
      })

      const result = await registerPasskey({
        userId: 'user-1',
        email: 'test@example.com',
        challenge: 'dGVzdC1jaGFsbGVuZ2U', // base64url of "test-challenge"
      })

      expect(result.credentialId).toBe(bufferToBase64URL(mockCredential.rawId))
      expect(result.clientDataJSON).toBeDefined()
      expect(result.attestationObject).toBeDefined()
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          publicKey: expect.objectContaining({
            rp: expect.objectContaining({ name: 'MechMind' }),
            user: expect.objectContaining({ name: 'test@example.com' }),
          }),
        })
      )
    })

    it('should throw PasskeyError when credential creation returns null', async () => {
      const mockCreate = jest.fn().mockResolvedValue(null)
      Object.defineProperty(navigator, 'credentials', {
        value: { create: mockCreate },
        writable: true,
        configurable: true,
      })

      await expect(
        registerPasskey({
          userId: 'user-1',
          email: 'test@example.com',
          challenge: 'dGVzdA',
        })
      ).rejects.toThrow(PasskeyError)
    })
  })

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('authenticateWithPasskey', () => {
    it('should get a credential and return authentication data', async () => {
      const mockAssertion = {
        rawId: new Uint8Array([10, 20, 30]).buffer,
        response: {
          clientDataJSON: new Uint8Array([40, 50, 60]).buffer,
          authenticatorData: new Uint8Array([70, 80, 90]).buffer,
          signature: new Uint8Array([100, 110, 120]).buffer,
          userHandle: new Uint8Array([1, 2]).buffer,
        },
        type: 'public-key',
        clientExtensionResults: {},
      }

      const mockGet = jest.fn().mockResolvedValue(mockAssertion)
      Object.defineProperty(navigator, 'credentials', {
        value: { get: mockGet },
        writable: true,
        configurable: true,
      })

      const result = await authenticateWithPasskey({
        challenge: 'dGVzdA',
      })

      expect(result.credentialId).toBe(
        bufferToBase64URL(mockAssertion.rawId)
      )
      expect(result.clientDataJSON).toBeDefined()
      expect(result.authenticatorData).toBeDefined()
      expect(result.signature).toBeDefined()
      expect(result.userHandle).toBeDefined()
    })

    it('should throw PasskeyError when assertion is null', async () => {
      const mockGet = jest.fn().mockResolvedValue(null)
      Object.defineProperty(navigator, 'credentials', {
        value: { get: mockGet },
        writable: true,
        configurable: true,
      })

      await expect(
        authenticateWithPasskey({ challenge: 'dGVzdA' })
      ).rejects.toThrow(PasskeyError)
    })

    it('should pass allowCredentials when provided', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        rawId: new Uint8Array([1]).buffer,
        response: {
          clientDataJSON: new Uint8Array([2]).buffer,
          authenticatorData: new Uint8Array([3]).buffer,
          signature: new Uint8Array([4]).buffer,
          userHandle: null,
        },
      })
      Object.defineProperty(navigator, 'credentials', {
        value: { get: mockGet },
        writable: true,
        configurable: true,
      })

      const result = await authenticateWithPasskey({
        challenge: 'dGVzdA',
        allowCredentials: ['cred-1', 'cred-2'],
      })

      expect(mockGet).toHaveBeenCalledWith(
        expect.objectContaining({
          publicKey: expect.objectContaining({
            allowCredentials: expect.arrayContaining([
              expect.objectContaining({ type: 'public-key' }),
            ]),
          }),
        })
      )
      // userHandle should be undefined when null
      expect(result.userHandle).toBeUndefined()
    })
  })

  // =========================================================================
  // Error Handling
  // =========================================================================
  describe('PasskeyError', () => {
    it('should have correct name, code and message', () => {
      const error = new PasskeyError('TEST_CODE', 'Test message')
      expect(error.name).toBe('PasskeyError')
      expect(error.code).toBe('TEST_CODE')
      expect(error.message).toBe('Test message')
      expect(error instanceof Error).toBe(true)
    })
  })

  describe('getPasskeyErrorMessage', () => {
    it('should return message for PasskeyError', () => {
      const error = new PasskeyError('CODE', 'Custom error message')
      expect(getPasskeyErrorMessage(error)).toBe('Custom error message')
    })

    it('should return appropriate message for NotAllowedError', () => {
      const error = new DOMException('User denied', 'NotAllowedError')
      const message = getPasskeyErrorMessage(error)
      expect(message).toContain('annullata')
    })

    it('should return appropriate message for SecurityError', () => {
      const error = new DOMException('Bad domain', 'SecurityError')
      const message = getPasskeyErrorMessage(error)
      expect(message).toContain('sicurezza')
    })

    it('should return appropriate message for InvalidStateError', () => {
      const error = new DOMException('Already registered', 'InvalidStateError')
      const message = getPasskeyErrorMessage(error)
      expect(message).toContain('registrato')
    })

    it('should return appropriate message for NotSupportedError', () => {
      const error = new DOMException('Not supported', 'NotSupportedError')
      const message = getPasskeyErrorMessage(error)
      expect(message).toContain('supportato')
    })

    it('should return appropriate message for AbortError', () => {
      const error = new DOMException('Aborted', 'AbortError')
      const message = getPasskeyErrorMessage(error)
      expect(message).toContain('annullata')
    })

    it('should return appropriate message for TimeoutError', () => {
      const error = new DOMException('Timeout', 'TimeoutError')
      const message = getPasskeyErrorMessage(error)
      expect(message).toContain('Timeout')
    })

    it('should return generic message for unknown DOMException', () => {
      const error = new DOMException('Something', 'DataError')
      const message = getPasskeyErrorMessage(error)
      expect(message).toContain('Errore')
    })

    it('should return generic message for unknown error types', () => {
      const message = getPasskeyErrorMessage(new Error('random'))
      expect(message).toContain('errore imprevisto')
    })

    it('should return generic message for non-Error objects', () => {
      const message = getPasskeyErrorMessage('string error')
      expect(message).toContain('errore imprevisto')
    })
  })

  // =========================================================================
  // API Helpers
  // =========================================================================
  describe('fetchRegistrationChallenge', () => {
    it('should fetch and return challenge', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ challenge: 'my-challenge' }),
      })

      const result = await fetchRegistrationChallenge()
      expect(result).toBe('my-challenge')
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/passkey/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'registration' }),
      })
    })

    it('should throw PasskeyError on failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

      await expect(fetchRegistrationChallenge()).rejects.toThrow(PasskeyError)
    })
  })

  describe('fetchAuthenticationChallenge', () => {
    it('should fetch and return challenge', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ challenge: 'auth-challenge' }),
      })

      const result = await fetchAuthenticationChallenge()
      expect(result).toBe('auth-challenge')
    })

    it('should throw PasskeyError on failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })

      await expect(fetchAuthenticationChallenge()).rejects.toThrow(PasskeyError)
    })
  })

  describe('savePasskeyToServer', () => {
    it('should send registration data to server', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      const data = {
        credentialId: 'cred-id',
        clientDataJSON: 'client-data',
        attestationObject: 'attestation',
      }

      await savePasskeyToServer(data, { deviceName: 'My Mac' })

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/passkey/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          metadata: { deviceName: 'My Mac' },
        }),
      })
    })

    it('should throw PasskeyError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ message: 'Server error' }),
      })

      await expect(
        savePasskeyToServer({
          credentialId: 'id',
          clientDataJSON: 'data',
          attestationObject: 'obj',
        })
      ).rejects.toThrow(PasskeyError)
    })
  })

  describe('verifyPasskeyWithServer', () => {
    it('should send auth data and return result', async () => {
      const mockResult = { success: true, token: 'jwt-token', user: { id: '1' } }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResult),
      })

      const result = await verifyPasskeyWithServer({
        credentialId: 'cred-id',
        clientDataJSON: 'client',
        authenticatorData: 'auth',
        signature: 'sig',
      })

      expect(result).toEqual(mockResult)
    })

    it('should throw PasskeyError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ message: 'Auth failed' }),
      })

      await expect(
        verifyPasskeyWithServer({
          credentialId: 'id',
          clientDataJSON: 'data',
          authenticatorData: 'auth',
          signature: 'sig',
        })
      ).rejects.toThrow(PasskeyError)
    })
  })

  describe('deletePasskey', () => {
    it('should send DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await deletePasskey('my-credential-id')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/passkey/my-credential-id',
        { method: 'DELETE' }
      )
    })

    it('should throw PasskeyError on failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })

      await expect(deletePasskey('id')).rejects.toThrow(PasskeyError)
    })
  })

  describe('fetchUserPasskeys', () => {
    it('should fetch and return passkey list', async () => {
      const passkeys = [
        {
          id: '1',
          credentialId: 'cred-1',
          deviceName: 'iPhone',
          createdAt: '2025-01-01',
        },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(passkeys),
      })

      const result = await fetchUserPasskeys()
      expect(result).toEqual(passkeys)
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/passkey/list')
    })

    it('should throw PasskeyError on failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })

      await expect(fetchUserPasskeys()).rejects.toThrow(PasskeyError)
    })
  })
})
