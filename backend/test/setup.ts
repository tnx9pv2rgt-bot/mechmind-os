/**
 * Jest setup file for unit tests
 */

// Mock environment variables
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!';
process.env.ENCRYPTION_IV = 'test-iv-16-chars!';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/mechmind_test';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_DB = '1';
process.env.JWT_SECRET = 'test-jwt-secret-key';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error,
};

// Set default timeout
jest.setTimeout(10000);
