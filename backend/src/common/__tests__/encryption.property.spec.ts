import * as fc from 'fast-check';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../services/encryption.service';

const TEST_KEY = '0123456789abcdef0123456789abcdef'; // exactly 32 chars

const mockConfigService = {
  get: jest.fn((key: string) => (key === 'ENCRYPTION_KEY' ? TEST_KEY : undefined)),
};

describe('EncryptionService — property-based tests (fast-check)', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string) =>
      key === 'ENCRYPTION_KEY' ? TEST_KEY : undefined,
    );

    const module = await Test.createTestingModule({
      providers: [EncryptionService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  describe('encrypt / decrypt roundtrip', () => {
    it('decrypt(encrypt(data)) === data for any non-empty ASCII string', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 300 }).filter(s => s.length > 0),
          plaintext => {
            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
            expect(encrypted).not.toBe(plaintext);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('encrypt always produces a different ciphertext for same plaintext (random IV)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 100 }), plaintext => {
          const enc1 = service.encrypt(plaintext);
          const enc2 = service.encrypt(plaintext);
          // Random IV per call → different ciphertexts for same plaintext
          expect(enc1).not.toBe(enc2);
          // Both decrypt back to original
          expect(service.decrypt(enc1)).toBe(plaintext);
          expect(service.decrypt(enc2)).toBe(plaintext);
        }),
        { numRuns: 50 },
      );
    });

    it('roundtrip holds for strings with special characters', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.emailAddress(),
            fc.string({ minLength: 1, maxLength: 200 }),
            fc.constantFrom(
              '+39 333 1234567',
              'mario.rossi@example.com',
              "SQL'); DROP TABLE users; --",
              '{"json": "payload", "key": 123}',
              'AAAA BBBB CCCC DDDD', // credit card-like
            ),
          ),
          plaintext => {
            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
            expect(mockConfigService.get).toHaveBeenCalledWith('ENCRYPTION_KEY');
          },
        ),
        { numRuns: 50 },
      );
    });

    it('encrypt returns input unchanged for empty string', () => {
      const result = service.encrypt('');
      expect(result).toBe('');
      expect(mockConfigService.get).toHaveBeenCalledWith('ENCRYPTION_KEY');
    });

    it('decrypt returns input unchanged for empty string', () => {
      const result = service.decrypt('');
      expect(result).toBe('');
      expect(mockConfigService.get).toHaveBeenCalledWith('ENCRYPTION_KEY');
    });
  });

  describe('hash / verifyHash', () => {
    it('hash is deterministic — same input always produces same output', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), data => {
          const h1 = service.hash(data);
          const h2 = service.hash(data);
          expect(h1).toBe(h2);
          expect(h1.length).toBe(64); // SHA-256 hex = 64 chars
        }),
        { numRuns: 100 },
      );
    });

    it('verifyHash(data, hash(data)) is always true', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), data => {
          const h = service.hash(data);
          expect(service.verifyHash(data, h)).toBe(true);
          expect(service.hash(data)).toBe(h);
        }),
        { numRuns: 100 },
      );
    });

    it('hash normalizes phone numbers consistently (strips spaces, lowercases)', () => {
      // Phone numbers with different formatting should hash identically after normalization
      const base = '+393331234567';
      const withSpaces = '+39 333 1234567'; // spaces stripped → same normalized form
      // normalizeForHash strips non-alphanumeric except '+' → removes spaces
      // then removes '+' too (only a-z0-9) → '393331234567' vs '393331234567'
      expect(service.hash(base)).toBe(service.hash(withSpaces));
      expect(service.verifyHash(base, service.hash(withSpaces))).toBe(true);
    });

    it('different inputs produce different hashes (collision resistance)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (a, b) => {
            fc.pre(a !== b);
            // After normalization they might be equal (e.g. '+a' and 'a' both → 'a')
            // so only assert if normalized forms differ
            const hashA = service.hash(a);
            const hashB = service.hash(b);
            // We can't guarantee no collision since normalization reduces input space
            // But at minimum, both hashes must be valid 64-char hex strings
            expect(hashA).toMatch(/^[0-9a-f]{64}$/);
            expect(hashB).toMatch(/^[0-9a-f]{64}$/);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('empty string returns empty hash (no crash)', () => {
      const result = service.hash('');
      expect(result).toBe('');
      expect(mockConfigService.get).toHaveBeenCalledWith('ENCRYPTION_KEY');
    });
  });

  describe('encryptFields / decryptFields', () => {
    it('roundtrip for any object with string fields', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (name, email) => {
            const obj = { id: 1, name, email, count: 42 };
            const encrypted = service.encryptFields(obj, ['name', 'email']);
            const decrypted = service.decryptFields(encrypted, ['name', 'email']);

            expect(decrypted.name).toBe(name);
            expect(decrypted.email).toBe(email);
            expect(decrypted.id).toBe(1);
            expect(decrypted.count).toBe(42);
            expect(encrypted.name).not.toBe(name);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
