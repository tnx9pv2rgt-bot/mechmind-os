/**
 * MechMind OS v10 - Test Setup
 * Global test configuration and utilities
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = 'mechmind_test';

// Global test timeout override for critical paths
jest.setTimeout(10000);

// Mock console methods in CI environment
if (process.env.CI === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidTimestamp(): R;
      toBeEncrypted(): R;
      toBeWithinRange(min: number, max: number): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid UUID`,
      pass,
    };
  },

  toBeValidTimestamp(received: Date | string | number) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime());
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid timestamp`,
      pass,
    };
  },

  toBeEncrypted(received: string) {
    // Check if string appears to be encrypted (base64-like with minimum length)
    const encryptedRegex = /^[A-Za-z0-9+/=]{32,}$/;
    const pass = encryptedRegex.test(received) && received.length > 32;
    return {
      message: () => `expected value ${pass ? 'not ' : ''}to be encrypted`,
      pass,
    };
  },

  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be within range [${min}, ${max}]`,
      pass,
    };
  },
});

// Global beforeAll - runs once before all tests
beforeAll(async () => {
  // Any global setup
});

// Global afterAll - runs once after all tests
afterAll(async () => {
  // Any global cleanup
});

// Global beforeEach - runs before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Global afterEach - runs after each test
afterEach(() => {
  // Cleanup after each test
});
