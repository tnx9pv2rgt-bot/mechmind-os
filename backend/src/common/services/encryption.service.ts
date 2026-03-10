import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly IV_LENGTH = 16;
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters');
    }

    this.key = Buffer.from(encryptionKey.slice(0, 32));
  }

  /**
   * Encrypt sensitive data (PII)
   * Generates a random IV per encryption and prepends it to the ciphertext.
   * Format: <16-byte IV hex><ciphertext hex>
   */
  encrypt(data: string): string {
    if (!data) return data;

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Prepend IV (hex) to ciphertext for decryption
    return iv.toString('hex') + encrypted;
  }

  /**
   * Decrypt sensitive data (PII)
   * Supports both new format (IV prepended) and legacy format (static IV).
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) return encryptedData;

    try {
      // New format: first 32 hex chars = 16-byte IV, rest = ciphertext
      if (encryptedData.length > 32) {
        const iv = Buffer.from(encryptedData.slice(0, 32), 'hex');
        const ciphertext = encryptedData.slice(32);
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
      throw new Error('Ciphertext too short');
    } catch {
      // Fallback: try legacy static IV for backward compatibility with existing data
      try {
        const legacyIv = this.getLegacyIv();
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, legacyIv);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch {
        throw new Error('Failed to decrypt data: invalid encryption key or corrupted data');
      }
    }
  }

  /**
   * Get legacy IV for backward compatibility with data encrypted before IV-per-record fix.
   */
  private getLegacyIv(): Buffer {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY')!;
    const encryptionIv = this.configService.get<string>('ENCRYPTION_IV');
    return Buffer.from((encryptionIv || encryptionKey.slice(0, 16)).slice(0, 16));
  }

  /**
   * Create a hash for lookup (e.g., phone number hash)
   * Uses HMAC for additional security
   */
  hash(data: string): string {
    if (!data) return '';

    const normalized = this.normalizeForHash(data);
    return crypto.createHmac('sha256', this.key).update(normalized).digest('hex');
  }

  /**
   * Verify if data matches a hash
   */
  verifyHash(data: string, hash: string): boolean {
    return this.hash(data) === hash;
  }

  /**
   * Encrypt an object fields selectively
   */
  encryptFields<T extends Record<string, any>>(data: T, fieldsToEncrypt: (keyof T)[]): T {
    const encrypted = { ...data };

    for (const field of fieldsToEncrypt) {
      if (typeof encrypted[field] === 'string') {
        (encrypted as any)[field] = this.encrypt(encrypted[field] as string);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt an object fields selectively
   */
  decryptFields<T extends Record<string, any>>(data: T, fieldsToDecrypt: (keyof T)[]): T {
    const decrypted = { ...data };

    for (const field of fieldsToDecrypt) {
      if (typeof decrypted[field] === 'string') {
        (decrypted as any)[field] = this.decrypt(decrypted[field] as string);
      }
    }

    return decrypted;
  }

  /**
   * Normalize data for consistent hashing
   */
  private normalizeForHash(data: string): string {
    return data
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9+]/g, '');
  }
}
