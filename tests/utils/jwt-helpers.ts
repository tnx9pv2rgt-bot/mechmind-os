/**
 * MechMind OS v10 - JWT Test Helpers
 * Utilities for JWT token generation and validation in tests
 */

import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

// Test JWT secrets
export const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-mechmind-os';
export const TEST_JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

// Token expiration times
export const TOKEN_EXPIRY = {
  ACCESS: '15m',
  REFRESH: '7d',
  TEMPORARY: '1h',
};

/**
 * JWT Payload interface
 */
export interface JWTPayload {
  sub: string;           // User ID
  tenantId: string;      // Tenant ID for multi-tenancy
  email?: string;
  roles: string[];
  permissions?: string[];
  iat?: number;
  exp?: number;
  jti?: string;          // JWT ID for token revocation
  type?: 'access' | 'refresh' | 'temporary';
}

/**
 * Generate a valid JWT access token
 */
export function generateAccessToken(
  userId: string,
  tenantId: string,
  roles: string[] = ['user'],
  permissions: string[] = [],
  expiresIn: string = TOKEN_EXPIRY.ACCESS
): string {
  const payload: JWTPayload = {
    sub: userId,
    tenantId,
    roles,
    permissions,
    type: 'access',
    jti: crypto.randomUUID(),
  };
  
  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn });
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(
  userId: string,
  tenantId: string,
  expiresIn: string = TOKEN_EXPIRY.REFRESH
): string {
  const payload: JWTPayload = {
    sub: userId,
    tenantId,
    roles: ['refresh'],
    type: 'refresh',
    jti: crypto.randomUUID(),
  };
  
  return jwt.sign(payload, TEST_JWT_REFRESH_SECRET, { expiresIn });
}

/**
 * Generate an expired token for testing
 */
export function generateExpiredToken(
  userId: string,
  tenantId: string,
  roles: string[] = ['user']
): string {
  const payload: JWTPayload = {
    sub: userId,
    tenantId,
    roles,
    type: 'access',
    jti: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
    exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
  };
  
  return jwt.sign(payload, TEST_JWT_SECRET);
}

/**
 * Generate a tampered token (invalid signature)
 */
export function generateTamperedToken(
  userId: string,
  tenantId: string,
  roles: string[] = ['user']
): string {
  const validToken = generateAccessToken(userId, tenantId, roles);
  const [header, payload] = validToken.split('.');
  
  // Modify payload
  const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
  decodedPayload.roles = ['admin']; // Escalate privileges
  const modifiedPayload = Buffer.from(JSON.stringify(decodedPayload)).toString('base64url');
  
  // Generate new signature with wrong secret
  const wrongSignature = crypto
    .createHmac('sha256', 'wrong-secret')
    .update(`${header}.${modifiedPayload}`)
    .digest('base64url');
  
  return `${header}.${modifiedPayload}.${wrongSignature}`;
}

/**
 * Generate a token with missing claims
 */
export function generateIncompleteToken(
  missingClaims: ('sub' | 'tenantId' | 'roles')[] = []
): string {
  const payload: Partial<JWTPayload> = {
    sub: crypto.randomUUID(),
    tenantId: crypto.randomUUID(),
    roles: ['user'],
    type: 'access',
  };
  
  missingClaims.forEach(claim => delete payload[claim]);
  
  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '15m' });
}

/**
 * Generate a token with algorithm 'none' attack
 */
export function generateNoneAlgorithmToken(
  userId: string,
  tenantId: string
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    tenantId,
    roles: ['admin'],
    type: 'access',
  })).toString('base64url');
  
  return `${header}.${payload}.`;
}

/**
 * Decode JWT without verification
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Verify JWT token
 */
export function verifyToken(
  token: string,
  secret: string = TEST_JWT_SECRET
): JWTPayload {
  return jwt.verify(token, secret) as JWTPayload;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    jwt.verify(token, TEST_JWT_SECRET);
    return false;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return true;
    }
    throw error;
  }
}

/**
 * Extract tenant ID from token
 */
export function extractTenantId(token: string): string | null {
  const decoded = decodeToken(token);
  return decoded?.tenantId || null;
}

/**
 * Extract user ID from token
 */
export function extractUserId(token: string): string | null {
  const decoded = decodeToken(token);
  return decoded?.sub || null;
}

/**
 * Check if user has required role
 */
export function hasRole(token: string, requiredRole: string): boolean {
  const decoded = decodeToken(token);
  return decoded?.roles?.includes(requiredRole) || false;
}

/**
 * Generate API key for service-to-service authentication
 */
export function generateServiceAPIKey(
  serviceName: string,
  tenantId: string
): string {
  const payload = {
    service: serviceName,
    tenantId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
  };
  
  return jwt.sign(payload, TEST_JWT_SECRET);
}

/**
 * Generate test authorization header
 */
export function generateAuthHeader(
  userId: string,
  tenantId: string,
  roles: string[] = ['user']
): { Authorization: string } {
  const token = generateAccessToken(userId, tenantId, roles);
  return { Authorization: `Bearer ${token}` };
}

/**
 * Generate malformed authorization header for negative testing
 */
export function generateMalformedAuthHeader(type: 'missing_bearer' | 'invalid_format' | 'empty'): { Authorization: string } {
  switch (type) {
    case 'missing_bearer':
      return { Authorization: 'invalid-token-format' };
    case 'invalid_format':
      return { Authorization: 'Bearer ' };
    case 'empty':
      return { Authorization: '' };
    default:
      return { Authorization: '' };
  }
}

/**
 * Token blacklist for revocation testing
 */
export class TokenBlacklist {
  private blacklistedTokens: Set<string> = new Set();
  
  add(tokenId: string): void {
    this.blacklistedTokens.add(tokenId);
  }
  
  isBlacklisted(tokenId: string): boolean {
    return this.blacklistedTokens.has(tokenId);
  }
  
  clear(): void {
    this.blacklistedTokens.clear();
  }
}

// Global token blacklist instance for tests
export const testTokenBlacklist = new TokenBlacklist();
