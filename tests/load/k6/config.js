/**
 * MechMind OS v10 - k6 Load Test Configuration
 * Centralized configuration for all load tests
 */

/**
 * Environment configurations
 */
export const ENVIRONMENTS = {
  local: {
    baseUrl: 'http://localhost:3000',
    apiVersion: 'v1',
    dbHost: 'localhost',
    dbPort: 5432,
    dbName: 'mechmind_local',
    sqsEndpoint: 'http://localhost:4566',
    timeoutMs: 30000,
    thinkTimeMin: 0.1,
    thinkTimeMax: 0.5,
  },
  staging: {
    baseUrl: __ENV.STAGING_URL || 'https://api-staging.mechmind.io',
    apiVersion: 'v1',
    dbHost: __ENV.STAGING_DB_HOST || 'staging-db.mechmind.io',
    dbPort: 5432,
    dbName: 'mechmind_staging',
    sqsEndpoint: __ENV.STAGING_SQS_ENDPOINT,
    timeoutMs: 30000,
    thinkTimeMin: 0.5,
    thinkTimeMax: 2.0,
  },
  prod: {
    baseUrl: __ENV.PROD_URL || 'https://api.mechmind.io',
    apiVersion: 'v1',
    dbHost: __ENV.PROD_DB_HOST || 'prod-db.mechmind.io',
    dbPort: 5432,
    dbName: 'mechmind_prod',
    sqsEndpoint: __ENV.PROD_SQS_ENDPOINT,
    timeoutMs: 30000,
    thinkTimeMin: 0.5,
    thinkTimeMax: 2.0,
  },
};

/**
 * Get current environment configuration
 * @returns {Object} Environment configuration
 */
export function getEnvironmentConfig() {
  const env = __ENV.ENVIRONMENT || 'local';
  const config = ENVIRONMENTS[env];
  if (!config) {
    throw new Error(`Unknown environment: ${env}`);
  }
  return config;
}

/**
 * Get full API URL for an endpoint
 * @param {string} endpoint - API endpoint path (without leading slash)
 * @returns {string} Full URL
 */
export function getApiUrl(endpoint) {
  const config = getEnvironmentConfig();
  return `${config.baseUrl}/api/${config.apiVersion}/${endpoint}`;
}

/**
 * Get webhook URL
 * @param {string} webhookPath - Webhook path
 * @returns {string} Full webhook URL
 */
export function getWebhookUrl(webhookPath) {
  const config = getEnvironmentConfig();
  return `${config.baseUrl}/webhooks/${webhookPath}`;
}

/**
 * Get health check URL
 * @returns {string} Health check URL
 */
export function getHealthUrl() {
  const config = getEnvironmentConfig();
  return `${config.baseUrl}/health`;
}

/**
 * Authentication configuration
 */
export const AUTH = {
  jwtToken: __ENV.JWT_TOKEN || '',
  refreshToken: __ENV.REFRESH_TOKEN || '',
  webhookSecret: __ENV.VAPI_WEBHOOK_SECRET || 'test-webhook-secret',
  apiKey: __ENV.API_KEY || '',
};

/**
 * Default headers for API requests
 * @returns {Object} Headers object
 */
export function getDefaultHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH.jwtToken}`,
    'X-Request-ID': generateUUID(),
    'X-Test-Run': 'k6-load-test',
  };
}

/**
 * Headers for webhook requests
 * @param {string} signature - HMAC signature
 * @param {string} timestamp - Timestamp for signature
 * @returns {Object} Headers object
 */
export function getWebhookHeaders(signature, timestamp) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Vapi-Signature': signature,
    'X-Request-ID': generateUUID(),
  };
  if (timestamp) {
    headers['X-Vapi-Timestamp'] = timestamp;
  }
  return headers;
}

/**
 * Test data generators
 */
export const TEST_DATA = {
  // Default tenant and shop IDs
  tenantId: __ENV.TEST_TENANT_ID || '550e8400-e29b-41d4-a716-446655440000',
  shopId: __ENV.TEST_SHOP_ID || '550e8400-e29b-41d4-a716-446655440001',
  customerId: __ENV.TEST_CUSTOMER_ID || '550e8400-e29b-41d4-a716-446655440002',
  
  // Shared slot for race condition tests
  sharedSlotId: __ENV.SHARED_SLOT_ID || '550e8400-e29b-41d4-a716-446655440003',
  sharedSlotTime: __ENV.SHARED_SLOT_TIME || '2024-12-01T14:00:00.000Z',
  
  // Batch size for GDPR test
  gdprBatchSize: parseInt(__ENV.GDPR_BATCH_SIZE || '10000'),
  
  // Voice call settings
  voiceCallDuration: parseInt(__ENV.VOICE_CALL_DURATION || '120'),
};

/**
 * Generate a UUID v4
 * @returns {string} UUID string
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a random phone number
 * @returns {string} Phone number
 */
export function generatePhoneNumber() {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `+1${areaCode}${prefix}${lineNumber}`;
}

/**
 * Generate random string
 * @param {number} length - String length
 * @returns {string} Random string
 */
export function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a future date
 * @param {number} daysFromNow - Days from now
 * @param {number} hour - Hour of day (0-23)
 * @returns {string} ISO date string
 */
export function generateFutureDate(daysFromNow = 1, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

/**
 * Service types for bookings
 */
export const SERVICE_TYPES = [
  'oil_change',
  'tire_rotation',
  'brake_service',
  'inspection',
  'engine_repair',
  'transmission_service',
  'ac_service',
  'battery_replacement',
];

/**
 * Voice transcripts for testing
 */
export const VOICE_TRANSCRIPTS = {
  booking: [
    'I need to book an oil change for tomorrow at 2pm',
    'Can I schedule a tire rotation for next Tuesday morning?',
    'I want to book a brake service for Friday afternoon',
    'Book me in for an inspection next week',
    'I need to make an appointment for engine repair',
    'Schedule a transmission service for Monday',
    'Can you book an AC service for Wednesday?',
    'I need a battery replacement appointment',
  ],
  status: [
    'What is the status of my booking?',
    'When is my appointment?',
    'Can you tell me about my current booking?',
    'I want to check my appointment status',
  ],
  complaint: [
    'I want to file a complaint about my last service',
    'The repair was not done correctly',
    'I am unhappy with the service quality',
    'There is still a problem with my car',
  ],
  other: [
    'What services do you offer?',
    'How much does an oil change cost?',
    'What are your opening hours?',
    'Do you work on electric vehicles?',
  ],
};

/**
 * Thresholds configuration
 */
export const THRESHOLDS = {
  // HTTP request thresholds
  httpReqDuration: {
    p95: 500,  // 500ms for p95
    p99: 1000, // 1000ms for p99
  },
  httpReqFailed: {
    rate: 0.01, // Less than 1% error rate
  },
  
  // Voice-specific thresholds
  voiceResponseTime: {
    p99: 2500, // 2.5s for p99 voice response
  },
  
  // Lock contention thresholds
  lockWaitTime: {
    p99: 100, // 100ms for p99 lock wait
  },
  
  // GDPR deletion thresholds
  gdprDeletion: {
    maxDuration: 3600, // 1 hour max
  },
  
  // Booking success thresholds
  bookingSuccess: {
    rate: 0.95, // 95% success rate
  },
};

/**
 * Export a summary configuration object
 */
export function getConfig() {
  return {
    environment: getEnvironmentConfig(),
    auth: AUTH,
    testData: TEST_DATA,
    thresholds: THRESHOLDS,
  };
}

/**
 * Log configuration at test start
 */
export function logConfig() {
  const config = getConfig();
  console.log('🔧 MechMind OS k6 Load Test Configuration');
  console.log('==========================================');
  console.log(`Environment: ${__ENV.ENVIRONMENT || 'local'}`);
  console.log(`Base URL: ${config.environment.baseUrl}`);
  console.log(`Tenant ID: ${config.testData.tenantId}`);
  console.log(`Shop ID: ${config.testData.shopId}`);
  console.log(`Shared Slot ID: ${config.testData.sharedSlotId}`);
  console.log('==========================================\n');
}

export default {
  getEnvironmentConfig,
  getApiUrl,
  getWebhookUrl,
  getHealthUrl,
  getDefaultHeaders,
  getWebhookHeaders,
  generateUUID,
  generatePhoneNumber,
  generateRandomString,
  generateFutureDate,
  SERVICE_TYPES,
  VOICE_TRANSCRIPTS,
  THRESHOLDS,
  TEST_DATA,
  AUTH,
  getConfig,
  logConfig,
};
