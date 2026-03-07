/**
 * Jest setup file for integration tests
 */

// Ensure test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Use test database
process.env.DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:5432/mechmind_test';

// Test encryption keys
process.env.ENCRYPTION_KEY = 'integration-test-encryption-key-32!';
process.env.ENCRYPTION_IV = 'integration-iv-16!';

// Redis test configuration
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.REDIS_DB = '2'; // Use different DB for integration tests

// JWT test secret
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-integration';

// Global test timeout for integration tests (2 minutes)
jest.setTimeout(120000);

// Global teardown
afterAll(async () => {
  // Add any global cleanup here
  await new Promise(resolve => setTimeout(resolve, 1000));
});
