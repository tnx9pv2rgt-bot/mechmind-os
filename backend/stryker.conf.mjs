// @ts-nocheck
export default {
  mutate: [
    'src/analytics/services/kpi.service.ts',
  ],
  testRunner: 'jest',
  jest: {
    configFile: 'jest.config.js',
  },
  reporters: ['clear-text', 'json'],
  reporterOptions: {
    json: 'coverage/stryker-report.json',
  },
  timeout: 10000,
  timeoutFactor: 1.5,
  concurrency: 1,
};
