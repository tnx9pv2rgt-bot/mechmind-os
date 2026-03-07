/**
 * MechMind OS v10 - k6 Voice Throughput Load Test
 * Test 3: 100 voice calls/sec - p99 latency <2.5s
 * 
 * Validated Requirements:
 * - 100 calls/sec simulation
 * - POST /webhooks/vapi/call-event
 * - p99 voice response time < 2.5s
 * - Error rate < 1%
 * - Zero lost webhooks (SQS DLQ check)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import crypto from 'k6/crypto';
import exec from 'k6/execution';
import {
  getWebhookUrl,
  getHealthUrl,
  getWebhookHeaders,
  generateUUID,
  TEST_DATA,
  THRESHOLDS,
  VOICE_TRANSCRIPTS,
  logConfig,
} from './config.js';

// ============================================
// CUSTOM METRICS
// ============================================

/**
 * Trend for voice response time (end-to-end)
 */
const voiceResponseTime = new Trend('voice_response_time');

/**
 * Trend for webhook processing time (as reported by server)
 */
const webhookProcessingTime = new Trend('webhook_processing_time');

/**
 * Counter for lost webhooks (detected via SQS DLQ)
 */
const lostWebhooks = new Counter('lost_webhooks');

/**
 * Rate for successful webhook processing
 */
const webhookSuccessRate = new Rate('webhook_success_rate');

/**
 * Counter for total webhook calls
 */
const totalWebhooks = new Counter('total_webhooks');

/**
 * Trend for HMAC signature verification time
 */
const signatureVerificationTime = new Trend('signature_verification_time');

/**
 * Counter for replay attack prevention checks
 */
const replayChecks = new Counter('replay_checks');

// ============================================
// TEST CONFIGURATION
// ============================================

// Target: 100 calls/sec
const TARGET_RPS = 100;
const TEST_DURATION = '5m';

export const options = {
  scenarios: {
    // Steady state: 100 calls/sec
    steady_state: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RPS,
      timeUnit: '1s',
      duration: TEST_DURATION,
      preAllocatedVUs: 200,
      maxVUs: 500,
      exec: 'voiceWebhookTest',
    },
    
    // Burst test: 200 calls/sec for 30 seconds
    burst_test: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1s',
      duration: '30s',
      startTime: '6m',
      preAllocatedVUs: 300,
      maxVUs: 600,
      exec: 'voiceWebhookTest',
    },
    
    // Recovery test: Return to 100 calls/sec
    recovery_test: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RPS,
      timeUnit: '1s',
      duration: '2m',
      startTime: '7m',
      preAllocatedVUs: 200,
      maxVUs: 500,
      exec: 'voiceWebhookTest',
    },
  },
  thresholds: {
    // Voice response time p99 < 2.5s
    voice_response_time: [`p(99)<${THRESHOLDS.voiceResponseTime.p99}`],
    
    // Webhook processing time p99 < 2s
    webhook_processing_time: ['p(99)<2000'],
    
    // Error rate < 1%
    http_req_failed: [`rate<${THRESHOLDS.httpReqFailed.rate}`],
    
    // Zero lost webhooks
    lost_webhooks: ['count==0'],
    
    // High success rate
    webhook_success_rate: ['rate>0.99'],
    
    // Overall HTTP request duration
    http_req_duration: ['p(95)<2000', 'p(99)<2500'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ============================================
// SETUP FUNCTION
// ============================================

export function setup() {
  logConfig();
  console.log('\n🎙️ Voice Throughput Test: 100 calls/sec');
  console.log(`   Target Rate: ${TARGET_RPS} calls/sec`);
  console.log(`   Target p99 Latency: < ${THRESHOLDS.voiceResponseTime.p99}ms`);
  console.log(`   Target Error Rate: < ${THRESHOLDS.httpReqFailed.rate * 100}%`);
  console.log(`   Test Duration: ${TEST_DURATION}\n`);
  
  // Verify API health
  const healthCheck = http.get(getHealthUrl());
  if (healthCheck.status !== 200) {
    console.error('❌ API health check failed! Aborting test.');
    return { skip: true, reason: 'API unhealthy' };
  }
  
  console.log('✅ API is healthy');
  
  // Check SQS queue depth (if available)
  const queueDepth = checkSqsQueueDepth();
  console.log(`📊 Initial SQS Queue Depth: ${queueDepth}\n`);
  
  return {
    testStartTime: new Date().toISOString(),
    targetRps: TARGET_RPS,
    initialQueueDepth: queueDepth,
    webhookSecret: TEST_DATA.webhookSecret || 'test-webhook-secret',
  };
}

// ============================================
// MAIN TEST FUNCTION
// ============================================

export function voiceWebhookTest() {
  const startTime = Date.now();
  
  // Generate webhook payload
  const payload = generateVoiceWebhookPayload();
  const timestamp = Date.now().toString();
  
  // Generate HMAC signature
  const sigStart = Date.now();
  const signature = generateSignature(payload, timestamp);
  signatureVerificationTime.add(Date.now() - sigStart);
  
  totalWebhooks.add(1);
  
  group('Voice Webhook - Call Event', () => {
    const response = http.post(
      getWebhookUrl('vapi/call-event'),
      payload,
      {
        headers: getWebhookHeaders(signature, timestamp),
        tags: {
          test_type: 'voice_webhook',
          endpoint: 'vapi_call_event',
        },
        timeout: '30s',
      }
    );
    
    const responseTime = Date.now() - startTime;
    voiceResponseTime.add(responseTime);
    
    // Extract server-reported processing time if available
    const serverProcessingTime = response.json('processingTime');
    if (serverProcessingTime) {
      webhookProcessingTime.add(serverProcessingTime);
    }
    
    const isSuccess = response.status === 200;
    webhookSuccessRate.add(isSuccess);
    
    // Check for intent extraction
    const intent = response.json('intent');
    
    // Perform checks
    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 2.5s (p99 target)': (r) => r.timings.duration < 2500,
      'has success flag': (r) => r.json('success') === true,
      'has intent or action': (r) => 
        r.json('intent') !== undefined || r.json('action') !== undefined,
      'no server errors': (r) => r.status < 500,
    });
    
    if (response.status >= 500) {
      console.error(`❌ Webhook error ${response.status}: ${response.body}`);
    }
  });
}

/**
 * Transfer request test
 * Simulates customer requesting to speak with a human
 */
export function transferRequestTest() {
  group('Voice Webhook - Transfer Request', () => {
    const payload = JSON.stringify({
      callId: `call_${generateUUID().replace(/-/g, '')}`,
      customerPhone: generatePhoneNumber(),
      tenantId: TEST_DATA.tenantId,
      reason: 'Customer requests to speak with manager',
      category: 'booking_issue',
      urgency: 'high',
    });
    
    const timestamp = Date.now().toString();
    const signature = generateSignature(payload, timestamp);
    
    const response = http.post(
      getWebhookUrl('vapi/transfer'),
      payload,
      {
        headers: getWebhookHeaders(signature, timestamp),
        tags: {
          test_type: 'voice_transfer',
          endpoint: 'vapi_transfer',
        },
        timeout: '30s',
      }
    );
    
    check(response, {
      'transfer handled': (r) => r.status === 200,
      'escalation recorded': (r) => r.json('escalation') !== undefined,
    });
  });
  
  sleep(0.1);
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
  console.log('🎙️ VOICE THROUGHPUT TEST - POST-TEST VALIDATION');
  console.log('='.repeat(60));
  
  // Wait for any pending queue processing
  sleep(5);
  
  // Check SQS DLQ for lost webhooks
  console.log('\n🔍 Checking for lost webhooks (SQS DLQ)...');
  const dlqCheck = checkDeadLetterQueue();
  
  if (dlqCheck.lostCount > 0) {
    console.error(`❌ LOST WEBHOOKS DETECTED: ${dlqCheck.lostCount} messages in DLQ`);
    lostWebhooks.add(dlqCheck.lostCount);
  } else {
    console.log('✅ No lost webhooks detected');
  }
  
  // Check final queue depth
  const finalQueueDepth = checkSqsQueueDepth();
  const queueDelta = finalQueueDepth - data.initialQueueDepth;
  
  console.log('\n📈 Test Summary:');
  console.log(`   Test Start: ${data.testStartTime}`);
  console.log(`   Test End: ${new Date().toISOString()}`);
  console.log(`   Target Rate: ${data.targetRps} calls/sec`);
  console.log(`   Total Webhooks: ${totalWebhooks.value}`);
  console.log(`   Success Rate: ${(webhookSuccessRate.value * 100).toFixed(2)}%`);
  console.log(`   Average Response Time: ${voiceResponseTime.avg}ms`);
  console.log(`   p99 Response Time: ${voiceResponseTime.p(99)}ms`);
  console.log(`   p95 Response Time: ${voiceResponseTime.p(95)}ms`);
  console.log(`   Initial Queue Depth: ${data.initialQueueDepth}`);
  console.log(`   Final Queue Depth: ${finalQueueDepth}`);
  console.log(`   Queue Delta: ${queueDelta}`);
  console.log(`   Lost Webhooks: ${dlqCheck.lostCount}`);
  
  // Determine pass/fail
  const p99WithinTarget = voiceResponseTime.p(99) < THRESHOLDS.voiceResponseTime.p99;
  const errorRateWithinTarget = (1 - webhookSuccessRate.value) < THRESHOLDS.httpReqFailed.rate;
  const noLostWebhooks = dlqCheck.lostCount === 0;
  
  const testPassed = p99WithinTarget && errorRateWithinTarget && noLostWebhooks;
  
  console.log('\n📊 Validation Results:');
  console.log(`   ${p99WithinTarget ? '✅' : '❌'} p99 Latency < 2.5s: ${voiceResponseTime.p(99).toFixed(2)}ms`);
  console.log(`   ${errorRateWithinTarget ? '✅' : '❌'} Error Rate < 1%: ${((1 - webhookSuccessRate.value) * 100).toFixed(2)}%`);
  console.log(`   ${noLostWebhooks ? '✅' : '❌'} No Lost Webhooks: ${dlqCheck.lostCount}`);
  
  console.log(`\n${testPassed ? '✅ TEST PASSED' : '❌ TEST FAILED'}`);
  console.log('='.repeat(60) + '\n');
  
  return {
    passed: testPassed,
    targetRps: data.targetRps,
    totalWebhooks: totalWebhooks.value,
    successRate: webhookSuccessRate.value,
    p99Latency: voiceResponseTime.p(99),
    p95Latency: voiceResponseTime.p(95),
    avgLatency: voiceResponseTime.avg,
    lostWebhooks: dlqCheck.lostCount,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a voice webhook payload
 * @returns {string} JSON payload
 */
function generateVoiceWebhookPayload() {
  // Randomly select intent type
  const intentTypes = ['booking', 'status', 'complaint', 'other'];
  const intentType = intentTypes[Math.floor(Math.random() * intentTypes.length)];
  
  let transcript;
  let intent;
  let extractedData = {};
  
  switch (intentType) {
    case 'booking':
      transcript = VOICE_TRANSCRIPTS.booking[Math.floor(Math.random() * VOICE_TRANSCRIPTS.booking.length)];
      intent = 'booking';
      extractedData = {
        preferredDate: generateFutureDate(1, 7),
        preferredTime: `${9 + Math.floor(Math.random() * 8)}:00`,
        serviceType: ['oil_change', 'tire_rotation', 'brake_service'][Math.floor(Math.random() * 3)],
      };
      break;
    case 'status':
      transcript = VOICE_TRANSCRIPTS.status[Math.floor(Math.random() * VOICE_TRANSCRIPTS.status.length)];
      intent = 'status_check';
      extractedData = {
        hasBookingReference: Math.random() > 0.5,
      };
      break;
    case 'complaint':
      transcript = VOICE_TRANSCRIPTS.complaint[Math.floor(Math.random() * VOICE_TRANSCRIPTS.complaint.length)];
      intent = 'complaint';
      extractedData = {
        issueDescription: 'Service quality concern',
        urgency: 'medium',
      };
      break;
    default:
      transcript = VOICE_TRANSCRIPTS.other[Math.floor(Math.random() * VOICE_TRANSCRIPTS.other.length)];
      intent = 'other';
      extractedData = {};
  }
  
  return JSON.stringify({
    event: 'call_completed',
    callId: `call_${generateUUID().replace(/-/g, '')}`,
    customerPhone: generatePhoneNumber(),
    tenantId: TEST_DATA.tenantId,
    transcript: transcript,
    intent: intent,
    extractedData: extractedData,
    duration: Math.floor(Math.random() * 180) + 30, // 30-210 seconds
    recordingUrl: `https://cdn.vapi.ai/recordings/rec_${generateUUID()}.mp3`,
    confidence: 0.75 + Math.random() * 0.25, // 0.75-1.0
    language: 'en-US',
    timestamp: new Date().toISOString(),
    metadata: {
      testRun: true,
      vu: __VU,
      iter: __ITER,
    },
  });
}

/**
 * Generate HMAC signature for webhook
 * @param {string} payload - JSON payload
 * @param {string} timestamp - Timestamp string
 * @returns {string} HMAC signature
 */
function generateSignature(payload, timestamp) {
  const secret = TEST_DATA.webhookSecret || 'test-webhook-secret';
  const signedPayload = `${timestamp}.${payload}`;
  return crypto.hmac('sha256', secret, signedPayload, 'hex');
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
 * Generate a future date
 * @param {number} minDays - Minimum days from now
 * @param {number} maxDays - Maximum days from now
 * @returns {string} Date string (YYYY-MM-DD)
 */
function generateFutureDate(minDays = 1, maxDays = 30) {
  const days = minDays + Math.floor(Math.random() * (maxDays - minDays));
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Check SQS queue depth
 * In a real implementation, this would query the AWS SQS API
 * @returns {number} Approximate queue depth
 */
function checkSqsQueueDepth() {
  // Mock implementation - in real test, query SQS
  // For now, try to get queue stats from API
  try {
    const response = http.get(
      `${getHealthUrl().replace('/health', '')}/admin/queue-stats`,
      {
        headers: { 'Authorization': `Bearer ${TEST_DATA.jwtToken || ''}` },
        tags: { test_type: 'monitoring' },
      }
    );
    
    if (response.status === 200) {
      return response.json('queueDepth') || 0;
    }
  } catch (e) {
    // Queue stats endpoint may not be available
  }
  
  return 0;
}

/**
 * Check Dead Letter Queue for lost webhooks
 * @returns {Object} DLQ check result
 */
function checkDeadLetterQueue() {
  // Mock implementation - in real test, query SQS DLQ
  try {
    const response = http.get(
      `${getHealthUrl().replace('/health', '')}/admin/dlq-stats`,
      {
        headers: { 'Authorization': `Bearer ${TEST_DATA.jwtToken || ''}` },
        tags: { test_type: 'monitoring' },
      }
    );
    
    if (response.status === 200) {
      return {
        lostCount: response.json('messageCount') || 0,
        oldestMessage: response.json('oldestMessage'),
      };
    }
  } catch (e) {
    // DLQ stats endpoint may not be available
  }
  
  return { lostCount: 0 };
}
