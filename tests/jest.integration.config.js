/**
 * MechMind OS v10 - Integration Test Configuration
 * Separate config for integration tests with database connections
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Test environment with database support
  testEnvironment: '<rootDir>/utils/integration-test-environment.ts',
  
  // Test match for integration tests only
  testMatch: [
    '<rootDir>/integration/**/*.spec.ts',
    '<rootDir>/integration/**/*.test.ts',
  ],
  
  // Longer timeout for database operations
  testTimeout: 30000,
  
  // Run integration tests sequentially (avoid database conflicts)
  maxWorkers: 1,
  
  // Setup files specific to integration tests
  setupFilesAfterEnv: [
    '<rootDir>/utils/test-setup.ts',
    '<rootDir>/utils/integration-setup.ts',
  ],
  
  // Coverage configuration for integration tests
  collectCoverageFrom: [
    '../src/**/*.ts',
    '!../src/**/*.dto.ts',
    '!../src/**/*.entity.ts',
    '!../src/**/*.module.ts',
    '!../src/main.ts',
  ],
  
  // Different coverage thresholds for integration
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  
  // Reporter for integration tests
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/reports',
        outputName: 'integration-junit.xml',
        classNameTemplate: 'Integration.{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
  
  // Don't detect open handles (integration tests have long-lived connections)
  detectOpenHandles: false,
  
  // Don't force exit (let connections close gracefully)
  forceExit: false,
};
