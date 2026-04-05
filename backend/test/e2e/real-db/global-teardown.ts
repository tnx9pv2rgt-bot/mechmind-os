/**
 * Global Teardown for Real DB E2E Tests
 *
 * Stops and removes the PostgreSQL Testcontainer.
 */
import * as fs from 'fs';
import * as path from 'path';

const STATE_FILE = path.join(__dirname, '.testcontainer-state.json');

export default async function globalTeardown(): Promise<void> {
  console.log('\n🧹 Cleaning up Testcontainer...');

  if (fs.existsSync(STATE_FILE)) {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));

    // Stop container by ID using docker directly
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { execSync } = require('child_process');
      execSync(`docker stop ${state.containerId}`, { stdio: 'pipe' });
      execSync(`docker rm ${state.containerId}`, { stdio: 'pipe' });
      console.log('✅ Testcontainer stopped and removed');
    } catch {
      console.log('⚠️ Container may have already been removed');
    }

    fs.unlinkSync(STATE_FILE);
  }
}
