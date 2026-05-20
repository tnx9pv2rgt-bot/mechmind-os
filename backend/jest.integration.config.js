// @ts-nocheck
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'tests/integration/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: {
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          strictNullChecks: true,
          noImplicitAny: true,
          skipLibCheck: true,
        },
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/lambda.ts',
  ],
  coverageDirectory: './coverage-integration',
  testEnvironment: 'node',
  automock: false,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@booking/(.*)$': '<rootDir>/src/booking/$1',
    '^@voice/(.*)$': '<rootDir>/src/voice/$1',
    '^@customer/(.*)$': '<rootDir>/src/customer/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@gdpr/(.*)$': '<rootDir>/src/gdpr/$1',
  },
  setupFiles: ['./test/e2e/real-db/jest-setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup-integration.ts'],
  testTimeout: 120000, // 2 minutes for integration tests
  transformIgnorePatterns: ['node_modules/(?!(jose|uuid)/)'],
};
