// @ts-nocheck
export default {
  projectType: 'typescript',
  package: 'npm',
  packageManager: 'npm',
  reporters: ['html', 'json', 'clear-text'],
  testRunner: 'jest',
  jest: {
    config: 'jest.config.js',
  },
  mutate: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.module.ts',
  ],
  mutator: {
    plugins: ['typescript'],
    excludedMutations: ['BoundaryOperator'],
  },
  checkers: ['typescript'],
  timeoutMS: 5000,
  timeoutFactor: 1.5,
  concurrency: 4,
  concurrency_factor: 0.75,
  thresholds: {
    high: 80,
    medium: 70,
    low: 50,
    break: 70,
  },
};
