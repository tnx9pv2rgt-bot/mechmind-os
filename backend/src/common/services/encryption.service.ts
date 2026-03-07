import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor(private readonly configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    const encryptionIv = this.configService.get<string>('ENCRYPTION_IV');

    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters');
    }

    this.key = Buffer.from(encryptionKey.slice(0, 32));
    this.iv = Buffer.from((encryptionIv || encryptionKey.slice(0, 16)).slice(0, 16));
  }

  /**
   * Encrypt sensitive data (PII)
   */
  encrypt(data: string): string {
    if (!data) return data;

    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt sensitive data (PII)
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) return encryptedData;

    try {
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt data: invalid encryption key or corrupted data');
    }
  }

  /**
   * Create a hash for lookup (e.g., phone number hash)
   * Uses HMAC for additional security
   */
  hash(data: string): string {
    if (!data) return '';
    
    const normalized = this.normalizeForHash(data);
    return crypto
      .createHmac('sha256', this.key)
      .update(normalized)
      .digest('hex');
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
  encryptFields<T extends Record<string, any>>(
    data: T,
    fieldsToEncrypt: (keyof T)[],
  ): T {
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
  decryptFields<T extends Record<string, any>>(
    data: T,
    fieldsToDecrypt: (keyof T)[],
  ): T {
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
