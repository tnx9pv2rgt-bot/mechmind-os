import { execSync } from 'child_process';
import { join } from 'path';
import fs from 'fs';

/**
 * Global Teardown for Playwright E2E Tests
 * Cleans up test data and resources
 */
async function globalTeardown() {
  console.log('🧹 Starting global teardown...');
  
  const isCI = process.env.CI === 'true';
  
  try {
    // 1. Clean up test data from database
    console.log('🗑️ Cleaning up test data...');
    execSync('npm run db:cleanup:test', {
      cwd: join(__dirname, '../../backend'),
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    // 2. Remove temporary auth files
    const authDir = join(__dirname, '.auth');
    if (fs.existsSync(authDir)) {
      console.log('🗑️ Cleaning up auth sessions...');
      fs.rmSync(authDir, { recursive: true, force: true });
    }

    // 3. In local development, optionally stop test containers
    if (!isCI && process.env.STOP_TEST_CONTAINERS === 'true') {
      console.log('🐳 Stopping test containers...');
      execSync('docker-compose -f ../infrastructure/docker-compose.test.yml down', {
        cwd: __dirname,
        stdio: 'inherit',
      });
    }

    console.log('✅ Global teardown completed successfully!');
    
  } catch (error) {
    console.error('⚠️ Global teardown warning:', error);
    // Don't throw - teardown errors shouldn't fail the test suite
  }
}

export default globalTeardown;
