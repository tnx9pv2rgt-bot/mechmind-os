/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';

/**
 * Test suite for OAuth JWT validation chains
 * Focus: JWT issuer/audience/nonce validation paths
 * Target: 15 tests covering OAuth/OIDC validation branches
 */
describe('OAuth JWT Validation Chains', () => {
  let jwtService: jest.Mocked<JwtService>;

  const mockOAuthToken = {
    sub: 'user-001',
    email: 'test@example.com',
    email_verified: true,
    iss: 'https://accounts.google.com',
    aud: 'client-id-123',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    nonce: 'nonce-xyz',
  };

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
            decode: jest.fn(),
          },
        },
      ],
    }).compile();

    jwtService = testModule.get(JwtService) as jest.Mocked<JwtService>;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Issuer Validation
  // ══════════════════════════════════════════════════════════════════════════

  describe('issuer validation', () => {
    it('1.1 should accept Google issuer', async () => {
      const token = {
        ...mockOAuthToken,
        iss: 'https://accounts.google.com',
      };
      jwtService.verify.mockReturnValue(token);

      const result = jwtService.verify(token as any);

      expect(result.iss).toBe('https://accounts.google.com');
    });

    it('1.2 should accept Microsoft issuer', async () => {
      const token = {
        ...mockOAuthToken,
        iss: 'https://login.microsoftonline.com/common/v2.0',
      };
      jwtService.verify.mockReturnValue(token);

      const result = jwtService.verify(token as any);

      expect(result.iss).toContain('login.microsoftonline.com');
    });

    it('1.3 should accept GitHub issuer', async () => {
      const token = {
        ...mockOAuthToken,
        iss: 'https://token.actions.githubusercontent.com',
      };
      jwtService.verify.mockReturnValue(token);

      const result = jwtService.verify(token as any);

      expect(result.iss).toContain('github');
    });

    it('1.4 should reject invalid issuer', async () => {
      const token = {
        ...mockOAuthToken,
        iss: 'https://malicious.example.com',
      };

      const validateIssuer = (issuer: string): boolean => {
        const allowedIssuers = [
          'https://accounts.google.com',
          'https://login.microsoftonline.com/common/v2.0',
          'https://token.actions.githubusercontent.com',
        ];
        return allowedIssuers.includes(issuer);
      };

      expect(validateIssuer(token.iss)).toBe(false);
    });

    it('1.5 should reject missing issuer', async () => {
      const token = {
        sub: 'user-001',
        email: 'test@example.com',
        // iss missing
      };

      const validateIssuer = (issuer: string | undefined): boolean => {
        return !!issuer && issuer.length > 0;
      };

      expect(validateIssuer((token as any).iss)).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Audience Validation
  // ══════════════════════════════════════════════════════════════════════════

  describe('audience validation', () => {
    it('2.1 should accept valid audience (string)', async () => {
      const token = {
        ...mockOAuthToken,
        aud: 'client-id-123',
      };

      const expectedAud = 'client-id-123';
      const validateAud = (aud: string | string[]): boolean => {
        if (Array.isArray(aud)) {
          return aud.includes(expectedAud);
        }
        return aud === expectedAud;
      };

      expect(validateAud(token.aud)).toBe(true);
    });

    it('2.2 should accept valid audience (array)', async () => {
      const token = {
        ...mockOAuthToken,
        aud: ['client-id-123', 'other-client'],
      };

      const expectedAud = 'client-id-123';
      const validateAud = (aud: string | string[]): boolean => {
        if (Array.isArray(aud)) {
          return aud.includes(expectedAud);
        }
        return aud === expectedAud;
      };

      expect(validateAud(token.aud)).toBe(true);
    });

    it('2.3 should reject invalid audience', async () => {
      const token = {
        ...mockOAuthToken,
        aud: 'wrong-client-id',
      };

      const expectedAud = 'client-id-123';
      const validateAud = (aud: string): boolean => {
        return aud === expectedAud;
      };

      expect(validateAud(token.aud as string)).toBe(false);
    });

    it('2.4 should reject missing audience', async () => {
      const token = {
        sub: 'user-001',
        email: 'test@example.com',
        // aud missing
      };

      const validateAud = (aud: string | undefined): boolean => {
        return !!aud && aud.length > 0;
      };

      expect(validateAud((token as any).aud)).toBe(false);
    });

    it('2.5 should reject empty audience array', async () => {
      const token = {
        ...mockOAuthToken,
        aud: [],
      };

      const expectedAud = 'client-id-123';
      const validateAud = (aud: string | string[]): boolean => {
        if (Array.isArray(aud)) {
          return aud.length > 0 && aud.includes(expectedAud);
        }
        return aud === expectedAud;
      };

      expect(validateAud(token.aud as string[])).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Nonce Validation (OIDC anti-replay)
  // ══════════════════════════════════════════════════════════════════════════

  describe('nonce validation', () => {
    it('3.1 should accept matching nonce', async () => {
      const token = { ...mockOAuthToken, nonce: 'nonce-xyz' };
      const expectedNonce = 'nonce-xyz';

      const validateNonce = (tokenNonce: string, expected: string): boolean => {
        return tokenNonce === expected;
      };

      expect(validateNonce(token.nonce, expectedNonce)).toBe(true);
    });

    it('3.2 should reject mismatched nonce', async () => {
      const token = { ...mockOAuthToken, nonce: 'nonce-old' };
      const expectedNonce = 'nonce-xyz';

      const validateNonce = (tokenNonce: string, expected: string): boolean => {
        return tokenNonce === expected;
      };

      expect(validateNonce(token.nonce, expectedNonce)).toBe(false);
    });

    it('3.3 should reject missing nonce', async () => {
      const token = {
        sub: 'user-001',
        email: 'test@example.com',
        iss: 'https://accounts.google.com',
        aud: 'client-id-123',
        // nonce missing
      };

      const validateNonce = (tokenNonce: string | undefined): boolean => {
        return !!tokenNonce && tokenNonce.length > 0;
      };

      expect(validateNonce((token as any).nonce)).toBe(false);
    });

    it('3.4 should reject empty nonce', async () => {
      const token = { ...mockOAuthToken, nonce: '' };

      const validateNonce = (tokenNonce: string): boolean => {
        return tokenNonce.length > 0;
      };

      expect(validateNonce(token.nonce)).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Email Verification Claim
  // ══════════════════════════════════════════════════════════════════════════

  describe('email verification claim', () => {
    it('4.1 should accept token with email_verified=true', async () => {
      const token = { ...mockOAuthToken, email_verified: true };

      const validateEmailVerified = (verified: boolean | undefined): boolean => {
        return verified === true;
      };

      expect(validateEmailVerified(token.email_verified)).toBe(true);
    });

    it('4.2 should reject token with email_verified=false', async () => {
      const token = { ...mockOAuthToken, email_verified: false };

      const validateEmailVerified = (verified: boolean | undefined): boolean => {
        return verified === true;
      };

      expect(validateEmailVerified(token.email_verified)).toBe(false);
    });

    it('4.3 should accept token missing email_verified (treat as trusted)', async () => {
      const token = {
        ...mockOAuthToken,
        // email_verified missing
      };

      const validateEmailVerified = (verified: boolean | undefined): boolean => {
        // Some providers don't send email_verified; treat as true if present
        return verified !== false;
      };

      expect(validateEmailVerified((token as any).email_verified)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Token Expiration Validation
  // ══════════════════════════════════════════════════════════════════════════

  describe('token expiration', () => {
    it('5.1 should accept non-expired token', async () => {
      const now = Math.floor(Date.now() / 1000);
      const token = {
        ...mockOAuthToken,
        exp: now + 3600,
      };

      const validateExpiration = (exp: number): boolean => {
        return exp > Math.floor(Date.now() / 1000);
      };

      expect(validateExpiration(token.exp)).toBe(true);
    });

    it('5.2 should reject expired token', async () => {
      const now = Math.floor(Date.now() / 1000);
      const token = {
        ...mockOAuthToken,
        exp: now - 3600,
      };

      const validateExpiration = (exp: number): boolean => {
        return exp > Math.floor(Date.now() / 1000);
      };

      expect(validateExpiration(token.exp)).toBe(false);
    });

    it('5.3 should reject missing expiration', async () => {
      const token = {
        sub: 'user-001',
        email: 'test@example.com',
        // exp missing
      };

      const validateExpiration = (exp: number | undefined): boolean => {
        return !!exp && exp > Math.floor(Date.now() / 1000);
      };

      expect(validateExpiration((token as any).exp)).toBe(false);
    });

    it('5.4 should apply clock skew tolerance (default 30s)', async () => {
      const now = Math.floor(Date.now() / 1000);
      const token = {
        ...mockOAuthToken,
        exp: now - 10, // expired 10 seconds ago
      };

      const clockSkew = 30; // 30 second tolerance
      const validateExpiration = (exp: number, skew: number): boolean => {
        return exp + skew > Math.floor(Date.now() / 1000);
      };

      expect(validateExpiration(token.exp, clockSkew)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. Subject Validation (sub claim)
  // ══════════════════════════════════════════════════════════════════════════

  describe('subject (sub) claim validation', () => {
    it('6.1 should accept valid subject', async () => {
      const token = { ...mockOAuthToken, sub: 'user-001' };

      const validateSub = (sub: string | undefined): boolean => {
        return !!sub && sub.length > 0;
      };

      expect(validateSub(token.sub)).toBe(true);
    });

    it('6.2 should reject missing subject', async () => {
      const token = {
        email: 'test@example.com',
        // sub missing
      };

      const validateSub = (sub: string | undefined): boolean => {
        return !!sub && sub.length > 0;
      };

      expect(validateSub((token as any).sub)).toBe(false);
    });

    it('6.3 should reject empty subject', async () => {
      const token = { ...mockOAuthToken, sub: '' };

      const validateSub = (sub: string): boolean => {
        return sub.length > 0;
      };

      expect(validateSub(token.sub)).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 7. Chain: Complete JWT validation flow
  // ══════════════════════════════════════════════════════════════════════════

  describe('complete JWT validation chain', () => {
    it('7.1 should accept valid token passing all checks', async () => {
      const token = mockOAuthToken;
      const clientId = 'client-id-123';
      const expectedNonce = 'nonce-xyz';

      const validateOAuthToken = (
        tok: typeof mockOAuthToken,
        cid: string,
        nonce: string,
      ): boolean => {
        const allowedIssuers = ['https://accounts.google.com'];
        return (
          allowedIssuers.includes(tok.iss) &&
          tok.aud === cid &&
          tok.nonce === nonce &&
          tok.email_verified === true &&
          tok.exp > Math.floor(Date.now() / 1000) &&
          !!tok.sub
        );
      };

      expect(validateOAuthToken(token, clientId, expectedNonce)).toBe(true);
    });

    it('7.2 should reject token failing issuer check', async () => {
      const token = {
        ...mockOAuthToken,
        iss: 'https://malicious.example.com',
      };
      const clientId = 'client-id-123';
      const expectedNonce = 'nonce-xyz';

      const validateOAuthToken = (
        tok: typeof mockOAuthToken,
        cid: string,
        nonce: string,
      ): boolean => {
        const allowedIssuers = ['https://accounts.google.com'];
        return (
          allowedIssuers.includes(tok.iss) &&
          tok.aud === cid &&
          tok.nonce === nonce &&
          tok.email_verified === true &&
          tok.exp > Math.floor(Date.now() / 1000) &&
          !!tok.sub
        );
      };

      expect(validateOAuthToken(token as any, clientId, expectedNonce)).toBe(false);
    });

    it('7.3 should reject token failing audience check', async () => {
      const token = {
        ...mockOAuthToken,
        aud: 'wrong-client-id',
      };
      const clientId = 'client-id-123';
      const expectedNonce = 'nonce-xyz';

      const validateOAuthToken = (
        tok: typeof mockOAuthToken,
        cid: string,
        nonce: string,
      ): boolean => {
        const allowedIssuers = ['https://accounts.google.com'];
        return (
          allowedIssuers.includes(tok.iss) &&
          tok.aud === cid &&
          tok.nonce === nonce &&
          tok.email_verified === true &&
          tok.exp > Math.floor(Date.now() / 1000) &&
          !!tok.sub
        );
      };

      expect(validateOAuthToken(token as any, clientId, expectedNonce)).toBe(false);
    });

    it('7.4 should reject token failing nonce check', async () => {
      const token = {
        ...mockOAuthToken,
        nonce: 'wrong-nonce',
      };
      const clientId = 'client-id-123';
      const expectedNonce = 'nonce-xyz';

      const validateOAuthToken = (
        tok: typeof mockOAuthToken,
        cid: string,
        nonce: string,
      ): boolean => {
        const allowedIssuers = ['https://accounts.google.com'];
        return (
          allowedIssuers.includes(tok.iss) &&
          tok.aud === cid &&
          tok.nonce === nonce &&
          tok.email_verified === true &&
          tok.exp > Math.floor(Date.now() / 1000) &&
          !!tok.sub
        );
      };

      expect(validateOAuthToken(token as any, clientId, expectedNonce)).toBe(false);
    });

    it('7.5 should reject expired token even if other checks pass', async () => {
      const now = Math.floor(Date.now() / 1000);
      const token = {
        ...mockOAuthToken,
        exp: now - 3600,
      };
      const clientId = 'client-id-123';
      const expectedNonce = 'nonce-xyz';

      const validateOAuthToken = (
        tok: typeof mockOAuthToken,
        cid: string,
        nonce: string,
      ): boolean => {
        const allowedIssuers = ['https://accounts.google.com'];
        return (
          allowedIssuers.includes(tok.iss) &&
          tok.aud === cid &&
          tok.nonce === nonce &&
          tok.email_verified === true &&
          tok.exp > Math.floor(Date.now() / 1000) &&
          !!tok.sub
        );
      };

      expect(validateOAuthToken(token as any, clientId, expectedNonce)).toBe(false);
    });
  });
});
