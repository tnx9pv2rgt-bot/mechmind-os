import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const MOCK_KEY = 'a'.repeat(32); // 32-character key

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ENCRYPTION_KEY') return MOCK_KEY;
              if (key === 'ENCRYPTION_IV') return undefined;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt', () => {
    it('should return empty string for empty input', () => {
      expect(service.encrypt('')).toBe('');
    });

    it('should return null for null input', () => {
      expect(service.encrypt(null as unknown as string)).toBeNull();
    });

    it('should encrypt a string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = service.encrypt(plaintext);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(32); // IV (32 hex chars) + ciphertext
    });

    it('should produce different ciphertext for same input (random IV)', () => {
      const plaintext = 'same-input';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should prepend 16-byte IV (32 hex chars) to ciphertext', () => {
      const encrypted = service.encrypt('test');
      // First 32 chars should be the IV in hex
      const ivHex = encrypted.slice(0, 32);
      expect(ivHex).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe('decrypt', () => {
    it('should return empty string for empty input', () => {
      expect(service.decrypt('')).toBe('');
    });

    it('should decrypt data encrypted with the new format', () => {
      const plaintext = 'Sensitive PII data';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Mario Rossi - +39 333 1234567';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should throw on invalid ciphertext', () => {
      expect(() => service.decrypt('invalid-hex-data')).toThrow('Failed to decrypt data');
    });
  });

  describe('hash', () => {
    it('should return empty string for empty input', () => {
      expect(service.hash('')).toBe('');
    });

    it('should produce consistent hash for same input', () => {
      const hash1 = service.hash('+39 333 1234567');
      const hash2 = service.hash('+39 333 1234567');
      expect(hash1).toBe(hash2);
    });

    it('should normalize input before hashing', () => {
      const hash1 = service.hash('+39 333 1234567');
      const hash2 = service.hash('+393331234567');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different input', () => {
      const hash1 = service.hash('input-a');
      const hash2 = service.hash('input-b');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyHash', () => {
    it('should return true for matching data', () => {
      const data = '+39 333 1234567';
      const hash = service.hash(data);
      expect(service.verifyHash(data, hash)).toBe(true);
    });

    it('should return false for non-matching data', () => {
      const hash = service.hash('original');
      expect(service.verifyHash('different', hash)).toBe(false);
    });
  });

  describe('encryptFields', () => {
    it('should encrypt specified fields', () => {
      const data = { name: 'John', email: 'john@test.com', age: 30 };
      const encrypted = service.encryptFields(data, ['name', 'email']);
      expect(encrypted.name).not.toBe('John');
      expect(encrypted.email).not.toBe('john@test.com');
      expect(encrypted.age).toBe(30); // Non-encrypted field unchanged
    });
  });

  describe('decryptFields', () => {
    it('should decrypt specified fields', () => {
      const original = { name: 'John', email: 'john@test.com', age: 30 };
      const encrypted = service.encryptFields(original, ['name', 'email']);
      const decrypted = service.decryptFields(encrypted, ['name', 'email']);
      expect(decrypted.name).toBe('John');
      expect(decrypted.email).toBe('john@test.com');
      expect(decrypted.age).toBe(30);
    });
  });

  describe('constructor validation', () => {
    it('should throw if ENCRYPTION_KEY is missing', () => {
      expect(
        () =>
          new EncryptionService({
            get: () => undefined,
          } as unknown as ConfigService),
      ).toThrow('ENCRYPTION_KEY must be at least 32 characters');
    });

    it('should throw if ENCRYPTION_KEY is too short', () => {
      expect(
        () =>
          new EncryptionService({
            get: (key: string) => (key === 'ENCRYPTION_KEY' ? 'short' : undefined),
          } as unknown as ConfigService),
      ).toThrow('ENCRYPTION_KEY must be at least 32 characters');
    });
  });
});
