/**
 * Token Generation Utilities
 * 
 * JWT and Refresh Token generation for authentication
 * 
 * @module lib/auth/tokens
 */

import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'crypto';

// =============================================================================
// Configuration
// =============================================================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production-min-32-chars'
);

const REFRESH_SECRET = new TextEncoder().encode(
  process.env.REFRESH_SECRET || 'your-refresh-secret-change-in-production-min-32'
);

const JWT_EXPIRY = '15m';      // Access token: 15 minutes
const REFRESH_EXPIRY = '7d';   // Refresh token: 7 days

// =============================================================================
// Types
// =============================================================================

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  tenantId?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  tenantId?: string;
  type: 'access';
  iat: number;
  exp: number;
}

export interface RefreshPayload {
  userId: string;
  tokenId: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

// =============================================================================
// JWT Token Functions
// =============================================================================

/**
 * Generate a JWT access token
 */
export async function generateJWT(user: UserPayload): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
    tenantId: user.tenantId,
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .setJti(randomUUID())
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify a JWT access token
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch (error) {
    throw new TokenError('Invalid or expired token', 'INVALID_TOKEN');
  }
}

// =============================================================================
// Refresh Token Functions
// =============================================================================

/**
 * Generate a refresh token
 */
export async function generateRefreshToken(user: UserPayload): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    tokenId: randomUUID(),
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRY)
    .sign(REFRESH_SECRET);

  return token;
}

/**
 * Verify a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<RefreshPayload> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    return payload as unknown as RefreshPayload;
  } catch (error) {
    throw new TokenError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }
}

// =============================================================================
// Error Handling
// =============================================================================

export class TokenError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'TokenError';
  }
}
