/**
 * Global Setup for Real DB E2E Tests
 *
 * Starts a PostgreSQL Testcontainer and applies Prisma migrations.
 * The DATABASE_URL is stored in a temp file so globalTeardown can access it.
 */
// @ts-nocheck

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const STATE_FILE = path.join(__dirname, '.testcontainer-state.json');

export default async function globalSetup(): Promise<void> {
  console.log('\n🐘 Starting PostgreSQL Testcontainer...');

  const container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('mechmind_e2e')
    .withUsername('e2e_user')
    .withPassword('e2e_pass')
    .withExposedPorts(5432)
    .start();

  const connectionUri = container.getConnectionUri();
  console.log(`✅ PostgreSQL container started: ${connectionUri}`);

  // Apply Prisma migrations
  console.log('📦 Applying Prisma migrations...');
  const backendDir = path.resolve(__dirname, '../../..');
  // Use migrate deploy to apply real migrations (matches production behavior)
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: connectionUri },
    cwd: backendDir,
    stdio: 'pipe',
  });
  console.log('✅ Migrations applied successfully');

  // Store connection info for tests and teardown
  const state = {
    databaseUrl: connectionUri,
    containerId: container.getId(),
    host: container.getHost(),
    port: container.getMappedPort(5432),
  };

  fs.writeFileSync(STATE_FILE, JSON.stringify(state));

  // Set env var for test processes
  process.env.DATABASE_URL = connectionUri;
  process.env.E2E_REAL_DB = 'true';
}
