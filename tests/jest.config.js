/**
 * MechMind OS v10 - Jest Configuration
 * Comprehensive test configuration for unit, integration, and e2e tests
 */

module.exports = {
  // Root directory for tests
  rootDir: '.',
  
  // Test environment
  testEnvironment: 'node',
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'ts'],
  
  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^@test/(.*)$': '<rootDir>/utils/$1',
    '^@unit/(.*)$': '<rootDir>/unit/$1',
    '^@integration/(.*)$': '<rootDir>/integration/$1',
  },
  
  // Transform configuration for TypeScript
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  
  // Test match patterns
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts',
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/utils/test-setup.ts'],
  
  // Coverage configuration
  collectCoverageFrom: [
    '../src/**/*.ts',
    '!../src/**/*.dto.ts',
    '!../src/**/*.entity.ts',
    '!../src/**/*.module.ts',
    '!../src/main.ts',
    '!../src/**/*.spec.ts',
  ],
  
  // Coverage thresholds - STRICT for MechMind OS
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // Critical paths require higher coverage
    './src/booking/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/encryption/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/gdpr/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
  ],
  
  // Coverage output directory
  coverageDirectory: '<rootDir>/coverage',
  
  // Verbose output for CI
  verbose: true,
  
  // Fail on console errors/warnings in tests
  errorOnDeprecated: true,
  
  // Test timeout (10s for unit, increased for integration)
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Maximum workers for parallel execution
  maxWorkers: '50%',
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/reports',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
  
  // Global setup/teardown
  globalSetup: '<rootDir>/utils/global-setup.ts',
  globalTeardown: '<rootDir>/utils/global-teardown.ts',
  
  // Detect open handles (for async operations)
  detectOpenHandles: true,
  
  // Force exit after all tests complete
  forceExit: true,
};
