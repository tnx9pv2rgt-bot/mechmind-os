import { defineConfig, devices } from '@playwright/test';

const DEPLOY_URL = process.env.DEPLOY_URL;
const BASE_URL = process.env.BASE_URL;
const isDeploySmoke = !!DEPLOY_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 4,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: DEPLOY_URL || BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    testIdAttribute: 'data-testid',
  },
  projects: [
    // Progetto smoke per deploy Vercel — attivato solo se DEPLOY_URL è impostato
    ...(isDeploySmoke
      ? [
          {
            name: 'deploy-smoke',
            testMatch: '**/smoke/deploy-validation.spec.ts',
            use: {
              ...devices['Desktop Chrome'],
              baseURL: DEPLOY_URL,
              extraHTTPHeaders: process.env.PLAYWRIGHT_BYPASS_TOKEN
                ? { 'x-vercel-protection-bypass': process.env.PLAYWRIGHT_BYPASS_TOKEN }
                : {},
            },
          },
        ]
      : []),
    // Progetti standard (locale)
    ...(!isDeploySmoke
      ? [
          {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
          },
          {
            name: 'mobile',
            use: { ...devices['iPhone 14'] },
          },
          {
            name: 'tablet',
            use: { ...devices['iPad Pro 11'] },
          },
        ]
      : []),
  ],
  // webServer solo in modalità locale (non smoke su deploy remoto, non se BASE_URL è impostato)
  webServer:
    isDeploySmoke || BASE_URL
      ? undefined
      : {
          command: 'npm run dev -- -p 3001',
          port: 3001,
          reuseExistingServer: true,
          timeout: 120_000,
        },
});
