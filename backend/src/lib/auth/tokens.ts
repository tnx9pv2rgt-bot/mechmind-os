import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const JWT_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface JWTPayload {
  sub: string;      // user id
  email: string;
  tenantId: string;
  role: string;
  jti: string;      // unique token id for revocation
  iat: number;
  exp: number;
}

export function generateJWT(user: { id: string; email: string; tenantId: string; role: string }): string {
  const jti = randomBytes(16).toString('hex');
  
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      jti,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function generateRefreshToken(user: { id: string }): string {
  return jwt.sign(
    { sub: user.id, jti: randomBytes(16).toString('hex') },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function decodeJWT(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
