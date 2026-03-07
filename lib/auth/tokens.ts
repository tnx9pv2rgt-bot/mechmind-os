import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string | null;
  iat: number;
  exp: number;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string | null;
}

/**
 * Generate JWT token for a user
 */
export function generateJWT(user: User): string {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(user: User): string {
  const token = randomBytes(64).toString('hex');
  // Store refresh token info could be added here (e.g., in database)
  return token;
}

/**
 * Verify and decode a JWT token
 */
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Decode JWT without verification (for debugging)
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Generate a temporary token for MFA verification step
 */
export function generateTempToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'temp', verified: false },
    JWT_SECRET,
    { expiresIn: '5m' } // Short-lived token
  );
}

/**
 * Verify a temporary MFA token
 */
export function verifyTempToken(token: string): { sub: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; type: string };
    if (decoded.type !== 'temp') return null;
    return { sub: decoded.sub };
  } catch (error) {
    return null;
  }
}
