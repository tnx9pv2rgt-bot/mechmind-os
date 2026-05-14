import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/qa-nexo-deep.spec.ts', '**/timeout-verify.spec.ts'],
  timeout: 45_000,
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'bug-reports/qa-results.json' }],
    ['html', { outputFile: 'bug-reports/qa-report.html', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    testIdAttribute: 'data-testid',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer config — frontend dev server already running on :3000
  webServer: undefined,
});
