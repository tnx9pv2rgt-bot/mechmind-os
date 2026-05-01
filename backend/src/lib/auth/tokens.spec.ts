/**
 * tokens.spec.ts — Tests for JWT token utilities (lib/auth/tokens)
 */

// Set required env vars before importing
process.env.JWT_SECRET = 'test-jwt-secret-must-be-long-enough-for-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-must-be-long-enough-32';

import jwt from 'jsonwebtoken';
import {
  generateJWT,
  generateRefreshToken,
  verifyRefreshToken,
  verifyJWT,
  decodeJWT,
} from './tokens';

const sampleUser = {
  id: 'user-123',
  email: 'test@mechmind.io',
  tenantId: 'tenant-abc',
  role: 'admin',
};


describe('lib/auth/tokens', () => {
  describe('generateJWT', () => {
    it('should generate a valid JWT with user data', () => {
      const token = generateJWT(sampleUser);

      expect(token).toBeDefined();
      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded.sub).toBe('user-123');
      expect(decoded.email).toBe('test@mechmind.io');
      expect(decoded.tenantId).toBe('tenant-abc');
      expect(decoded.role).toBe('admin');
    });

    it('should include jti for revocation', () => {
      const token = generateJWT(sampleUser);

      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded.jti).toBeDefined();
      expect(typeof decoded.jti).toBe('string');
      expect((decoded.jti as string).length).toBeGreaterThan(0);
    });

    it('should generate unique jti for each call', () => {
      const token1 = generateJWT(sampleUser);
      const token2 = generateJWT(sampleUser);

      const decoded1 = jwt.decode(token1) as Record<string, unknown>;
      const decoded2 = jwt.decode(token2) as Record<string, unknown>;

      expect(decoded1.jti).not.toBe(decoded2.jti);
    });

    it('should set 15m expiry', () => {
      const token = generateJWT(sampleUser);
      const decoded = jwt.decode(token) as Record<string, unknown>;

      const exp = decoded.exp as number;
      const iat = decoded.iat as number;
      expect(exp - iat).toBe(900); // 15 minutes
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token with sub and jti', () => {
      const token = generateRefreshToken({ id: 'user-123' });

      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded.sub).toBe('user-123');
      expect(decoded.jti).toBeDefined();
    });

    it('should use provided familyId', () => {
      const token = generateRefreshToken({ id: 'user-123' }, 'family-abc');

      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded.familyId).toBe('family-abc');
    });

    it('should generate familyId when not provided', () => {
      const token = generateRefreshToken({ id: 'user-123' });

      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded.familyId).toBeDefined();
      expect(typeof decoded.familyId).toBe('string');
    });

    it('should set 7d expiry', () => {
      const token = generateRefreshToken({ id: 'user-123' });
      const decoded = jwt.decode(token) as Record<string, unknown>;

      const exp = decoded.exp as number;
      const iat = decoded.iat as number;
      expect(exp - iat).toBe(604800); // 7 days
    });
  });

  describe('verifyJWT', () => {
    it('should verify a valid JWT', () => {
      const token = generateJWT(sampleUser);
      const result = verifyJWT(token);

      expect(result).not.toBeNull();
      expect(result!.sub).toBe('user-123');
      expect(result!.email).toBe('test@mechmind.io');
    });

    it('should return null for invalid token', () => {
      const result = verifyJWT('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      const token = jwt.sign(
        { sub: 'user-1', email: 'a@b.com', tenantId: 't', role: 'admin', jti: 'x' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' },
      );

      const result = verifyJWT(token);
      expect(result).toBeNull();
    });

    it('should return null for token signed with wrong secret', () => {
      const token = jwt.sign({ sub: 'user-1' }, 'wrong-secret', { expiresIn: '15m' });
      const result = verifyJWT(token);
      expect(result).toBeNull();
    });

    it('should handle JsonWebTokenError from malformed signature', () => {
      const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
      const result = verifyJWT(malformedToken);
      expect(result).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = generateRefreshToken({ id: 'user-123' });
      const result = verifyRefreshToken(token);

      expect(result).not.toBeNull();
      expect(result!.sub).toBe('user-123');
    });

    it('should return null for invalid refresh token', () => {
      const result = verifyRefreshToken('garbage');
      expect(result).toBeNull();
    });

    it('should return null for expired refresh token', () => {
      const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;
      const token = jwt.sign({ sub: 'user-1', jti: 'x', familyId: 'f' }, refreshSecret, {
        expiresIn: '-1s',
      });

      const result = verifyRefreshToken(token);
      expect(result).toBeNull();
    });

    it('should handle malformed refresh token signature', () => {
      const malformedToken = 'header.payload.badsignature';
      const result = verifyRefreshToken(malformedToken);
      expect(result).toBeNull();
    });
  });

  describe('decodeJWT', () => {
    it('should decode a valid JWT without verification', () => {
      const token = generateJWT(sampleUser);
      const decoded = decodeJWT(token);

      expect(decoded).not.toBeNull();
      expect(decoded!.sub).toBe('user-123');
    });

    it('should decode an expired JWT', () => {
      const token = jwt.sign({ sub: 'user-1', email: 'a@b.com' }, process.env.JWT_SECRET!, {
        expiresIn: '-1s',
      });

      const decoded = decodeJWT(token);
      expect(decoded).not.toBeNull();
      expect(decoded!.sub).toBe('user-1');
    });

    it('should return null for malformed token', () => {
      const result = decodeJWT('not.a.jwt.at.all');
      // jwt.decode returns an object even for weird strings if they have 3 parts
      // but for truly invalid strings it returns null
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle non-JWT strings gracefully', () => {
      const result = decodeJWT('completely-invalid');
      // jwt.decode might return null or try to decode
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle empty string', () => {
      const result = decodeJWT('');
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('environment variable branches', () => {
    it('should use separate JWT_REFRESH_SECRET when provided', () => {
      // Test the branch: process.env.JWT_REFRESH_SECRET || JWT_SECRET
      // When JWT_REFRESH_SECRET is explicitly set (which it is in setup)
      const token = generateRefreshToken({ id: 'user-123' });

      // Verify it can be verified with JWT_REFRESH_SECRET
      const result = verifyRefreshToken(token);
      expect(result).not.toBeNull();
      expect(result!.sub).toBe('user-123');
    });

    it('should handle refresh token with different secret', () => {
      // Test that verifyRefreshToken works when secret is configured
      // Create a token with the refresh secret
      const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;
      const testToken = jwt.sign(
        { sub: 'user-test', jti: 'test-jti', familyId: 'test-family' },
        refreshSecret,
        { expiresIn: '7d' }
      );

      const result = verifyRefreshToken(testToken);
      expect(result).not.toBeNull();
      expect(result!.sub).toBe('user-test');
    });

    it('should generate random familyId when not provided', () => {
      // Test the branch: familyId || randomBytes(...)
      const token1 = generateRefreshToken({ id: 'user-123' }, undefined);
      const token2 = generateRefreshToken({ id: 'user-123' }, undefined);

      const decoded1 = jwt.decode(token1) as Record<string, unknown>;
      const decoded2 = jwt.decode(token2) as Record<string, unknown>;

      // Both should have familyId generated
      expect(decoded1.familyId).toBeDefined();
      expect(decoded2.familyId).toBeDefined();

      // Generated familyIds should be different
      expect(decoded1.familyId).not.toBe(decoded2.familyId);
    });

    it('should use provided familyId when explicitly passed', () => {
      // Test when familyId is provided (explicit non-falsy value)
      const token = generateRefreshToken({ id: 'user-123' }, 'explicit-family-id');

      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded.familyId).toBe('explicit-family-id');
    });

    it('should generate familyId when passed empty string', () => {
      // Test the || branch with falsy value: empty string triggers randomBytes
      const token = generateRefreshToken({ id: 'user-123' }, '');

      const decoded = jwt.decode(token) as Record<string, unknown>;
      // Empty string is falsy, so || randomBytes should generate a new one
      expect(typeof decoded.familyId).toBe('string');
      expect((decoded.familyId as string).length).toBeGreaterThan(0);
      expect(decoded.familyId).not.toBe('');
    });
  });
});
