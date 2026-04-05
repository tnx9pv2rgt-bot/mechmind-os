/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'test/e2e/.*\\.e2e-spec\\.ts$',
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
        isolatedModules: true,
      },
    ],
  },
  testEnvironment: 'node',
  setupFiles: ['./jest.setup.js'],
  setupFilesAfterEnv: ['./test/e2e/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@booking/(.*)$': '<rootDir>/src/booking/$1',
    '^@voice/(.*)$': '<rootDir>/src/voice/$1',
    '^@customer/(.*)$': '<rootDir>/src/customer/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@gdpr/(.*)$': '<rootDir>/src/gdpr/$1',
  },
  maxWorkers: 1,
  testTimeout: 30000,
};
