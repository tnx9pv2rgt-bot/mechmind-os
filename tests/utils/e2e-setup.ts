/**
 * MechMind OS v10 - E2E Test Setup
 * Setup file for end-to-end tests
 */

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

// Global app instance for E2E tests
declare global {
  var testApp: INestApplication;
}

jest.setTimeout(60000);

beforeAll(async () => {
  // Create test module
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // Create and initialize app
  const app = moduleRef.createNestApplication();
  
  // Configure app (same as main.ts)
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  await app.init();
  
  // Store for global access
  global.testApp = app;
});

afterAll(async () => {
  if (global.testApp) {
    await global.testApp.close();
  }
});

afterEach(async () => {
  // Clean up any test data
});
