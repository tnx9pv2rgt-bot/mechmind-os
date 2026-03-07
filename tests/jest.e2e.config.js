/**
 * MechMind OS v10 - E2E Test Configuration
 * End-to-end tests with full application stack
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Test environment
  testEnvironment: 'node',
  
  // Test match for e2e tests
  testMatch: [
    '<rootDir>/e2e/**/*.spec.ts',
    '<rootDir>/e2e/**/*.test.ts',
  ],
  
  // Longest timeout for full stack tests
  testTimeout: 60000,
  
  // Run e2e tests sequentially
  maxWorkers: 1,
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/utils/test-setup.ts',
    '<rootDir>/utils/e2e-setup.ts',
  ],
  
  // Module name mapper
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^@test/(.*)$': '<rootDir>/utils/$1',
  },
  
  // Coverage for e2e
  collectCoverage: false,
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/reports',
        outputName: 'e2e-junit.xml',
        classNameTemplate: 'E2E.{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
  
  // Don't detect open handles
  detectOpenHandles: false,
};
