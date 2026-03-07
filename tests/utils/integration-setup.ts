/**
 * MechMind OS v10 - Integration Test Setup
 * Setup file for integration tests
 */

import { teardownTestDatabase } from './database';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Clean database after each test to ensure isolation
afterEach(async () => {
  await teardownTestDatabase();
});

// Verify database is accessible before running tests
beforeAll(async () => {
  const { getTestPool } = require('./database');
  const pool = getTestPool();
  const result = await pool.query('SELECT 1 as test');
  expect(result.rows[0].test).toBe(1);
});
