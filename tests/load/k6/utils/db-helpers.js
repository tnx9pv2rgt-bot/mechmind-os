/**
 * MechMind OS v10 - k6 Database Helper Functions
 * 
 * These functions provide database query capabilities for post-test validation.
 * Note: In k6, direct database connections are limited. These functions use
 * the REST API to perform validation queries.
 */

import http from 'k6/http';
import { check } from 'k6';

/**
 * Default headers for API requests
 * @param {string} jwtToken - JWT authentication token
 * @returns {Object} Headers object
 */
function getHeaders(jwtToken) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`,
    'X-Request-ID': generateUUID(),
  };
}

/**
 * Generate a UUID
 * @returns {string} UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Check for double bookings on a specific slot
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.baseUrl - API base URL
 * @param {string} config.jwtToken - JWT token
 * @param {string} slotId - Slot ID to check
 * @returns {Object} Check result
 */
export function checkDoubleBookings(config, slotId) {
  const url = `${config.baseUrl}/api/v1/bookings?slotId=${slotId}&status=CONFIRMED`;
  
  const response = http.get(url, {
    headers: getHeaders(config.jwtToken),
    tags: { test_type: 'db_validation' },
  });
  
  if (response.status !== 200) {
    return {
      error: true,
      message: `Failed to query bookings: ${response.status}`,
      hasDoubleBooking: false,
      confirmedCount: 0,
    };
  }
  
  const bookings = response.json('data') || [];
  const confirmedBookings = bookings.filter(b => 
    b.status === 'CONFIRMED' || b.status === 'PENDING'
  );
  
  return {
    error: false,
    hasDoubleBooking: confirmedBookings.length > 1,
    confirmedCount: confirmedBookings.length,
    bookings: confirmedBookings,
  };
}

/**
 * Check for double bookings across multiple slots
 * 
 * @param {Object} config - Configuration object
 * @param {string[]} slotIds - Array of slot IDs to check
 * @returns {Object} Aggregate check result
 */
export function checkDoubleBookingsBatch(config, slotIds) {
  const results = {
    totalChecked: 0,
    totalWithDoubleBooking: 0,
    doubleBookingSlots: [],
    errors: [],
  };
  
  for (const slotId of slotIds) {
    const result = checkDoubleBookings(config, slotId);
    
    if (result.error) {
      results.errors.push({ slotId, error: result.message });
    } else {
      results.totalChecked++;
      
      if (result.hasDoubleBooking) {
        results.totalWithDoubleBooking++;
        results.doubleBookingSlots.push({
          slotId,
          confirmedCount: result.confirmedCount,
        });
      }
    }
    
    // Small delay to avoid overwhelming the API
    if (slotIds.indexOf(slotId) % 10 === 0) {
      // Using sleep would require importing from k6, 
      // so we just continue without explicit sleep in helper
    }
  }
  
  return results;
}

/**
 * Verify PII anonymization for customers
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.baseUrl - API base URL
 * @param {string} config.jwtToken - JWT token
 * @param {string} tag - Tag to identify test customers
 * @returns {Object} Verification result
 */
export function verifyPiiAnonymization(config, tag = 'load-test-gdpr') {
  const url = `${config.baseUrl}/api/v1/customers?tags=${tag}&limit=1000`;
  
  const response = http.get(url, {
    headers: getHeaders(config.jwtToken),
    tags: { test_type: 'db_validation' },
  });
  
  if (response.status !== 200) {
    return {
      error: true,
      message: `Failed to query customers: ${response.status}`,
      leaksFound: 0,
    };
  }
  
  const customers = response.json('data') || [];
  const leaks = [];
  
  for (const customer of customers) {
    // Check for unanonymized PII fields
    const checks = [
      { field: 'phone', pattern: /^(DELETED|RETENTION_EXPIRED)$/ },
      { field: 'email', pattern: /^(DELETED|.*anonymized.*|null)$/ },
      { field: 'firstName', pattern: /^(DELETED|null)$/ },
      { field: 'lastName', pattern: /^(DELETED|null)$/ },
    ];
    
    let hasLeak = false;
    const leakedFields = [];
    
    for (const check of checks) {
      const value = customer[check.field];
      if (value && !check.pattern.test(value)) {
        hasLeak = true;
        leakedFields.push(check.field);
      }
    }
    
    if (hasLeak) {
      leaks.push({
        customerId: customer.id,
        leakedFields: leakedFields,
      });
    }
  }
  
  return {
    error: false,
    leaksFound: leaks.length,
    leaks: leaks,
    totalChecked: customers.length,
    allAnonymized: leaks.length === 0,
  };
}

/**
 * Query lock contention statistics
 * 
 * @param {Object} config - Configuration object
 * @returns {Object} Lock statistics
 */
export function queryLockContention(config) {
  const url = `${config.baseUrl}/api/v1/admin/lock-stats`;
  
  const response = http.get(url, {
    headers: getHeaders(config.jwtToken),
    tags: { test_type: 'db_validation' },
  });
  
  if (response.status !== 200) {
    return {
      error: true,
      message: `Failed to query lock stats: ${response.status}`,
    };
  }
  
  return {
    error: false,
    deadlocks: response.json('deadlocks') || 0,
    lockWaits: response.json('lockWaits') || 0,
    avgLockWaitMs: response.json('avgLockWaitMs') || 0,
    maxLockWaitMs: response.json('maxLockWaitMs') || 0,
  };
}

/**
 * Check SQS queue depth
 * 
 * @param {Object} config - Configuration object
 * @param {string} queueName - Queue name (optional)
 * @returns {Object} Queue statistics
 */
export function checkQueueDepth(config, queueName = 'voice-webhooks') {
  const url = `${config.baseUrl}/api/v1/admin/queue-stats?queue=${queueName}`;
  
  const response = http.get(url, {
    headers: getHeaders(config.jwtToken),
    tags: { test_type: 'db_validation' },
  });
  
  if (response.status !== 200) {
    return {
      error: true,
      message: `Failed to query queue stats: ${response.status}`,
      depth: 0,
    };
  }
  
  return {
    error: false,
    depth: response.json('depth') || 0,
    messagesInFlight: response.json('messagesInFlight') || 0,
    messagesDelayed: response.json('messagesDelayed') || 0,
  };
}

/**
 * Check Dead Letter Queue for failed messages
 * 
 * @param {Object} config - Configuration object
 * @param {string} queueName - DLQ name (optional)
 * @returns {Object} DLQ statistics
 */
export function checkDeadLetterQueue(config, queueName = 'voice-webhooks-dlq') {
  const url = `${config.baseUrl}/api/v1/admin/dlq-stats?queue=${queueName}`;
  
  const response = http.get(url, {
    headers: getHeaders(config.jwtToken),
    tags: { test_type: 'db_validation' },
  });
  
  if (response.status !== 200) {
    return {
      error: true,
      message: `Failed to query DLQ stats: ${response.status}`,
      messageCount: 0,
    };
  }
  
  return {
    error: false,
    messageCount: response.json('messageCount') || 0,
    oldestMessage: response.json('oldestMessage'),
    recentFailures: response.json('recentFailures') || [],
  };
}

/**
 * Verify booking integrity after concurrent operations
 * 
 * @param {Object} config - Configuration object
 * @param {string} shopId - Shop ID to check
 * @returns {Object} Integrity check result
 */
export function verifyBookingIntegrity(config, shopId) {
  const url = `${config.baseUrl}/api/v1/bookings?shopId=${shopId}&limit=1000`;
  
  const response = http.get(url, {
    headers: getHeaders(config.jwtToken),
    tags: { test_type: 'db_validation' },
  });
  
  if (response.status !== 200) {
    return {
      error: true,
      message: `Failed to query bookings: ${response.status}`,
    };
  }
  
  const bookings = response.json('data') || [];
  
  // Check for data integrity issues
  const issues = [];
  const slotBookings = {};
  
  for (const booking of bookings) {
    // Check for missing required fields
    if (!booking.id || !booking.slotId || !booking.customerId) {
      issues.push({
        bookingId: booking.id || 'unknown',
        issue: 'Missing required fields',
      });
    }
    
    // Track bookings per slot
    if (booking.slotId) {
      if (!slotBookings[booking.slotId]) {
        slotBookings[booking.slotId] = [];
      }
      slotBookings[booking.slotId].push(booking);
    }
  }
  
  // Check for overlapping bookings on same slot
  const overlappingSlots = [];
  for (const [slotId, bookings] of Object.entries(slotBookings)) {
    const confirmed = bookings.filter(b => b.status === 'CONFIRMED');
    if (confirmed.length > 1) {
      overlappingSlots.push({
        slotId,
        confirmedCount: confirmed.length,
      });
    }
  }
  
  return {
    error: false,
    totalBookings: bookings.length,
    issues: issues,
    issueCount: issues.length,
    overlappingSlots: overlappingSlots,
    hasOverlappingSlots: overlappingSlots.length > 0,
    isValid: issues.length === 0 && overlappingSlots.length === 0,
  };
}

/**
 * Get database connection statistics
 * 
 * @param {Object} config - Configuration object
 * @returns {Object} Connection statistics
 */
export function getConnectionStats(config) {
  const url = `${config.baseUrl}/api/v1/admin/db-stats`;
  
  const response = http.get(url, {
    headers: getHeaders(config.jwtToken),
    tags: { test_type: 'db_validation' },
  });
  
  if (response.status !== 200) {
    return {
      error: true,
      message: `Failed to query DB stats: ${response.status}`,
    };
  }
  
  return {
    error: false,
    activeConnections: response.json('activeConnections') || 0,
    idleConnections: response.json('idleConnections') || 0,
    waitingConnections: response.json('waitingConnections') || 0,
    maxConnections: response.json('maxConnections') || 0,
    connectionUtilization: response.json('connectionUtilization') || 0,
  };
}

/**
 * Clear test data from database
 * 
 * @param {Object} config - Configuration object
 * @param {string} tag - Tag identifying test data
 * @returns {Object} Cleanup result
 */
export function cleanupTestData(config, tag = 'load-test') {
  const url = `${config.baseUrl}/api/v1/admin/cleanup-test-data`;
  
  const response = http.post(
    url,
    JSON.stringify({ tag }),
    {
      headers: getHeaders(config.jwtToken),
      tags: { test_type: 'cleanup' },
    }
  );
  
  if (response.status !== 200 && response.status !== 204) {
    return {
      error: true,
      message: `Failed to cleanup test data: ${response.status}`,
    };
  }
  
  return {
    error: false,
    message: 'Test data cleaned up successfully',
    deletedCount: response.json('deletedCount') || 0,
  };
}

/**
 * Export all database helpers
 */
export default {
  checkDoubleBookings,
  checkDoubleBookingsBatch,
  verifyPiiAnonymization,
  queryLockContention,
  checkQueueDepth,
  checkDeadLetterQueue,
  verifyBookingIntegrity,
  getConnectionStats,
  cleanupTestData,
};
