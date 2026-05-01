import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

function requireEnvVar(name: string): string {
  // eslint-disable-next-line security/detect-object-injection
  const value = process.env[name];
  if (!value) {
    throw new Error(`FATAL: ${name} environment variable is required`);
  }
  return value;
}

const JWT_SECRET: string = requireEnvVar('JWT_SECRET');
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const JWT_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface JWTPayload {
  sub: string; // user id
  email: string;
  tenantId: string;
  role: string;
  jti: string; // unique token id for revocation
  familyId?: string; // refresh token family for rotation tracking
  iat: number;
  exp: number;
}

export function generateJWT(user: {
  id: string;
  email: string;
  tenantId: string;
  role: string;
}): string {
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
    { expiresIn: JWT_EXPIRY },
  );
}

export function generateRefreshToken(user: { id: string }, familyId?: string): string {
  return jwt.sign(
    {
      sub: user.id,
      jti: randomBytes(16).toString('hex'),
      familyId: familyId || randomBytes(16).toString('hex'),
    },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY },
  );
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
  } catch {
    return null;
  }
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
