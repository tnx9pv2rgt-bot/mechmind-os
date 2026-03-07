/**
 * Jest Configuration for Integration Tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/utils/setup.ts',
  ],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/styles/(.*)$': '<rootDir>/styles/$1',
    '^@/i18n$': '<rootDir>/i18n/index.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },

  // Test file patterns - include integration tests
  testMatch: [
    '**/__tests__/api/**/*.integration.test.ts',
    '**/__tests__/components/**/*.integration.test.tsx',
    '**/__tests__/utils/**/*.test.ts',
  ],

  // Transform
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },

  // Transform ignore patterns - ensure MSW is transformed
  transformIgnorePatterns: [
    '/node_modules/(?!(msw|@mswjs)/)',
  ],

  // Coverage
  collectCoverageFrom: [
    'lib/services/**/*.{ts,tsx}',
    'components/inspections/**/*.{ts,tsx}',
    'app/api/**/*.ts',
    '!**/node_modules/**',
    '!**/*.d.ts',
  ],

  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Verbose output
  verbose: true,

  // Clear mocks
  clearMocks: true,

  // Restore mocks
  restoreMocks: true,

  // Coverage directory
  coverageDirectory: 'coverage/integration',

  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],

  // Test timeout
  testTimeout: 30000,

  // Globals
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
      },
    },
  },

  // Fail on console errors/warnings in CI
  errorOnDeprecated: true,
}
