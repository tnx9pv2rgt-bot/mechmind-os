/**
 * MechMind OS v10 - k6 Load Test for Voice API
 * Tests voice webhook handling under concurrent load
 * 
 * Validation Points:
 * - <2s voice response latency (p99)
 * - HMAC signature verification under load
 * - Intent extraction performance
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import crypto from 'k6/crypto';

// Custom metrics
const voiceResponseTime = new Trend('voice_response_time');
const intentExtractionTime = new Trend('intent_extraction_time');
const hmacVerificationTime = new Trend('hmac_verification_time');
const voiceSuccessRate = new Rate('voice_success_rate');

// Test configuration
export const options = {
  scenarios: {
    // Normal voice load
    voice_normal: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      exec: 'voiceWebhookTest',
    },
    // Peak voice load (lunch rush, etc.)
    voice_peak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      exec: 'voiceWebhookTest',
    },
    // Voice timeout scenarios
    voice_timeout: {
      executor: 'constant-vus',
      vus: 20,
      duration: '2m',
      exec: 'voiceTimeoutTest',
    },
  },
  thresholds: {
    // Performance thresholds
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
    
    // Voice-specific thresholds
    voice_response_time: ['p(99)<2000'], // <2s p99 requirement
    intent_extraction_time: ['p(95)<500'],
    hmac_verification_time: ['p(95)<50'],
    voice_success_rate: ['rate>0.95'],
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const WEBHOOK_SECRET = __ENV.WEBHOOK_SECRET || 'test-webhook-secret';
const TEST_TENANT_ID = __ENV.TEST_TENANT_ID || 'test-tenant-123';
const TEST_SHOP_ID = __ENV.TEST_SHOP_ID || 'test-shop-456';

// Sample transcripts for testing
const TRANSCRIPTS = [
  'I need to book an oil change for tomorrow at 2pm',
  'Can I schedule a tire rotation for next Tuesday?',
  'I want to cancel my appointment',
  'What services do you offer?',
  'Book brake service for Friday morning',
  'I need an appointment as soon as possible',
  'Reschedule my booking to next week',
  'How much does an oil change cost?',
];

/**
 * Generate HMAC signature for webhook
 */
function generateSignature(payload) {
  const startTime = Date.now();
  const signature = crypto.hmac('sha256', WEBHOOK_SECRET, payload, 'hex');
  hmacVerificationTime.add(Date.now() - startTime);
  return signature;
}

/**
 * Voice Webhook Test
 * Simulates incoming voice webhooks with booking requests
 */
export function voiceWebhookTest() {
  group('Voice Webhook - Booking Request', () => {
    const transcript = TRANSCRIPTS[randomIntBetween(0, TRANSCRIPTS.length - 1)];
    const callId = randomString(16);
    
    const payload = JSON.stringify({
      event: 'call.completed',
      call_id: callId,
      timestamp: new Date().toISOString(),
      phone_number: `+1${randomIntBetween(2000000000, 9999999999)}`,
      transcript: transcript,
      recording_url: `https://recordings.example.com/${callId}.mp3`,
      shop_id: TEST_SHOP_ID,
      confidence: 0.85 + Math.random() * 0.15,
    });

    const signature = generateSignature(payload);
    const startTime = Date.now();

    const response = http.post(`${BASE_URL}/voice/webhook`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Tenant-ID': TEST_TENANT_ID,
        'X-Request-ID': randomString(16),
      },
      tags: { test_type: 'voice_webhook' },
    });

    const duration = Date.now() - startTime;
    voiceResponseTime.add(duration);

    const isSuccess = response.status === 200;
    voiceSuccessRate.add(isSuccess);

    // Check intent extraction time if available
    if (response.json('processingTime')) {
      intentExtractionTime.add(response.json('processingTime'));
    }

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s (p99)': (r) => r.timings.duration < 2000,
      'has booking or escalation': (r) => {
        const json = r.json();
        return json.success !== undefined || json.escalated !== undefined;
      },
    });

    if (response.status !== 200) {
      console.error(`Voice webhook failed: ${response.status} - ${response.body}`);
    }
  });

  sleep(randomIntBetween(1, 3));
}

/**
 * Voice Timeout Test
 * Simulates timeout scenarios requiring escalation
 */
export function voiceTimeoutTest() {
  group('Voice Webhook - Timeout', () => {
    const callId = randomString(16);
    
    const payload = JSON.stringify({
      event: 'call.timeout',
      call_id: callId,
      timestamp: new Date().toISOString(),
      phone_number: `+1${randomIntBetween(2000000000, 9999999999)}`,
      duration_seconds: 30,
      reason: 'no_response',
    });

    const signature = generateSignature(payload);
    const startTime = Date.now();

    const response = http.post(`${BASE_URL}/voice/webhook`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Tenant-ID': TEST_TENANT_ID,
      },
      tags: { test_type: 'voice_timeout' },
    });

    const duration = Date.now() - startTime;
    voiceResponseTime.add(duration);

    check(response, {
      'timeout handled': (r) => r.status === 200,
      'escalation triggered': (r) => r.json('escalated') === true,
      'SMS fallback sent': (r) => r.json('smsSent') === true,
    });
  });

  sleep(randomIntBetween(2, 5));
}

/**
 * Voice Callback Test
 * Simulates voice platform callbacks
 */
export function voiceCallbackTest() {
  group('Voice Callback', () => {
    const payload = JSON.stringify({
      call_sid: randomString(16),
      from: `+1${randomIntBetween(2000000000, 9999999999)}`,
      to: '+15551234567',
      status: 'in-progress',
      direction: 'inbound',
    });

    const response = http.post(`${BASE_URL}/voice/callback`, payload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Tenant-ID': TEST_TENANT_ID,
      },
      tags: { test_type: 'voice_callback' },
    });

    check(response, {
      'callback handled': (r) => r.status === 200,
      'returns TwiML': (r) => r.body.includes('Response'),
    });
  });

  sleep(0.5);
}

/**
 * Transcription Callback Test
 * Simulates transcription completion callbacks
 */
export function transcriptionCallbackTest() {
  group('Transcription Callback', () => {
    const payload = JSON.stringify({
      call_sid: randomString(16),
      transcription_text: TRANSCRIPTS[randomIntBetween(0, TRANSCRIPTS.length - 1)],
      confidence: 0.8 + Math.random() * 0.2,
      language: 'en-US',
    });

    const response = http.post(`${BASE_URL}/voice/transcription`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TEST_TENANT_ID,
      },
      tags: { test_type: 'transcription' },
    });

    check(response, {
      'transcription handled': (r) => r.status === 200,
      'intent extracted': (r) => r.json('intent') !== undefined,
    });
  });

  sleep(1);
}

/**
 * Security Test - Invalid Signature
 */
export function invalidSignatureTest() {
  group('Security - Invalid Signature', () => {
    const payload = JSON.stringify({
      event: 'call.completed',
      call_id: randomString(16),
      timestamp: new Date().toISOString(),
      phone_number: '+15551234567',
      transcript: 'Book oil change',
    });

    const response = http.post(`${BASE_URL}/voice/webhook`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': 'invalid-signature',
        'X-Tenant-ID': TEST_TENANT_ID,
      },
      tags: { test_type: 'security_invalid_sig' },
    });

    check(response, {
      'rejects invalid signature': (r) => r.status === 401,
    });
  });

  sleep(1);
}

/**
 * Setup function
 */
export function setup() {
  console.log('🎙️ Starting MechMind OS Voice API Load Test');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🏢 Tenant ID: ${TEST_TENANT_ID}`);
  console.log(`🏪 Shop ID: ${TEST_SHOP_ID}`);
  
  // Verify API health
  const healthCheck = http.get(`${BASE_URL.replace('/api/v1', '')}/health`);
  if (healthCheck.status !== 200) {
    console.error('❌ API health check failed!');
    return { skip: true };
  }
  
  console.log('✅ API is healthy, starting voice load test...');
  return {};
}

/**
 * Teardown function
 */
export function teardown(data) {
  if (data.skip) {
    console.log('⏭️ Test skipped due to setup failure');
    return;
  }
  
  console.log('\n📊 Voice Load Test Summary:');
  console.log('==========================');
  console.log(`✅ Voice API load test completed`);
}
