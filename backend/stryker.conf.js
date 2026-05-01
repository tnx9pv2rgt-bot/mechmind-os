// @ts-nocheck
module.exports = {
  mutate: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.mock.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/index.ts',
  ],

  testRunner: 'jest',
  coverageAnalysis: 'perTest',

  jest: {
    config: require('./jest.config.js'),
    enableFindRelatedTests: true,
  },

  thresholds: {
    high: 80,
    low: 60,
    break: 80,
  },

  incremental: true,

  timeoutMS: 60000,
  timeoutFactor: 1.5,
  maxTestRunnerReuse: 1,

  reporters: ['html', 'json', 'progress', 'clear-text'],

  concurrency: 4,

  ignoreStatic: true,

  plugins: ['@stryker-mutator/jest-runner', '@stryker-mutator/typescript-checker'],

  typescriptChecker: {
    prioritizePerformanceOverAccuracy: true,
  },

  checkers: ['typescript'],
  disableTypeChecks: false,
};
