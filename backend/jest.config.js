module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  setupFiles: ['../jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/common/__tests__/setup.ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  maxWorkers: 1, // Run tests sequentially to avoid BigInt serialization issues
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
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.spec.ts',
    '!**/index.ts',
    '!**/*.module.ts',
    '!**/dto/**',
    '!**/processors/**',
    '!main.ts',
    '!lambda.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@auth/(.*)$': '<rootDir>/auth/$1',
    '^@booking/(.*)$': '<rootDir>/booking/$1',
    '^@voice/(.*)$': '<rootDir>/voice/$1',
    '^@customer/(.*)$': '<rootDir>/customer/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@gdpr/(.*)$': '<rootDir>/gdpr/$1',
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
  ],
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
