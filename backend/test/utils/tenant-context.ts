/**
 * Tenant Context Test Utility
 *
 * Provides helpers to set up multi-tenant test scenarios.
 */

export const TEST_TENANT_ID = 'tenant-test-001';
export const TEST_TENANT_SLUG = 'test-shop';
export const TEST_TENANT_NAME = 'Test Auto Shop';

export const TEST_TENANT = {
  id: TEST_TENANT_ID,
  name: TEST_TENANT_NAME,
  slug: TEST_TENANT_SLUG,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const TEST_USER_ID = 'user-test-001';
export const TEST_USER_EMAIL = 'admin@testshop.com';

export const TEST_USER = {
  id: TEST_USER_ID,
  email: TEST_USER_EMAIL,
  name: 'Test Admin',
  role: 'ADMIN',
  isActive: true,
  tenantId: TEST_TENANT_ID,
  tenant: TEST_TENANT,
  passwordHash: '$2b$12$LJ3m4ys.rZm/RZFfO.dKqeNr9BhZSPNN0jEWGZDKm/u5dVXZJVkCe', // "password123"
  totpEnabled: false,
  totpSecret: null,
  totpVerifiedAt: null,
  failedAttempts: 0,
  lockedUntil: null,
  lastLoginAt: null,
  lastLoginIp: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const TEST_CUSTOMER_ID = 'customer-test-001';

export const TEST_CUSTOMER = {
  id: TEST_CUSTOMER_ID,
  tenantId: TEST_TENANT_ID,
  encryptedName: 'encrypted-name',
  encryptedEmail: 'encrypted-email',
  encryptedPhone: 'encrypted-phone',
  emailHash: 'email-hash',
  phoneHash: 'phone-hash',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};
