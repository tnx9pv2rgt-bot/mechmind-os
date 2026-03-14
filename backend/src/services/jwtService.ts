/**
 * JWT Service
 * Gestione token JWT per autenticazione (access + refresh)
 * - Access token: 15 minuti
 * - Refresh token: 7 giorni
 */

import jwt from 'jsonwebtoken';

// Configurazione da env vars
const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';

// Expiry times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minuti
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 giorni

// Expiry in secondi per il frontend
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 900 secondi
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 604800 secondi

// Interfacce
export interface JwtPayload {
  sub: string; // User ID
  email: string; // Email utente
  role: string; // Ruolo utente
  tenantId: string; // ID tenant (multi-tenant)
  type?: 'access' | 'refresh' | '2fa_pending' | 'email_verification' | 'password_reset'; // Tipo di token
  iat?: number; // Issued at
  exp?: number; // Expiration
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

export interface DecodedToken extends JwtPayload {
  iat: number;
  exp: number;
}

export interface TokenVerificationResult {
  valid: boolean;
  payload?: DecodedToken;
  error?: string;
  expired?: boolean;
}

/**
 * Genera una coppia di token (access + refresh)
 * @param payload - Dati da includere nel token
 * @returns TokenPair
 */
export function generateTokenPair(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): TokenPair {
  // Access token
  const accessToken = jwt.sign({ ...payload, type: 'access' }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  // Refresh token
  const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRY_SECONDS,
  };
}

/**
 * Genera solo l'access token
 * @param payload - Dati da includere nel token
 * @returns string
 */
export function generateAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  return jwt.sign({ ...payload, type: 'access' }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Genera solo il refresh token
 * @param payload - Dati da includere nel token
 * @returns string
 */
export function generateRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  return jwt.sign({ ...payload, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verifica un access token
 * @param token - Token da verificare
 * @returns TokenVerificationResult
 */
export function verifyAccessToken(token: string): TokenVerificationResult {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as DecodedToken;

    // Verifica che sia un access token
    if (payload.type !== 'access') {
      return {
        valid: false,
        error: 'Token type mismatch: expected access token',
      };
    }

    return {
      valid: true,
      payload,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      // Prova a decodificare per ottenere il payload scaduto
      try {
        const decoded = jwt.decode(token) as DecodedToken;
        return {
          valid: false,
          expired: true,
          payload: decoded,
          error: 'Token expired',
        };
      } catch {
        return {
          valid: false,
          expired: true,
          error: 'Token expired and cannot be decoded',
        };
      }
    }

    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    };
  }
}

/**
 * Verifica un refresh token
 * @param token - Token da verificare
 * @returns TokenVerificationResult
 */
export function verifyRefreshToken(token: string): TokenVerificationResult {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as DecodedToken;

    // Verifica che sia un refresh token
    if (payload.type !== 'refresh') {
      return {
        valid: false,
        error: 'Token type mismatch: expected refresh token',
      };
    }

    return {
      valid: true,
      payload,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      return {
        valid: false,
        expired: true,
        error: 'Refresh token expired',
      };
    }

    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid refresh token',
    };
  }
}

/**
 * Decodifica un token senza verificarlo
 * @param token - Token da decodificare
 * @returns DecodedToken | null
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    return jwt.decode(token) as DecodedToken;
  } catch {
    return null;
  }
}

/**
 * Estrae il tenant ID dal token
 * @param token - Token JWT
 * @returns string | null
 */
export function extractTenantId(token: string): string | null {
  const payload = decodeToken(token);
  return payload?.tenantId || null;
}

/**
 * Estrae l'user ID dal token
 * @param token - Token JWT
 * @returns string | null
 */
export function extractUserId(token: string): string | null {
  const payload = decodeToken(token);
  return payload?.sub || null;
}

/**
 * Verifica se un token è scaduto
 * @param token - Token JWT
 * @returns boolean
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * Calcola il tempo rimanente prima della scadenza (in secondi)
 * @param token - Token JWT
 * @returns number (secondi, 0 se scaduto)
 */
export function getTokenExpiryTime(token: string): number {
  const payload = decodeToken(token);
  if (!payload?.exp) return 0;

  const now = Math.floor(Date.now() / 1000);
  const remaining = payload.exp - now;

  return remaining > 0 ? remaining : 0;
}

/**
 * Rigenera una coppia di token da un refresh token valido
 * @param refreshToken - Refresh token valido
 * @returns TokenPair | null
 */
export function refreshAccessToken(refreshToken: string): TokenPair | null {
  const verification = verifyRefreshToken(refreshToken);

  if (!verification.valid || !verification.payload) {
    return null;
  }

  // Crea nuovo payload senza i campi interni
  const { sub, email, role, tenantId } = verification.payload;

  return generateTokenPair({ sub, email, role, tenantId });
}

/**
 * Genera un token temporaneo per 2FA (5 minuti)
 * @param userId - ID utente
 * @param email - Email utente
 * @returns string
 */
export function generateTwoFactorTempToken(userId: string, email: string): string {
  return jwt.sign(
    {
      sub: userId,
      email,
      type: '2fa_pending',
    },
    JWT_SECRET,
    { expiresIn: '5m' },
  );
}

/**
 * Verifica un token temporaneo 2FA
 * @param token - Token da verificare
 * @returns TokenVerificationResult
 */
export function verifyTwoFactorTempToken(token: string): TokenVerificationResult {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as DecodedToken;

    if (payload.type !== '2fa_pending') {
      return {
        valid: false,
        error: 'Invalid token type',
      };
    }

    return {
      valid: true,
      payload,
    };
  } catch (error) {
    return {
      valid: false,
      expired: error instanceof Error && error.name === 'TokenExpiredError',
      error: error instanceof Error ? error.message : 'Invalid 2FA token',
    };
  }
}

/**
 * Genera un token per verifica email (24 ore)
 * @param email - Email da verificare
 * @param tenantId - ID tenant
 * @returns string
 */
export function generateEmailVerificationToken(email: string, tenantId: string): string {
  return jwt.sign(
    {
      email,
      tenantId,
      type: 'email_verification',
    },
    JWT_SECRET,
    { expiresIn: '24h' },
  );
}

/**
 * Verifica un token di verifica email
 * @param token - Token da verificare
 * @returns TokenVerificationResult
 */
export function verifyEmailVerificationToken(token: string): TokenVerificationResult {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as DecodedToken;

    if (payload.type !== 'email_verification') {
      return {
        valid: false,
        error: 'Invalid token type',
      };
    }

    return {
      valid: true,
      payload,
    };
  } catch (error) {
    return {
      valid: false,
      expired: error instanceof Error && error.name === 'TokenExpiredError',
      error: error instanceof Error ? error.message : 'Invalid verification token',
    };
  }
}

/**
 * Genera un token per reset password (1 ora)
 * @param email - Email utente
 * @param tenantId - ID tenant
 * @returns string
 */
export function generatePasswordResetToken(email: string, tenantId: string): string {
  return jwt.sign(
    {
      email,
      tenantId,
      type: 'password_reset',
    },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

/**
 * Verifica un token di reset password
 * @param token - Token da verificare
 * @returns TokenVerificationResult
 */
export function verifyPasswordResetToken(token: string): TokenVerificationResult {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as DecodedToken;

    if (payload.type !== 'password_reset') {
      return {
        valid: false,
        error: 'Invalid token type',
      };
    }

    return {
      valid: true,
      payload,
    };
  } catch (error) {
    return {
      valid: false,
      expired: error instanceof Error && error.name === 'TokenExpiredError',
      error: error instanceof Error ? error.message : 'Invalid reset token',
    };
  }
}

// Export default
export default {
  generateTokenPair,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  extractTenantId,
  extractUserId,
  isTokenExpired,
  getTokenExpiryTime,
  refreshAccessToken,
  generateTwoFactorTempToken,
  verifyTwoFactorTempToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
};
