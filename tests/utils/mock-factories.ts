/**
 * MechMind OS v10 - Mock Factories
 * Factory functions for creating test data
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

// Types for test data
export interface Tenant {
  id: string;
  name: string;
  subscriptionTier: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shop {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  createdAt: Date;
}

export interface Customer {
  id: string;
  tenantId: string;
  shopId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  gdprConsent: boolean;
  gdprConsentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Booking {
  id: string;
  tenantId: string;
  shopId: string;
  customerId?: string;
  serviceType: string;
  scheduledAt: Date;
  durationMinutes: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  technicianId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Event {
  id: string;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  createdBy?: string;
}

export interface GDPRAuditLog {
  id: string;
  tenantId: string;
  customerId?: string;
  action: string;
  dataSubject?: string;
  details?: Record<string, unknown>;
  performedBy?: string;
  performedAt: Date;
  legalBasis?: string;
}

// Encryption key for tests
const TEST_ENCRYPTION_KEY = crypto.randomBytes(32);

/**
 * Encrypt PII for test data
 */
export function encryptPII(plainText: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', TEST_ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt PII for test verification
 */
export function decryptPII(encryptedText: string): string {
  const [ivBase64, authTagBase64, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', TEST_ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Tenant factory
 */
export function createTenant(overrides: Partial<Tenant> = {}): Tenant {
  const now = new Date();
  return {
    id: uuidv4(),
    name: `Test Tenant ${Math.floor(Math.random() * 10000)}`,
    subscriptionTier: 'basic',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Shop factory
 */
export function createShop(tenantId: string, overrides: Partial<Shop> = {}): Shop {
  return {
    id: uuidv4(),
    tenantId,
    name: `Test Shop ${Math.floor(Math.random() * 10000)}`,
    address: `${Math.floor(Math.random() * 9999)} Test Street, Test City`,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Customer factory with encrypted PII
 */
export function createCustomer(
  tenantId: string,
  shopId: string,
  overrides: Partial<Customer> = {},
  encrypt: boolean = true
): Customer & { firstNameEncrypted?: string; lastNameEncrypted?: string; phoneEncrypted?: string; emailEncrypted?: string } {
  const firstName = overrides.firstName || `First${Math.floor(Math.random() * 10000)}`;
  const lastName = overrides.lastName || `Last${Math.floor(Math.random() * 10000)}`;
  const phone = overrides.phone || `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
  const email = overrides.email || `test${Math.floor(Math.random() * 10000)}@example.com`;
  const now = new Date();
  
  const customer: Customer & { firstNameEncrypted?: string; lastNameEncrypted?: string; phoneEncrypted?: string; emailEncrypted?: string } = {
    id: uuidv4(),
    tenantId,
    shopId,
    firstName,
    lastName,
    phone,
    email,
    gdprConsent: true,
    gdprConsentDate: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  
  if (encrypt) {
    customer.firstNameEncrypted = encryptPII(firstName);
    customer.lastNameEncrypted = encryptPII(lastName);
    customer.phoneEncrypted = encryptPII(phone);
    customer.emailEncrypted = email ? encryptPII(email) : undefined;
  }
  
  return customer;
}

/**
 * Booking factory
 */
export function createBooking(
  tenantId: string,
  shopId: string,
  overrides: Partial<Booking> = {}
): Booking {
  const now = new Date();
  // Round to next hour
  const scheduledAt = new Date(now);
  scheduledAt.setHours(scheduledAt.getHours() + 1, 0, 0, 0);
  
  return {
    id: uuidv4(),
    tenantId,
    shopId,
    serviceType: 'oil_change',
    scheduledAt,
    durationMinutes: 60,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Event factory
 */
export function createEvent(
  tenantId: string,
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  eventData: Record<string, unknown>,
  overrides: Partial<Event> = {}
): Event {
  return {
    id: uuidv4(),
    tenantId,
    aggregateType,
    aggregateId,
    eventType,
    eventData,
    metadata: {},
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * GDPR audit log factory
 */
export function createGDPRAuditLog(
  tenantId: string,
  action: string,
  overrides: Partial<GDPRAuditLog> = {}
): GDPRAuditLog {
  return {
    id: uuidv4(),
    tenantId,
    action,
    details: {},
    performedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create multiple entities
 */
export function createMany<T>(
  factory: () => T,
  count: number
): T[] {
  return Array.from({ length: count }, factory);
}

/**
 * Create test scenario with tenant, shop, and customers
 */
export function createTestScenario(customerCount: number = 3): {
  tenant: Tenant;
  shop: Shop;
  customers: Customer[];
} {
  const tenant = createTenant();
  const shop = createShop(tenant.id);
  const customers = Array.from({ length: customerCount }, () =>
    createCustomer(tenant.id, shop.id)
  );
  
  return { tenant, shop, customers };
}

/**
 * Create concurrent booking scenario
 */
export function createConcurrentBookingScenario(
  tenantId: string,
  shopId: string,
  customerCount: number,
  scheduledAt: Date
): Booking[] {
  return Array.from({ length: customerCount }, (_, i) =>
    createBooking(tenantId, shopId, {
      scheduledAt: new Date(scheduledAt),
      durationMinutes: 60,
      serviceType: i % 2 === 0 ? 'oil_change' : 'tire_rotation',
    })
  );
}

/**
 * JWT token factory for testing
 */
export function createTestJWT(
  payload: Record<string, unknown>,
  secret: string = 'test-secret'
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

/**
 * Create tenant-scoped JWT
 */
export function createTenantJWT(
  tenantId: string,
  userId: string = uuidv4(),
  roles: string[] = ['shop_manager']
): string {
  return createTestJWT({
    sub: userId,
    tenant_id: tenantId,
    roles,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

/**
 * Voice webhook payload factory
 */
export function createVoiceWebhookPayload(
  eventType: string = 'call.completed',
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    event: eventType,
    call_id: uuidv4(),
    timestamp: new Date().toISOString(),
    transcript: 'I need to book an oil change for tomorrow at 2pm',
    intent: 'booking_request',
    entities: {
      service: 'oil_change',
      date: 'tomorrow',
      time: '14:00',
    },
    ...overrides,
  };
}

/**
 * Generate HMAC signature for webhook verification
 */
export function generateHMACSignature(
  payload: string,
  secret: string = 'webhook-secret'
): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
