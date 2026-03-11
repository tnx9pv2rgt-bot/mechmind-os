/**
 * Jest Configuration for MechMind OS Frontend Tests
 * 
 * Supports:
 * - Accessibility tests
 * - Service layer unit tests
 * - Component tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/accessibility/setup.ts',
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

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],

  // Transform
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },

  // Coverage
  collectCoverageFrom: [
    'lib/accessibility/**/*.{ts,tsx}',
    'lib/auth/**/*.{ts,tsx}',
    'lib/services/**/*.{ts,tsx}',
    'components/accessibility/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'app/auth/**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/*.d.ts',
    '!**/__tests__/**',
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'lib/services/*.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Verbose output
  verbose: true,

  // Clear mocks
  clearMocks: true,

  // Coverage directory
  coverageDirectory: 'coverage',

  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
};
