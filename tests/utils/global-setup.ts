/**
 * MechMind OS v10 - Global Test Setup
 * Runs once before all test suites
 */

import { setupTestDatabase, getTestPool } from './database';

export default async function globalSetup(): Promise<void> {
  console.log('🚀 Starting MechMind OS Test Suite...');
  console.log('📦 Setting up test database...');
  
  try {
    // Setup test database schema
    await setupTestDatabase();
    
    // Verify database connection
    const pool = getTestPool();
    const result = await pool.query('SELECT NOW() as current_time');
    console.log(`✅ Database connected at: ${result.rows[0].current_time}`);
    
    console.log('✅ Global setup complete');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}
