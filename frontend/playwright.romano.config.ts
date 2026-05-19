import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/{romano-full,qa-completo,qa-auth-onboarding}.spec.ts',
  timeout: 40_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 20000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'webkit-safari',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
