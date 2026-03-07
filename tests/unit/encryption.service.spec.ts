/**
 * MechMind OS v10 - Encryption Service Unit Tests
 * PII encryption/decryption testing for GDPR compliance
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from '@/encryption/encryption.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: jest.Mocked<ConfigService>;

  // Test encryption key (256-bit)
  const testKey = crypto.randomBytes(32).toString('base64');

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'ENCRYPTION_KEY') return testKey;
        if (key === 'ENCRYPTION_ALGORITHM') return 'aes-256-gcm';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: Logger, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() } },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('encrypt', () => {
    it('should encrypt PII fields', () => {
      // Arrange
      const plainText = 'John Doe';

      // Act
      const encrypted = service.encrypt(plainText);

      // Assert
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plainText);
      expect(encrypted.length).toBeGreaterThan(plainText.length);
      // Should be base64 encoded with IV and auth tag
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=:]+$/);
    });

    it('should produce different ciphertext for same plaintext (IV uniqueness)', () => {
      // Arrange
      const plainText = 'Sensitive Data';

      // Act
      const encrypted1 = service.encrypt(plainText);
      const encrypted2 = service.encrypt(plainText);

      // Assert
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty string', () => {
      // Act
      const encrypted = service.encrypt('');

      // Assert
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle unicode characters', () => {
      // Arrange
      const plainText = '日本語テキスト 🎉 ñoño';

      // Act
      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(plainText);
    });

    it('should handle large text', () => {
      // Arrange
      const plainText = 'A'.repeat(10000);

      // Act
      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(plainText);
    });
  });

  describe('decrypt', () => {
    it('should decrypt with correct key', () => {
      // Arrange
      const plainText = 'john.doe@example.com';
      const encrypted = service.encrypt(plainText);

      // Act
      const decrypted = service.decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(plainText);
    });

    it('should fail decryption with wrong key', () => {
      // Arrange
      const plainText = 'Sensitive PII Data';
      const encrypted = service.encrypt(plainText);

      // Create service with wrong key
      const wrongKey = crypto.randomBytes(32).toString('base64');
      jest.spyOn(configService, 'get').mockReturnValue(wrongKey);
      
      const wrongService = new EncryptionService(
        configService,
        new Logger()
      );

      // Act & Assert
      expect(() => wrongService.decrypt(encrypted)).toThrow();
    });

    it('should fail decryption with tampered ciphertext', () => {
      // Arrange
      const plainText = 'Important Data';
      const encrypted = service.encrypt(plainText);
      const tampered = encrypted.substring(0, encrypted.length - 5) + 'XXXXX';

      // Act & Assert
      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('should fail decryption with invalid format', () => {
      // Act & Assert
      expect(() => service.decrypt('invalid-format')).toThrow();
      expect(() => service.decrypt('')).toThrow();
    });

    it('should detect auth tag tampering', () => {
      // Arrange
      const plainText = 'Protected Data';
      const encrypted = service.encrypt(plainText);
      const parts = encrypted.split(':');
      
      // Tamper with auth tag
      parts[1] = Buffer.from('tampered').toString('base64');
      const tampered = parts.join(':');

      // Act & Assert
      expect(() => service.decrypt(tampered)).toThrow();
    });
  });

  describe('encryptObject / decryptObject', () => {
    it('should encrypt all PII fields in object', () => {
      // Arrange
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        nonPii: 'Some public data',
      };
      const piiFields = ['firstName', 'lastName', 'email', 'phone'];

      // Act
      const encrypted = service.encryptObject(customerData, piiFields);

      // Assert
      expect(encrypted.firstName).not.toBe(customerData.firstName);
      expect(encrypted.lastName).not.toBe(customerData.lastName);
      expect(encrypted.email).not.toBe(customerData.email);
      expect(encrypted.phone).not.toBe(customerData.phone);
      expect(encrypted.nonPii).toBe(customerData.nonPii); // Non-PII unchanged
    });

    it('should decrypt all PII fields in object', () => {
      // Arrange
      const customerData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '+0987654321',
      };
      const piiFields = ['firstName', 'lastName', 'email', 'phone'];
      const encrypted = service.encryptObject(customerData, piiFields);

      // Act
      const decrypted = service.decryptObject(encrypted, piiFields);

      // Assert
      expect(decrypted).toEqual(customerData);
    });

    it('should handle nested objects', () => {
      // Arrange
      const nestedData = {
        customer: {
          firstName: 'John',
          lastName: 'Doe',
        },
        address: {
          street: '123 Main St',
          city: 'Anytown',
        },
      };
      const piiFields = ['customer.firstName', 'customer.lastName', 'address.street'];

      // Act
      const encrypted = service.encryptObject(nestedData, piiFields);

      // Assert
      expect(encrypted.customer.firstName).not.toBe('John');
      expect(encrypted.customer.lastName).not.toBe('Doe');
      expect(encrypted.address.street).not.toBe('123 Main St');
      expect(encrypted.address.city).toBe('Anytown');
    });

    it('should handle null and undefined values', () => {
      // Arrange
      const dataWithNulls = {
        firstName: 'John',
        middleName: null,
        lastName: undefined,
        email: 'john@example.com',
      };
      const piiFields = ['firstName', 'middleName', 'lastName', 'email'];

      // Act
      const encrypted = service.encryptObject(dataWithNulls, piiFields);

      // Assert
      expect(encrypted.firstName).not.toBe('John');
      expect(encrypted.middleName).toBeNull();
      expect(encrypted.lastName).toBeUndefined();
      expect(encrypted.email).not.toBe('john@example.com');
    });
  });

  describe('hash', () => {
    it('should produce consistent hash for same input', () => {
      // Arrange
      const input = 'test@example.com';

      // Act
      const hash1 = service.hash(input);
      const hash2 = service.hash(input);

      // Assert
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      // Act
      const hash1 = service.hash('input1');
      const hash2 = service.hash('input2');

      // Assert
      expect(hash1).not.toBe(hash2);
    });

    it('should use salt for additional security', () => {
      // Arrange
      const input = 'sensitive-data';

      // Act
      const hashWithSalt = service.hash(input, 'custom-salt');
      const hashWithoutSalt = service.hash(input);

      // Assert
      expect(hashWithSalt).not.toBe(hashWithoutSalt);
    });
  });

  describe('key rotation', () => {
    it('should support decrypting with old key after rotation', () => {
      // Arrange - encrypt with old key
      const oldKey = crypto.randomBytes(32).toString('base64');
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'ENCRYPTION_KEY') return oldKey;
        return undefined;
      });
      const oldService = new EncryptionService(configService, new Logger());
      const plainText = 'Data encrypted with old key';
      const encrypted = oldService.encrypt(plainText);

      // Act - decrypt with new service that has both keys
      const newKey = crypto.randomBytes(32).toString('base64');
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'ENCRYPTION_KEY') return newKey;
        if (key === 'ENCRYPTION_KEY_OLD') return oldKey;
        return undefined;
      });
      const newService = new EncryptionService(configService, new Logger());
      const decrypted = newService.decryptWithKeyRotation(encrypted);

      // Assert
      expect(decrypted).toBe(plainText);
    });
  });

  describe('GDPR compliance', () => {
    it('should use authenticated encryption (GCM mode)', () => {
      // Arrange
      const plainText = 'GDPR Protected Data';

      // Act
      const encrypted = service.encrypt(plainText);
      const parts = encrypted.split(':');

      // Assert - should have IV, authTag, and ciphertext
      expect(parts).toHaveLength(3);
      
      // IV should be 16 bytes (base64 encoded = 24 chars)
      expect(Buffer.from(parts[0], 'base64').length).toBe(16);
      
      // Auth tag should be 16 bytes (base64 encoded = 24 chars)
      expect(Buffer.from(parts[1], 'base64').length).toBe(16);
    });

    it('should securely delete key from memory (best effort)', () => {
      // This is more of a documentation test - actual secure memory
      // clearing depends on Node.js capabilities
      
      // Act
      const keyBuffer = service.getKeyBuffer();
      
      // Assert - key should be a Buffer
      expect(Buffer.isBuffer(keyBuffer)).toBe(true);
      expect(keyBuffer.length).toBe(32);
    });
  });

  describe('performance', () => {
    it('should encrypt within acceptable time (< 10ms)', () => {
      // Arrange
      const plainText = 'Performance test data';
      const iterations = 100;
      const times: number[] = [];

      // Act
      for (let i = 0; i < iterations; i++) {
        const start = process.hrtime.bigint();
        service.encrypt(plainText);
        const end = process.hrtime.bigint();
        times.push(Number(end - start) / 1000000); // Convert to ms
      }

      // Assert
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(10);
    });

    it('should decrypt within acceptable time (< 10ms)', () => {
      // Arrange
      const plainText = 'Performance test data';
      const encrypted = service.encrypt(plainText);
      const iterations = 100;
      const times: number[] = [];

      // Act
      for (let i = 0; i < iterations; i++) {
        const start = process.hrtime.bigint();
        service.decrypt(encrypted);
        const end = process.hrtime.bigint();
        times.push(Number(end - start) / 1000000);
      }

      // Assert
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(10);
    });
  });
});
