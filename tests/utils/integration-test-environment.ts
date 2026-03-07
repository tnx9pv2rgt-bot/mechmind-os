/**
 * MechMind OS v10 - Integration Test Environment
 * Custom Jest environment for integration tests with database
 */

import NodeEnvironment from 'jest-environment-node';
import { teardownTestDatabase, getTestPool, setTenantContext } from './database';
import type { Client } from 'pg';

/**
 * Custom test environment for integration tests
 */
class IntegrationTestEnvironment extends NodeEnvironment {
  private testClient: Client | null = null;

  constructor(config: any) {
    super(config);
  }

  async setup(): Promise<void> {
    await super.setup();
    
    // Add database utilities to global scope
    this.global.testPool = getTestPool();
    this.global.teardownTestDatabase = teardownTestDatabase;
    this.global.setTenantContext = setTenantContext;
    
    // Set test timeout for integration tests
    this.global.jestTimeout = 30000;
  }

  async teardown(): Promise<void> {
    // Clean up test data after each test file
    try {
      await teardownTestDatabase();
    } catch (error) {
      console.error('Failed to teardown test database:', error);
    }
    
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }
}

export default IntegrationTestEnvironment;
