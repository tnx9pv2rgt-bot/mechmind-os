/** @type {import('jest').Config} */
// @ts-nocheck

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '\\.real\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        strictNullChecks: true,
        noImplicitAny: true,
        skipLibCheck: true,
      },
      isolatedModules: true,
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jose)/)',
  ],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  automock: false,
  setupFiles: ['./test/e2e/real-db/jest-setup.ts'],
  testTimeout: 120000, // Testcontainers startup can take time
  globalSetup: './test/e2e/real-db/global-setup.ts',
  globalTeardown: './test/e2e/real-db/global-teardown.ts',
  maxWorkers: 1, // Shared DB, no parallelism
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@booking/(.*)$': '<rootDir>/src/booking/$1',
    '^@voice/(.*)$': '<rootDir>/src/voice/$1',
    '^@customer/(.*)$': '<rootDir>/src/customer/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@gdpr/(.*)$': '<rootDir>/src/gdpr/$1',
  },
};
