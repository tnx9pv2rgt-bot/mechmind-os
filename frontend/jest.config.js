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
    // app/auth/page.tsx: complex multi-step auth flow. GoogleOneTap and
    // handleGoogleLogin are intentionally untested (require live Google SDK).
    // Thresholds reflect what the test suite can realistically cover.
    './app/auth/page.tsx': {
      statements: 80,
      branches: 75,
      functions: 65,
      lines: 80,
    },
    // customers module: server-page.tsx is a Next.js Server Component (headers/cookies)
    // not testable in Jest; thresholds reflect realistic unit-test coverage.
    './app/dashboard/customers/': {
      statements: 85,
      branches: 75,
      functions: 70,
      lines: 85,
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
