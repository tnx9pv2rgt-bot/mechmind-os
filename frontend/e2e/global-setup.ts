import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Global Setup for Playwright E2E Tests
 * Seeds the database and prepares the test environment
 */
async function globalSetup() {
  console.log('🚀 Starting global setup for E2E tests...');
  
  const isCI = process.env.CI === 'true';
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  
  try {
    // 1. Verify database connection
    console.log('📡 Verifying database connection...');
    if (!isCI) {
      // In local development, start the test database if needed
      try {
        execSync('docker ps | grep mechmind-db-test', { stdio: 'ignore' });
      } catch {
        console.log('🐳 Starting test database container...');
        execSync('docker-compose -f ../infrastructure/docker-compose.test.yml up -d db', {
          cwd: __dirname,
          stdio: 'inherit',
        });
        // Wait for database to be ready
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // 2. Run database migrations
    console.log('🗄️ Running database migrations...');
    execSync('npm run db:migrate:test', {
      cwd: join(__dirname, '../../backend'),
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    // 3. Seed test database
    console.log('🌱 Seeding test database...');
    execSync('npm run db:seed:e2e', {
      cwd: join(__dirname, '../../backend'),
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    // 4. Verify API is accessible
    console.log('🔍 Verifying API health...');
    const maxRetries = 30;
    let retries = 0;
    let apiReady = false;
    
    while (retries < maxRetries && !apiReady) {
      try {
        const response = await fetch(`${process.env.API_URL || 'http://localhost:4000'}/health`);
        if (response.ok) {
          apiReady = true;
          console.log('✅ API is ready');
        }
      } catch {
        retries++;
        console.log(`⏳ Waiting for API... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!apiReady) {
      throw new Error('API failed to start');
    }

    // 5. Create test storage state (authenticated sessions)
    console.log('🔐 Creating authenticated test sessions...');
    await createTestSessions(baseURL);

    console.log('✅ Global setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Create authenticated sessions for test users
 */
async function createTestSessions(baseURL: string) {
  const { chromium } = await import('@playwright/test');
  const fs = await import('fs');
  const path = await import('path');
  
  const authDir = path.join(__dirname, '.auth');
  
  // Ensure auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();

  // Create admin session
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  
  await adminPage.goto(`${baseURL}/auth`);
  await adminPage.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL || 'admin@mechmind.local');
  await adminPage.getByLabel(/password/i).fill(process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!');
  await adminPage.getByRole('button', { name: /login|accedi/i }).click();
  await adminPage.waitForURL(/dashboard/);
  
  await adminContext.storageState({ path: path.join(authDir, 'admin.json') });
  console.log('✅ Admin session created');

  // Create regular user session
  const userContext = await browser.newContext();
  const userPage = await userContext.newPage();
  
  await userPage.goto(`${baseURL}/auth`);
  await userPage.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || 'test@mechmind.local');
  await userPage.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || 'TestPassword123!');
  await userPage.getByRole('button', { name: /login|accedi/i }).click();
  await userPage.waitForURL(/dashboard/);
  
  await userContext.storageState({ path: path.join(authDir, 'user.json') });
  console.log('✅ User session created');

  // Create mechanic session
  const mechanicContext = await browser.newContext();
  const mechanicPage = await mechanicContext.newPage();
  
  await mechanicPage.goto(`${baseURL}/auth`);
  await mechanicPage.getByLabel(/email/i).fill('mechanic@mechmind.local');
  await mechanicPage.getByLabel(/password/i).fill('MechanicPassword123!');
  await mechanicPage.getByRole('button', { name: /login|accedi/i }).click();
  await mechanicPage.waitForURL(/dashboard/);
  
  await mechanicContext.storageState({ path: path.join(authDir, 'mechanic.json') });
  console.log('✅ Mechanic session created');

  await browser.close();
}

export default globalSetup;
