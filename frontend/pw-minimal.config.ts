import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/critical-path.spec.ts'],
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3001',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- -p 3001',
    port: 3001,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
