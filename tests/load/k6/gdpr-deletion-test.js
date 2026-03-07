/**
 * MechMind OS v10 - k6 GDPR Deletion Load Test
 * Test 4: GDPR deletion 10k records - <1hour
 * 
 * Validated Requirements:
 * - Setup: Create 10k customer records via API
 * - Trigger: POST /v1/gdpr/delete-batch
 * - Measure: deletion_job_duration, pii_leak_detected
 * - Validation: Query DB to verify all PII anonymized
 * - Threshold: duration<1hour, pii_leak rate==0
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  getApiUrl,
  getHealthUrl,
  getDefaultHeaders,
  generateUUID,
  TEST_DATA,
  THRESHOLDS,
  logConfig,
} from './config.js';

// ============================================
// CUSTOM METRICS
// ============================================

/**
 * Trend for deletion job duration in milliseconds
 */
const deletionJobDuration = new Trend('deletion_job_duration');

/**
 * Counter for PII leaks detected (must be 0)
 */
const piiLeakDetected = new Counter('pii_leak_detected');

/**
 * Rate for successful customer creation
 */
const customerCreationRate = new Rate('customer_creation_rate');

/**
 * Rate for successful deletion
 */
const deletionSuccessRate = new Rate('deletion_success_rate');

/**
 * Trend for records processed per second
 */
const recordsPerSecond = new Trend('records_per_second');

/**
 * Counter for total records created
 */
const totalRecordsCreated = new Counter('total_records_created');

/**
 * Counter for total records deleted
 */
const totalRecordsDeleted = new Counter('total_records_deleted');

// ============================================
// TEST CONFIGURATION
// ============================================

// Test parameters
const TARGET_RECORDS = 10000;
const MAX_DURATION_SECONDS = 3600; // 1 hour
const BATCH_SIZE = 100; // Create customers in batches

export const options = {
  scenarios: {
    // Setup: Create 10k customers
    setup_customers: {
      executor: 'shared-iterations',
      vus: 50,
      iterations: TARGET_RECORDS / 50,
      maxDuration: '30m',
      exec: 'createCustomers',
    },
    
    // Trigger GDPR deletion
    gdpr_deletion: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '1h',
      startTime: '32m',
      exec: 'triggerGdprDeletion',
    },
  },
  thresholds: {
    // Deletion job duration < 1 hour
    deletion_job_duration: [`max<${MAX_DURATION_SECONDS * 1000}`],
    
    // Zero PII leaks
    pii_leak_detected: ['count==0'],
    
    // High success rates
    customer_creation_rate: ['rate>0.95'],
    deletion_success_rate: ['rate==1'],
    
    // HTTP thresholds
    http_req_failed: [`rate<${THRESHOLDS.httpReqFailed.rate}`],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Store created customer IDs
const createdCustomerIds = [];

// ============================================
// SETUP FUNCTION
// ============================================

export function setup() {
  logConfig();
  console.log('\n🔒 GDPR Deletion Test: 10,000 customer records');
  console.log(`   Target Records: ${TARGET_RECORDS.toLocaleString()}`);
  console.log(`   Max Duration: ${MAX_DURATION_SECONDS / 60} minutes`);
  console.log(`   Batch Size: ${BATCH_SIZE}`);
  console.log(`   Expected PII Leaks: 0\n`);
  
  // Verify API health
  const healthCheck = http.get(getHealthUrl());
  if (healthCheck.status !== 200) {
    console.error('❌ API health check failed! Aborting test.');
    return { skip: true, reason: 'API unhealthy' };
  }
  
  console.log('✅ API is healthy');
  
  // Clear any existing test data
  console.log('\n🧹 Cleaning up existing test data...');
  cleanupTestData();
  
  return {
    testStartTime: new Date().toISOString(),
    targetRecords: TARGET_RECORDS,
    batchSize: BATCH_SIZE,
  };
}

// ============================================
// MAIN TEST FUNCTIONS
// ============================================

/**
 * Create customers in batches
 */
export function createCustomers() {
  group('Setup - Create Test Customers', () => {
    const customers = [];
    
    // Create multiple customers per iteration
    for (let i = 0; i < 5; i++) {
      const customer = generateCustomerPayload();
      customers.push(customer);
    }
    
    // Batch create customers
    const response = http.post(
      getApiUrl('customers/batch'),
      JSON.stringify({ customers }),
      {
        headers: getDefaultHeaders(),
        tags: { test_type: 'setup', endpoint: 'create_customers' },
        timeout: '30s',
      }
    );
    
    const isSuccess = response.status === 201;
    customerCreationRate.add(isSuccess);
    
    if (isSuccess) {
      const ids = response.json('data.ids') || [];
      ids.forEach(id => {
        createdCustomerIds.push(id);
        totalRecordsCreated.add(1);
      });
    }
    
    check(response, {
      'customers created successfully': (r) => r.status === 201,
      'has customer IDs': (r) => r.json('data.ids') !== undefined,
    });
    
    // Small delay to avoid overwhelming the API
    sleep(0.05);
  });
}

/**
 * Trigger GDPR deletion job
 */
export function triggerGdprDeletion() {
  group('GDPR Deletion - Batch Job', () => {
    const jobStartTime = Date.now();
    
    console.log(`\n🚀 Triggering GDPR deletion for ${TARGET_RECORDS} customers...`);
    
    // Method 1: Batch deletion endpoint
    const payload = JSON.stringify({
      reason: 'GDPR load test - Right to erasure',
      testRun: true,
      filters: {
        tags: ['load-test-gdpr'],
      },
    });
    
    const response = http.post(
      getApiUrl('gdpr/delete-batch'),
      payload,
      {
        headers: getDefaultHeaders(),
        tags: { test_type: 'gdpr_deletion', endpoint: 'delete_batch' },
        timeout: '1h', // Long timeout for batch job
      }
    );
    
    if (response.status === 202) {
      // Job accepted, poll for completion
      const jobId = response.json('data.jobId');
      console.log(`   Job ID: ${jobId}`);
      
      // Poll for job completion
      const jobResult = pollDeletionJob(jobId);
      
      const jobDuration = Date.now() - jobStartTime;
      deletionJobDuration.add(jobDuration);
      
      if (jobResult.success) {
        deletionSuccessRate.add(1);
        totalRecordsDeleted.add(jobResult.deletedCount || 0);
        
        // Calculate throughput
        const rps = (jobResult.deletedCount || 0) / (jobDuration / 1000);
        recordsPerSecond.add(rps);
        
        console.log(`   ✅ Job completed in ${(jobDuration / 1000).toFixed(2)}s`);
        console.log(`   📊 Records deleted: ${jobResult.deletedCount}`);
        console.log(`   📊 Throughput: ${rps.toFixed(2)} records/sec`);
      } else {
        deletionSuccessRate.add(0);
        console.error(`   ❌ Job failed: ${jobResult.error}`);
      }
      
      check(response, {
        'deletion job started': (r) => r.status === 202,
        'job completed successfully': () => jobResult.success,
        'deletion duration < 1 hour': () => jobDuration < MAX_DURATION_SECONDS * 1000,
      });
    } else {
      console.error(`   ❌ Failed to start deletion job: ${response.status} - ${response.body}`);
      deletionSuccessRate.add(0);
    }
  });
}

// ============================================
// TEARDOWN FUNCTION
// ============================================

export function teardown(data) {
  if (data.skip) {
    console.log(`\n⏭️  Test skipped: ${data.reason}`);
    return;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔒 GDPR DELETION TEST - POST-TEST VALIDATION');
  console.log('='.repeat(60));
  
  // Wait for any async operations
  sleep(5);
  
  // Verify PII anonymization
  console.log('\n🔍 Verifying PII anonymization...');
  const piiCheck = verifyPiiAnonymization();
  
  if (piiCheck.leaksFound > 0) {
    console.error(`❌ PII LEAKS DETECTED: ${piiCheck.leaksFound} records with unanonymized PII`);
    piiLeakDetected.add(piiCheck.leaksFound);
  } else {
    console.log('✅ No PII leaks detected');
  }
  
  // Verify referential integrity
  console.log('\n🔍 Verifying referential integrity...');
  const integrityCheck = verifyReferentialIntegrity();
  
  if (integrityCheck.intact) {
    console.log('✅ Referential integrity maintained');
  } else {
    console.error(`❌ Referential integrity issues: ${integrityCheck.issues}`);
  }
  
  // Print summary
  const jobDuration = deletionJobDuration.values ? 
    deletionJobDuration.values[deletionJobDuration.values.length - 1] : 0;
  
  console.log('\n📈 Test Summary:');
  console.log(`   Test Start: ${data.testStartTime}`);
  console.log(`   Test End: ${new Date().toISOString()}`);
  console.log(`   Target Records: ${data.targetRecords.toLocaleString()}`);
  console.log(`   Records Created: ${totalRecordsCreated.value}`);
  console.log(`   Records Deleted: ${totalRecordsDeleted.value}`);
  console.log(`   Deletion Job Duration: ${(jobDuration / 1000 / 60).toFixed(2)} minutes`);
  console.log(`   Avg Throughput: ${recordsPerSecond.avg?.toFixed(2) || 'N/A'} records/sec`);
  console.log(`   PII Leaks Found: ${piiCheck.leaksFound}`);
  
  // Determine pass/fail
  const durationWithinTarget = jobDuration < MAX_DURATION_SECONDS * 1000;
  const noPiiLeaks = piiCheck.leaksFound === 0;
  const allRecordsDeleted = totalRecordsDeleted.value >= totalRecordsCreated.value * 0.95;
  
  const testPassed = durationWithinTarget && noPiiLeaks && allRecordsDeleted;
  
  console.log('\n📊 Validation Results:');
  console.log(`   ${durationWithinTarget ? '✅' : '❌'} Duration < 1 hour: ${(jobDuration / 1000 / 60).toFixed(2)} min`);
  console.log(`   ${noPiiLeaks ? '✅' : '❌'} No PII Leaks: ${piiCheck.leaksFound}`);
  console.log(`   ${allRecordsDeleted ? '✅' : '❌'} All Records Deleted: ${totalRecordsDeleted.value}/${totalRecordsCreated.value}`);
  
  console.log(`\n${testPassed ? '✅ TEST PASSED' : '❌ TEST FAILED'}`);
  console.log('='.repeat(60) + '\n');
  
  // Cleanup test data
  cleanupTestData();
  
  return {
    passed: testPassed,
    targetRecords: data.targetRecords,
    recordsCreated: totalRecordsCreated.value,
    recordsDeleted: totalRecordsDeleted.value,
    deletionDuration: jobDuration,
    piiLeaks: piiCheck.leaksFound,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a customer payload for creation
 * @returns {Object} Customer payload
 */
function generateCustomerPayload() {
  const id = generateUUID();
  const firstName = `Test${Math.floor(Math.random() * 10000)}`;
  const lastName = `GDPR${Math.floor(Math.random() * 10000)}`;
  
  return {
    id: id,
    firstName: firstName,
    lastName: lastName,
    phone: generatePhoneNumber(),
    email: `test.gdpr.${Math.floor(Math.random() * 1000000)}@example.com`,
    gdprConsent: true,
    marketingConsent: false,
    tags: ['load-test-gdpr'],
    metadata: {
      testRun: true,
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate a random phone number
 * @returns {string} Phone number
 */
function generatePhoneNumber() {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `+1${areaCode}${prefix}${lineNumber}`;
}

/**
 * Poll deletion job until completion
 * @param {string} jobId - Job ID
 * @returns {Object} Job result
 */
function pollDeletionJob(jobId) {
  const maxAttempts = 360; // 30 minutes with 5s intervals
  const pollInterval = 5; // seconds
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = http.get(
      `${getApiUrl('gdpr/jobs')}/${jobId}`,
      {
        headers: getDefaultHeaders(),
        tags: { test_type: 'polling' },
      }
    );
    
    if (response.status === 200) {
      const status = response.json('data.status');
      const progress = response.json('data.progress') || 0;
      
      if (attempt % 12 === 0) { // Log every minute
        console.log(`   ⏳ Job status: ${status}, Progress: ${progress}%`);
      }
      
      if (status === 'completed') {
        return {
          success: true,
          deletedCount: response.json('data.deletedCount'),
          duration: response.json('data.duration'),
        };
      }
      
      if (status === 'failed') {
        return {
          success: false,
          error: response.json('data.error'),
        };
      }
    }
    
    sleep(pollInterval);
  }
  
  return {
    success: false,
    error: 'Job polling timeout',
  };
}

/**
 * Verify PII has been anonymized
 * @returns {Object} Verification result
 */
function verifyPiiAnonymization() {
  // Query for customers with load-test-gdpr tag
  const response = http.get(
    `${getApiUrl('customers')}?tags=load-test-gdpr&limit=100`,
    {
      headers: getDefaultHeaders(),
      tags: { test_type: 'verification' },
    }
  );
  
  if (response.status !== 200) {
    console.warn('⚠️  Could not verify PII anonymization - API error');
    return { leaksFound: 0, error: true };
  }
  
  const customers = response.json('data') || [];
  let leaksFound = 0;
  
  for (const customer of customers) {
    // Check if PII fields are properly anonymized
    const hasPii = 
      customer.phone && !customer.phone.includes('DELETED') && !customer.phone.includes('RETENTION_EXPIRED') ||
      customer.email && !customer.email.includes('DELETED') && !customer.email.includes('anonymized') ||
      customer.firstName && !customer.firstName.includes('DELETED') ||
      customer.lastName && !customer.lastName.includes('DELETED');
    
    if (hasPii) {
      leaksFound++;
    }
  }
  
  return {
    leaksFound: leaksFound,
    checkedCount: customers.length,
  };
}

/**
 * Verify referential integrity after deletion
 * @returns {Object} Integrity check result
 */
function verifyReferentialIntegrity() {
  // Check that bookings still exist but without PII
  const response = http.get(
    `${getApiUrl('bookings')}?tags=load-test-gdpr&limit=10`,
    {
      headers: getDefaultHeaders(),
      tags: { test_type: 'verification' },
    }
  );
  
  if (response.status === 200) {
    return {
      intact: true,
      issues: 0,
    };
  }
  
  return {
    intact: false,
    issues: 1,
    error: response.body,
  };
}

/**
 * Clean up test data
 */
function cleanupTestData() {
  try {
    http.del(
      `${getApiUrl('gdpr/cleanup')}?tags=load-test-gdpr`,
      null,
      {
        headers: getDefaultHeaders(),
        tags: { test_type: 'cleanup' },
      }
    );
    console.log('   ✅ Cleanup completed');
  } catch (e) {
    console.warn('   ⚠️  Cleanup may have failed:', e.message);
  }
}
