/**
 * WebAuthn / Passkey Utilities
 * FIDO2 compliant authentication helpers
 * 
 * @module lib/auth/webauthn
 */

// ============================================
// TYPES
// ============================================

export interface PasskeyCredential {
  id: string
  rawId: ArrayBuffer
  response: AuthenticatorAttestationResponse
  type: 'public-key'
}

export interface PasskeyAssertion {
  id: string
  rawId: ArrayBuffer
  response: AuthenticatorAssertionResponse
  type: 'public-key'
  clientExtensionResults: AuthenticationExtensionsClientOutputs
}

export interface RegistrationOptions {
  userId: string
  email: string
  challenge: string
  rpName?: string
  rpId?: string
  timeout?: number
}

export interface AuthenticationOptions {
  challenge: string
  allowCredentials?: string[]
  timeout?: number
}

export interface PasskeyRegistrationData {
  credentialId: string
  clientDataJSON: string
  attestationObject: string
  publicKey?: string
}

export interface PasskeyAuthenticationData {
  credentialId: string
  clientDataJSON: string
  authenticatorData: string
  signature: string
  userHandle?: string
}

// ============================================
// BASE64 UTILITIES
// ============================================

/**
 * Converte ArrayBuffer in Base64 URL-safe string
 */
export function bufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Converte Base64 URL-safe string in ArrayBuffer
 */
export function base64URLToBuffer(base64URL: string): ArrayBuffer {
  const base64 = base64URL
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(base64URL.length + (4 - (base64URL.length % 4)) % 4, '=')
  
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Converte stringa in ArrayBuffer (per user ID)
 */
export function stringToBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer as ArrayBuffer
}

// ============================================
// FEATURE DETECTION
// ============================================

/**
 * Verifica se il browser supporta WebAuthn
 */
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && 
         !!window.PublicKeyCredential
}

/**
 * Verifica se il dispositivo supporta l'autenticatore platform (Face ID/Touch ID)
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false
  
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/**
 * Verifica se il browser supporta i passkey condizionali (autofill)
 */
export function isConditionalMediationAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return Promise.resolve(false)
  
  return PublicKeyCredential.isConditionalMediationAvailable?.() ?? Promise.resolve(false)
}

// ============================================
// REGISTRATION
// ============================================

/**
 * Registra un nuovo passkey
 */
export async function registerPasskey(
  options: RegistrationOptions
): Promise<PasskeyRegistrationData> {
  const {
    userId,
    email,
    challenge,
    rpName = 'MechMind',
    rpId = window.location.hostname,
    timeout = 60000,
  } = options

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge: base64URLToBuffer(challenge),
    rp: {
      name: rpName,
      id: rpId,
    },
    user: {
      id: stringToBuffer(userId),
      name: email,
      displayName: email.split('@')[0],
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256
      { alg: -257, type: 'public-key' }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'required',
    },
    timeout,
    attestation: 'none',
    extensions: {
      credProps: true,
    },
  }

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  })) as PasskeyCredential

  if (!credential) {
    throw new PasskeyError('REGISTRATION_FAILED', 'Credential creation failed')
  }

  const response = credential.response

  return {
    credentialId: bufferToBase64URL(credential.rawId),
    clientDataJSON: bufferToBase64URL(response.clientDataJSON),
    attestationObject: bufferToBase64URL(response.attestationObject),
  }
}

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Autentica con un passkey esistente
 */
export async function authenticateWithPasskey(
  options: AuthenticationOptions
): Promise<PasskeyAuthenticationData> {
  const {
    challenge,
    allowCredentials = [],
    timeout = 60000,
  } = options

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: base64URLToBuffer(challenge),
    allowCredentials: allowCredentials.map(id => ({
      id: base64URLToBuffer(id),
      type: 'public-key',
    })),
    userVerification: 'required',
    timeout,
  }

  const assertion = (await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  })) as PasskeyAssertion

  if (!assertion) {
    throw new PasskeyError('AUTHENTICATION_FAILED', 'Authentication failed')
  }

  const response = assertion.response

  return {
    credentialId: bufferToBase64URL(assertion.rawId),
    clientDataJSON: bufferToBase64URL(response.clientDataJSON),
    authenticatorData: bufferToBase64URL(response.authenticatorData),
    signature: bufferToBase64URL(response.signature),
    userHandle: response.userHandle 
      ? bufferToBase64URL(response.userHandle)
      : undefined,
  }
}

/**
 * Autentica con passkey condizionale (autofill nei form)
 */
export async function authenticateWithConditionalPasskey(
  challenge: string,
  timeout = 60000
): Promise<PasskeyAuthenticationData | null> {
  const isAvailable = await isConditionalMediationAvailable()
  if (!isAvailable) return null

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: base64URLToBuffer(challenge),
    userVerification: 'required',
    timeout,
  }

  try {
    const assertion = (await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
      mediation: 'conditional',
    })) as PasskeyAssertion | null

    if (!assertion) return null

    const response = assertion.response

    return {
      credentialId: bufferToBase64URL(assertion.rawId),
      clientDataJSON: bufferToBase64URL(response.clientDataJSON),
      authenticatorData: bufferToBase64URL(response.authenticatorData),
      signature: bufferToBase64URL(response.signature),
      userHandle: response.userHandle 
        ? bufferToBase64URL(response.userHandle)
        : undefined,
    }
  } catch (error) {
    // Conditional request may fail silently if user doesn't interact
    return null
  }
}

// ============================================
// ERROR HANDLING
// ============================================

export class PasskeyError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'PasskeyError'
    this.code = code
  }
}

export function getPasskeyErrorMessage(error: unknown): string {
  if (error instanceof PasskeyError) {
    return error.message
  }

  // DOMException error codes from WebAuthn spec
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Autenticazione annullata o non autorizzata'
      case 'SecurityError':
        return 'Errore di sicurezza: dominio non valido'
      case 'InvalidStateError':
        return 'Passkey già registrato o stato non valido'
      case 'NotSupportedError':
        return 'Autenticatore non supportato'
      case 'AbortError':
        return 'Operazione annullata dall\'utente'
      case 'TimeoutError':
        return 'Timeout: operazione troppo lunga'
      default:
        return `Errore: ${error.message}`
    }
  }

  return 'Si è verificato un errore imprevisto'
}

// ============================================
// BROWSER INFO
// ============================================

export interface PasskeyBrowserInfo {
  isSupported: boolean
  isPlatformAuthenticatorAvailable: boolean
  userAgent: string
  platform: 'ios' | 'android' | 'macos' | 'windows' | 'unknown'
}

export async function getPasskeyBrowserInfo(): Promise<PasskeyBrowserInfo> {
  const userAgent = navigator.userAgent.toLowerCase()
  
  let platform: PasskeyBrowserInfo['platform'] = 'unknown'
  if (/iphone|ipad|ipod/.test(userAgent)) platform = 'ios'
  else if (/android/.test(userAgent)) platform = 'android'
  else if (/macintosh|mac os x/.test(userAgent)) platform = 'macos'
  else if (/windows nt/.test(userAgent)) platform = 'windows'

  return {
    isSupported: isWebAuthnSupported(),
    isPlatformAuthenticatorAvailable: await isPlatformAuthenticatorAvailable(),
    userAgent: navigator.userAgent,
    platform,
  }
}

// ============================================
// API HELPERS
// ============================================

const API_BASE = '/api/auth/passkey'

/**
 * Richiede una challenge di registrazione dal server
 */
export async function fetchRegistrationChallenge(): Promise<string> {
  const response = await fetch(`${API_BASE}/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'registration' }),
  })

  if (!response.ok) {
    throw new PasskeyError('CHALLENGE_FAILED', 'Failed to fetch registration challenge')
  }

  const data = await response.json()
  return data.challenge
}

/**
 * Richiede una challenge di autenticazione dal server
 */
export async function fetchAuthenticationChallenge(): Promise<string> {
  const response = await fetch(`${API_BASE}/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'authentication' }),
  })

  if (!response.ok) {
    throw new PasskeyError('CHALLENGE_FAILED', 'Failed to fetch authentication challenge')
  }

  const data = await response.json()
  return data.challenge
}

/**
 * Salva il passkey registrato sul server
 */
export async function savePasskeyToServer(
  data: PasskeyRegistrationData,
  metadata?: { deviceName?: string; platform?: string }
): Promise<void> {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, metadata }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Registration failed' }))
    throw new PasskeyError('SERVER_ERROR', error.message)
  }
}

/**
 * Verifica il passkey con il server
 */
export async function verifyPasskeyWithServer(
  data: PasskeyAuthenticationData
): Promise<{ success: boolean; token?: string; user?: unknown }> {
  const response = await fetch(`${API_BASE}/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Authentication failed' }))
    throw new PasskeyError('AUTH_FAILED', error.message)
  }

  return response.json()
}

/**
 * Rimuove un passkey dal server
 */
export async function deletePasskey(credentialId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${credentialId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new PasskeyError('DELETE_FAILED', 'Failed to delete passkey')
  }
}

/**
 * Recupera la lista dei passkey registrati
 */
export async function fetchUserPasskeys(): Promise<Array<{
  id: string
  credentialId: string
  deviceName: string
  createdAt: string
  lastUsedAt?: string
}>> {
  const response = await fetch(`${API_BASE}/list`)

  if (!response.ok) {
    throw new PasskeyError('FETCH_FAILED', 'Failed to fetch passkeys')
  }

  return response.json()
}
