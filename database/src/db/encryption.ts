// ============================================================================
// MechMind OS v10 - PII Encryption Utilities
// TypeScript helpers for PostgreSQL pgcrypto integration
// ============================================================================
// 
// This module provides client-side utilities for working with encrypted PII
// stored in PostgreSQL using the pgcrypto extension.
//
// IMPORTANT: The actual encryption/decryption happens in PostgreSQL via
// the pgcrypto extension. This module provides:
// - Type-safe interfaces for encrypted data
// - Key management integration
// - Helper functions for common operations
//
// ============================================================================

import { PrismaClient } from '@prisma/client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface EncryptedCustomerData {
  id: string;
  phoneEncrypted: Buffer;
  emailEncrypted: Buffer;
  nameEncrypted: Buffer;
  gdprConsent: boolean;
  gdprConsentDate?: Date;
  dataRetentionDays: number;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
}

export interface DecryptedCustomerData {
  id: string;
  phone: string;
  email: string;
  name: string;
  gdprConsent: boolean;
  gdprConsentDate?: Date;
  dataRetentionDays: number;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
}

export interface EncryptionKey {
  id: string;
  tenantId: string;
  keyName: string;
  keyReference: string;
  algorithm: string;
  createdAt: Date;
  rotatedAt?: Date;
  isActive: boolean;
}

export interface KMSProvider {
  getKey(keyReference: string): Promise<string>;
  rotateKey(keyReference: string): Promise<string>;
}

// ============================================================================
// ENCRYPTION SERVICE CLASS
// ============================================================================

export class PIIEncryptionService {
  private prisma: PrismaClient;
  private kmsProvider: KMSProvider;
  private keyCache: Map<string, { key: string; expiresAt: number }> = new Map();
  private readonly KEY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(prisma: PrismaClient, kmsProvider: KMSProvider) {
    this.prisma = prisma;
    this.kmsProvider = kmsProvider;
  }

  // ========================================================================
  // KEY MANAGEMENT
  // ========================================================================

  /**
   * Get encryption key for a tenant (with caching)
   */
  async getTenantEncryptionKey(tenantId: string): Promise<string> {
    const cacheKey = `tenant:${tenantId}`;
    const cached = this.keyCache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.key;
    }

    // Fetch key reference from database
    const keyRecord = await this.prisma.$queryRaw<EncryptionKey[]>`
      SELECT * FROM encryption_keys
      WHERE tenant_id = ${tenantId}::uuid
        AND is_active = true
        AND key_name = 'primary-customer-key'
      LIMIT 1
    `;

    if (!keyRecord || keyRecord.length === 0) {
      throw new Error(`No active encryption key found for tenant ${tenantId}`);
    }

    // Fetch actual key from KMS
    const key = await this.kmsProvider.getKey(keyRecord[0].keyReference);
    
    // Cache the key
    this.keyCache.set(cacheKey, {
      key,
      expiresAt: Date.now() + this.KEY_CACHE_TTL_MS,
    });

    return key;
  }

  /**
   * Clear the key cache (useful for key rotation)
   */
  clearKeyCache(): void {
    this.keyCache.clear();
  }

  /**
   * Invalidate a specific tenant's cached key
   */
  invalidateTenantKey(tenantId: string): void {
    this.keyCache.delete(`tenant:${tenantId}`);
  }

  // ========================================================================
  // CUSTOMER ENCRYPTION OPERATIONS
  // ========================================================================

  /**
   * Create a new customer with encrypted PII fields
   */
  async createEncryptedCustomer(
    tenantId: string,
    data: {
      phone: string;
      email: string;
      name: string;
      gdprConsent?: boolean;
    }
  ): Promise<string> {
    const encryptionKey = await this.getTenantEncryptionKey(tenantId);

    const result = await this.prisma.$queryRaw<{ create_encrypted_customer: string }[]>`
      SELECT create_encrypted_customer(
        ${tenantId}::uuid,
        ${data.phone},
        ${data.email},
        ${data.name},
        ${encryptionKey},
        ${data.gdprConsent ?? false}
      ) as create_encrypted_customer
    `;

    if (!result || result.length === 0) {
      throw new Error('Failed to create encrypted customer');
    }

    return result[0].create_encrypted_customer;
  }

  /**
   * Decrypt customer data by ID
   */
  async decryptCustomer(
    tenantId: string,
    customerId: string
  ): Promise<DecryptedCustomerData | null> {
    const encryptionKey = await this.getTenantEncryptionKey(tenantId);

    const result = await this.prisma.$queryRaw<DecryptedCustomerData[]>`
      SELECT * FROM decrypt_customer(
        ${customerId}::uuid,
        ${encryptionKey}
      )
    `;

    if (!result || result.length === 0) {
      return null;
    }

    return result[0];
  }

  /**
   * Update encrypted customer data
   */
  async updateEncryptedCustomer(
    tenantId: string,
    customerId: string,
    data: Partial<{
      phone: string;
      email: string;
      name: string;
    }>
  ): Promise<boolean> {
    const encryptionKey = await this.getTenantEncryptionKey(tenantId);

    // Set tenant context for RLS
    await this.setTenantContext(tenantId);

    const result = await this.prisma.$queryRaw<{ update_encrypted_customer: boolean }[]>`
      SELECT update_encrypted_customer(
        ${customerId}::uuid,
        ${encryptionKey},
        ${data.phone ?? null},
        ${data.email ?? null},
        ${data.name ?? null}
      ) as update_encrypted_customer
    `;

    return result?.[0]?.update_encrypted_customer ?? false;
  }

  /**
   * Anonymize customer data (GDPR right to erasure)
   */
  async anonymizeCustomer(
    tenantId: string,
    customerId: string
  ): Promise<boolean> {
    const encryptionKey = await this.getTenantEncryptionKey(tenantId);

    // Set tenant context for RLS
    await this.setTenantContext(tenantId);

    const result = await this.prisma.$queryRaw<{ anonymize_customer: boolean }[]>`
      SELECT anonymize_customer(
        ${customerId}::uuid,
        ${encryptionKey}
      ) as anonymize_customer
    `;

    return result?.[0]?.anonymize_customer ?? false;
  }

  // ========================================================================
  // BATCH OPERATIONS
  // ========================================================================

  /**
   * Decrypt multiple customers in a batch
   */
  async decryptCustomersBatch(
    tenantId: string,
    customerIds: string[]
  ): Promise<DecryptedCustomerData[]> {
    const encryptionKey = await this.getTenantEncryptionKey(tenantId);

    const result = await this.prisma.$queryRaw<DecryptedCustomerData[]>`
      SELECT * FROM decrypt_customer(c.id, ${encryptionKey})
      FROM customers_encrypted c
      WHERE c.id = ANY(${customerIds}::uuid[])
        AND c.tenant_id = ${tenantId}::uuid
    `;

    return result || [];
  }

  /**
   * Search customers by encrypted email (requires exact match)
   * Note: This is limited - full-text search on encrypted data requires
   * additional indexing strategies
   */
  async findCustomerByEmail(
    tenantId: string,
    email: string
  ): Promise<string | null> {
    const encryptionKey = await this.getTenantEncryptionKey(tenantId);

    // Encrypt the search email
    const encryptedEmail = await this.prisma.$queryRaw<{ encrypted: Buffer }[]>`
      SELECT encrypt_pii(${email}, ${encryptionKey}) as encrypted
    `;

    if (!encryptedEmail || encryptedEmail.length === 0) {
      return null;
    }

    // Search for exact match
    const result = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM customers_encrypted
      WHERE tenant_id = ${tenantId}::uuid
        AND email_encrypted = ${encryptedEmail[0].encrypted}
        AND is_deleted = false
      LIMIT 1
    `;

    return result?.[0]?.id ?? null;
  }

  // ========================================================================
  // GDPR COMPLIANCE OPERATIONS
  // ========================================================================

  /**
   * Enforce data retention policies
   * Returns number of customers soft-deleted
   */
  async enforceDataRetention(): Promise<number> {
    const result = await this.prisma.$queryRaw<{ enforce_data_retention: number }[]>`
      SELECT enforce_data_retention() as enforce_data_retention
    `;

    return result?.[0]?.enforce_data_retention ?? 0;
  }

  /**
   * Get customers pending deletion (past retention period)
   */
  async getCustomersPendingDeletion(
    tenantId: string,
    daysThreshold: number = 30
  ): Promise<string[]> {
    const result = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM customers_encrypted
      WHERE tenant_id = ${tenantId}::uuid
        AND is_deleted = false
        AND gdpr_consent = true
        AND created_at < NOW() - ((data_retention_days + ${daysThreshold}) || ' days')::interval
    `;

    return result?.map(r => r.id) ?? [];
  }

  /**
   * Export customer data (GDPR right to data portability)
   */
  async exportCustomerData(
    tenantId: string,
    customerId: string
  ): Promise<{
    customer: DecryptedCustomerData;
    vehicles: any[];
    bookings: any[];
    invoices: any[];
  } | null> {
    const customer = await this.decryptCustomer(tenantId, customerId);
    
    if (!customer) {
      return null;
    }

    // Set tenant context for RLS
    await this.setTenantContext(tenantId);

    const [vehicles, bookings, invoices] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT * FROM vehicles
        WHERE customer_id = ${customerId}::uuid
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT b.*, bs.slot_date, bs.slot_start, bs.slot_end
        FROM bookings b
        JOIN booking_slots bs ON b.slot_id = bs.id
        WHERE b.customer_id = ${customerId}::uuid
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT * FROM invoices
        WHERE customer_id = ${customerId}::uuid
      `,
    ]);

    return {
      customer,
      vehicles: vehicles || [],
      bookings: bookings || [],
      invoices: invoices || [],
    };
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Set the tenant context for RLS policies
   */
  private async setTenantContext(tenantId: string): Promise<void> {
    await this.prisma.$executeRaw`SET app.current_tenant = ${tenantId}`;
  }
}

// ============================================================================
// KMS PROVIDER IMPLEMENTATIONS
// ============================================================================

/**
 * AWS KMS Provider
 */
export class AWSKMSProvider implements KMSProvider {
  private kmsClient: any; // AWS KMS client
  private region: string;

  constructor(region: string = 'us-east-1') {
    this.region = region;
    // Initialize AWS KMS client
    // this.kmsClient = new AWS.KMS({ region });
  }

  async getKey(keyReference: string): Promise<string> {
    // In production, decrypt the data key using AWS KMS
    // const result = await this.kmsClient.decrypt({
    //   CiphertextBlob: Buffer.from(keyReference, 'base64'),
    // }).promise();
    // return result.Plaintext.toString('base64');
    
    // Placeholder for demo
    throw new Error('AWS KMS integration not implemented');
  }

  async rotateKey(keyReference: string): Promise<string> {
    // Generate new data key
    // const result = await this.kmsClient.generateDataKey({
    //   KeyId: keyReference,
    //   KeySpec: 'AES_256',
    // }).promise();
    // return result.Plaintext.toString('base64');
    
    throw new Error('AWS KMS integration not implemented');
  }
}

/**
 * HashiCorp Vault KMS Provider
 */
export class VaultKMSProvider implements KMSProvider {
  private vaultClient: any;
  private mountPath: string;

  constructor(vaultAddress: string, mountPath: string = 'transit') {
    this.mountPath = mountPath;
    // Initialize Vault client
    // this.vaultClient = vault({ apiVersion: 'v1', endpoint: vaultAddress });
  }

  async getKey(keyReference: string): Promise<string> {
    // Read key from Vault
    // const result = await this.vaultClient.read(`${this.mountPath}/keys/${keyReference}`);
    // return result.data.keys['1']; // Latest version
    
    throw new Error('Vault integration not implemented');
  }

  async rotateKey(keyReference: string): Promise<string> {
    // Rotate key in Vault
    // await this.vaultClient.write(`${this.mountPath}/keys/${keyReference}/rotate`);
    // return this.getKey(keyReference);
    
    throw new Error('Vault integration not implemented');
  }
}

/**
 * Development/Demo KMS Provider (NOT FOR PRODUCTION)
 */
export class DemoKMSProvider implements KMSProvider {
  private keys: Map<string, string> = new Map();

  constructor() {
    // Pre-populate with demo keys
    this.keys.set('aws:kms:us-east-1:123456789:key/autofix-customer-001', 'demo-key-001');
    this.keys.set('aws:kms:us-east-1:123456789:key/quicklube-customer-001', 'demo-key-002');
    this.keys.set('aws:kms:us-east-1:123456789:key/elite-customer-001', 'demo-key-003');
  }

  async getKey(keyReference: string): Promise<string> {
    const key = this.keys.get(keyReference);
    if (!key) {
      throw new Error(`Key not found: ${keyReference}`);
    }
    return key;
  }

  async rotateKey(keyReference: string): Promise<string> {
    const newKey = `rotated-${Date.now()}`;
    this.keys.set(keyReference, newKey);
    return newKey;
  }

  setKey(keyReference: string, key: string): void {
    this.keys.set(keyReference, key);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createEncryptionService(
  prisma: PrismaClient,
  kmsType: 'aws' | 'vault' | 'demo' = 'demo',
  config?: any
): PIIEncryptionService {
  let kmsProvider: KMSProvider;

  switch (kmsType) {
    case 'aws':
      kmsProvider = new AWSKMSProvider(config?.region);
      break;
    case 'vault':
      kmsProvider = new VaultKMSProvider(config?.address, config?.mountPath);
      break;
    case 'demo':
    default:
      kmsProvider = new DemoKMSProvider();
      break;
  }

  return new PIIEncryptionService(prisma, kmsProvider);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  PIIEncryptionService,
  AWSKMSProvider,
  VaultKMSProvider,
  DemoKMSProvider,
  createEncryptionService,
};
