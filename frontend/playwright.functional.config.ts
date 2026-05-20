import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/functional',
  timeout: 45_000,
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never', outputFolder: 'functional-report' }],
    ['list'],
    ['json', { outputFile: '/tmp/functional-results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 20000,
    navigationTimeout: 30000,
    testIdAttribute: 'data-testid',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/global.setup.ts',
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/functional/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
  ],
});
