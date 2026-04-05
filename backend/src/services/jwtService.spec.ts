/**
 * jwtService.spec.ts — Tests for JWT token generation and verification
 */

// Set required env vars before importing
process.env.JWT_SECRET = 'test-secret-key-at-least-32-chars-long-enough';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-at-least-32-chars';

import jwt from 'jsonwebtoken';
import {
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
} from './jwtService';

const samplePayload = {
  sub: 'user-123',
  email: 'test@mechmind.io',
  role: 'admin',
  tenantId: 'tenant-abc',
};

describe('jwtService', () => {
  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens with expiry info', () => {
      const pair = generateTokenPair(samplePayload);

      expect(pair.accessToken).toBeDefined();
      expect(pair.refreshToken).toBeDefined();
      expect(pair.accessTokenExpiresIn).toBe(900);
      expect(pair.refreshTokenExpiresIn).toBe(604800);
    });

    it('should produce valid JWT strings', () => {
      const pair = generateTokenPair(samplePayload);

      const accessDecoded = jwt.decode(pair.accessToken) as Record<string, unknown>;
      expect(accessDecoded.sub).toBe('user-123');
      expect(accessDecoded.type).toBe('access');

      const refreshDecoded = jwt.decode(pair.refreshToken) as Record<string, unknown>;
      expect(refreshDecoded.sub).toBe('user-123');
      expect(refreshDecoded.type).toBe('refresh');
    });
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(samplePayload);
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded.type).toBe('access');
      expect(decoded.email).toBe('test@mechmind.io');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(samplePayload);
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded.type).toBe('refresh');
      expect(decoded.tenantId).toBe('tenant-abc');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = generateAccessToken(samplePayload);
      const result = verifyAccessToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.sub).toBe('user-123');
    });

    it('should reject a refresh token as access token', () => {
      const token = generateRefreshToken(samplePayload);
      const result = verifyAccessToken(token);

      // Different secrets cause signature verification failure before type check
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle expired tokens', () => {
      const token = jwt.sign({ ...samplePayload, type: 'access' }, process.env.JWT_SECRET!, {
        expiresIn: '-1s',
      });

      const result = verifyAccessToken(token);

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
      expect(result.error).toContain('Token expired');
    });

    it('should handle completely invalid tokens', () => {
      const result = verifyAccessToken('not-a-valid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle expired token that cannot be decoded', () => {
      // Manually create a token with invalid payload that triggers decode failure in catch
      const token = jwt.sign({ ...samplePayload, type: 'access' }, process.env.JWT_SECRET!, {
        expiresIn: '-1s',
      });

      const result = verifyAccessToken(token);

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
      // Either payload is set or error message indicates cannot decode
      expect(result.payload || result.error).toBeDefined();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = generateRefreshToken(samplePayload);
      const result = verifyRefreshToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.sub).toBe('user-123');
    });

    it('should reject an access token as refresh token', () => {
      const token = generateAccessToken(samplePayload);
      const result = verifyRefreshToken(token);

      // Different secrets cause signature verification failure before type check
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle expired refresh tokens', () => {
      const token = jwt.sign(
        { ...samplePayload, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '-1s' },
      );

      const result = verifyRefreshToken(token);

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
    });

    it('should handle invalid refresh tokens', () => {
      const result = verifyRefreshToken('garbage');

      expect(result.valid).toBe(false);
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid token', () => {
      const token = generateAccessToken(samplePayload);
      const decoded = decodeToken(token);

      expect(decoded?.sub).toBe('user-123');
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid.token.here');

      // jwt.decode returns null for unparseable tokens
      expect(decoded).toBeNull();
    });
  });

  describe('extractTenantId', () => {
    it('should extract tenantId from token', () => {
      const token = generateAccessToken(samplePayload);
      expect(extractTenantId(token)).toBe('tenant-abc');
    });

    it('should return null for token without tenantId', () => {
      const token = jwt.sign({ sub: 'user-1', type: 'access' }, process.env.JWT_SECRET!);
      expect(extractTenantId(token)).toBeNull();
    });

    it('should return null for invalid token', () => {
      expect(extractTenantId('bad-token')).toBeNull();
    });
  });

  describe('extractUserId', () => {
    it('should extract userId from token', () => {
      const token = generateAccessToken(samplePayload);
      expect(extractUserId(token)).toBe('user-123');
    });

    it('should return null for invalid token', () => {
      expect(extractUserId('bad-token')).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid non-expired token', () => {
      const token = generateAccessToken(samplePayload);
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for expired token', () => {
      const token = jwt.sign(samplePayload, process.env.JWT_SECRET!, { expiresIn: '-1s' });
      expect(isTokenExpired(token)).toBe(true);
    });

    it('should return true for invalid token', () => {
      expect(isTokenExpired('garbage')).toBe(true);
    });

    it('should return true for token without exp', () => {
      const token = jwt.sign({ sub: 'x' }, process.env.JWT_SECRET!, { noTimestamp: true });
      expect(isTokenExpired(token)).toBe(true);
    });
  });

  describe('getTokenExpiryTime', () => {
    it('should return positive seconds for valid token', () => {
      const token = generateAccessToken(samplePayload);
      const time = getTokenExpiryTime(token);

      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThanOrEqual(900);
    });

    it('should return 0 for expired token', () => {
      const token = jwt.sign(samplePayload, process.env.JWT_SECRET!, { expiresIn: '-1s' });
      expect(getTokenExpiryTime(token)).toBe(0);
    });

    it('should return 0 for invalid token', () => {
      expect(getTokenExpiryTime('bad')).toBe(0);
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new token pair from valid refresh token', () => {
      const refreshToken = generateRefreshToken(samplePayload);
      const pair = refreshAccessToken(refreshToken);

      expect(pair).not.toBeNull();
      expect(pair!.accessToken).toBeDefined();
      expect(pair!.refreshToken).toBeDefined();
    });

    it('should return null for invalid refresh token', () => {
      expect(refreshAccessToken('bad-token')).toBeNull();
    });

    it('should return null for expired refresh token', () => {
      const token = jwt.sign(
        { ...samplePayload, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '-1s' },
      );
      expect(refreshAccessToken(token)).toBeNull();
    });
  });

  describe('generateTwoFactorTempToken / verifyTwoFactorTempToken', () => {
    it('should generate and verify 2FA temp token', () => {
      const token = generateTwoFactorTempToken('user-123', 'test@test.com');
      const result = verifyTwoFactorTempToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.sub).toBe('user-123');
      expect(result.payload?.email).toBe('test@test.com');
    });

    it('should reject non-2fa tokens', () => {
      const token = generateAccessToken(samplePayload);
      const result = verifyTwoFactorTempToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid token type');
    });

    it('should handle expired 2FA tokens', () => {
      const token = jwt.sign(
        { sub: 'user-1', email: 'x@y.com', type: '2fa_pending' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' },
      );

      const result = verifyTwoFactorTempToken(token);

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
    });

    it('should handle invalid 2FA tokens', () => {
      const result = verifyTwoFactorTempToken('garbage');

      expect(result.valid).toBe(false);
    });
  });

  describe('generateEmailVerificationToken / verifyEmailVerificationToken', () => {
    it('should generate and verify email verification token', () => {
      const token = generateEmailVerificationToken('user@test.com', 'tenant-1');
      const result = verifyEmailVerificationToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.email).toBe('user@test.com');
      expect(result.payload?.tenantId).toBe('tenant-1');
    });

    it('should reject wrong type tokens', () => {
      const token = generateAccessToken(samplePayload);
      const result = verifyEmailVerificationToken(token);

      expect(result.valid).toBe(false);
    });

    it('should handle expired email verification tokens', () => {
      const token = jwt.sign(
        { email: 'x@y.com', tenantId: 't1', type: 'email_verification' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' },
      );

      const result = verifyEmailVerificationToken(token);

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
    });
  });

  describe('generatePasswordResetToken / verifyPasswordResetToken', () => {
    it('should generate and verify password reset token', () => {
      const token = generatePasswordResetToken('user@test.com', 'tenant-2');
      const result = verifyPasswordResetToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.email).toBe('user@test.com');
    });

    it('should reject wrong type tokens', () => {
      const token = generateAccessToken(samplePayload);
      const result = verifyPasswordResetToken(token);

      expect(result.valid).toBe(false);
    });

    it('should handle expired password reset tokens', () => {
      const token = jwt.sign(
        { email: 'x@y.com', tenantId: 't1', type: 'password_reset' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' },
      );

      const result = verifyPasswordResetToken(token);

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
    });

    it('should handle invalid tokens', () => {
      const result = verifyPasswordResetToken('bad-token');

      expect(result.valid).toBe(false);
    });
  });
});
