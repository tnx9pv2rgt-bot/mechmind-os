/**
 * MechMind OS v10 - Global Test Teardown
 * Runs once after all test suites
 */

import { cleanupTestDatabase, closeTestPool } from './database';

export default async function globalTeardown(): Promise<void> {
  console.log('\n🧹 Cleaning up test environment...');
  
  try {
    // Clean up test database
    await cleanupTestDatabase();
    
    // Close connection pool
    await closeTestPool();
    
    console.log('✅ Global teardown complete');
    console.log('🏁 MechMind OS Test Suite finished');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    throw error;
  }
}
