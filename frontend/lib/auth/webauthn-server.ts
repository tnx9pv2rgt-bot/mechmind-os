/**
 * WebAuthn Server-Side Utilities
 * FIDO2 compliant authentication helpers using @simplewebauthn/server
 * 
 * @module lib/auth/webauthn-server
 * @version 1.0.0
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
// Helper per convertire base64url
function base64URLToBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLength);
  const binary = atob(padded);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}

// =============================================================================
// Configuration
// =============================================================================

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const RP_NAME = process.env.NEXT_PUBLIC_RP_NAME || 'MechMind OS - Gestionale Officine';
const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN || 'http://localhost:3002';

// =============================================================================
// Registration Functions
// =============================================================================

/**
 * Generate registration options for a new passkey
 */
export async function generatePasskeyRegistrationOptions(
  userId: string,
  email: string,
  name: string
) {
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: stringToUint8Array(userId) as Uint8Array<ArrayBuffer>,
    userName: email,
    userDisplayName: name,
    attestationType: 'direct',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    timeout: 60000,
  });

  return options;
}

/**
 * Verify a passkey registration response
 */
export async function verifyPasskeyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string
) {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  });

  return verification;
}

// =============================================================================
// Authentication Functions
// =============================================================================

/**
 * Generate authentication options for passkey login
 */
export async function generatePasskeyAuthenticationOptions() {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    timeout: 60000,
    userVerification: 'preferred',
  });

  return options;
}

/**
 * Verify a passkey authentication response
 */
export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  credentialPublicKey: Uint8Array,
  credentialCounter: number
) {
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: response.id,
      publicKey: credentialPublicKey as Uint8Array<ArrayBuffer>,
      counter: credentialCounter,
    },
    requireUserVerification: true,
  });

  return verification;
}

// =============================================================================
// Device Info Utilities
// =============================================================================

export interface DeviceInfo {
  name: string;
  type: 'phone' | 'tablet' | 'desktop' | 'unknown';
}

/**
 * Convert string to Uint8Array for WebAuthn userID
 */
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Extract device information from User-Agent string
 */
export function getDeviceInfo(userAgent: string): DeviceInfo {
  const ua = userAgent.toLowerCase();

  if (ua.includes('iphone')) return { name: 'iPhone', type: 'phone' };
  if (ua.includes('ipad')) return { name: 'iPad', type: 'tablet' };
  if (ua.includes('android') && ua.includes('mobile')) return { name: 'Android Phone', type: 'phone' };
  if (ua.includes('android')) return { name: 'Android Tablet', type: 'tablet' };
  if (ua.includes('windows')) return { name: 'Windows PC', type: 'desktop' };
  if (ua.includes('macintosh') || ua.includes('mac os')) return { name: 'Mac', type: 'desktop' };
  if (ua.includes('linux')) return { name: 'Linux PC', type: 'desktop' };

  return { name: 'Unknown Device', type: 'unknown' };
}

// =============================================================================
// Error Handling
// =============================================================================

export class WebAuthnServerError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'WebAuthnServerError';
  }
}

export function handleWebAuthnError(error: unknown): { message: string; code: string; statusCode: number } {
  if (error instanceof WebAuthnServerError) {
    return { message: error.message, code: error.code, statusCode: error.statusCode };
  }

  // @simplewebauthn/server specific errors
  if (error instanceof Error) {
    if (error.message.includes('challenge')) {
      return { message: 'Challenge verification failed', code: 'CHALLENGE_ERROR', statusCode: 400 };
    }
    if (error.message.includes('origin')) {
      return { message: 'Origin verification failed', code: 'ORIGIN_ERROR', statusCode: 400 };
    }
    if (error.message.includes('RP ID')) {
      return { message: 'RP ID verification failed', code: 'RPID_ERROR', statusCode: 400 };
    }
    return { message: error.message, code: 'UNKNOWN_ERROR', statusCode: 500 };
  }

  return { message: 'Unknown error occurred', code: 'UNKNOWN_ERROR', statusCode: 500 };
}
