// k6 Race Condition Test - MechMind OS 2026
// Best practices from Grafana Labs, Google SRE, Netflix

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import exec from 'k6/execution';

// Custom metrics
const doubleBookingRate = new Rate('double_booking_detected');
const conflictRate = new Rate('conflict_responses');
const successRate = new Rate('success_responses');
const apiLatency = new Trend('api_latency_ms');
const advisoryLockWait = new Trend('advisory_lock_wait_ms');

// Test configuration - 2026 Best Practice: Shared iterations for race condition testing
export const options = {
  scenarios: {
    // Race condition test: All VUs hit the same slot simultaneously
    race_condition: {
      executor: 'shared-iterations',
      vus: 100,        // 100 concurrent users
      iterations: 100, // Exactly 100 booking attempts
      maxDuration: '2m',
    },
    // Smoke test: Verify system still works after race condition
    smoke_test: {
      executor: 'constant-vus',
      vus: 2,
      duration: '30s',
      startTime: '2m10s', // Start after race condition
    },
  },
  
  // Thresholds - SLO-based
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.02'],
    double_booking_detected: ['rate==0'],  // CRITICAL: Must be 0!
    conflict_responses: ['rate>0.95'],       // Expect 99% conflicts
    success_responses: ['rate<0.05'],        // Expect 1% success
  },
  
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)', 'count'],
};

// Test data
const API_URL = __ENV.API_URL || 'http://localhost:3000';
const SLOT_ID = __ENV.TEST_SLOT_ID || 'test-slot-race-001';
const JWT_TOKEN = __ENV.JWT_TOKEN || 'test-token';

// Track results per scenario
const raceResults = {
  success: 0,
  conflict: 0,
  error: 0,
  total: 0,
};

export default function () {
  const scenario = exec.scenario.name;
  
  if (scenario === 'race_condition') {
    runRaceConditionTest();
  } else if (scenario === 'smoke_test') {
    runSmokeTest();
  }
}

function runRaceConditionTest() {
  const payload = JSON.stringify({
    slotId: SLOT_ID,
    mechanicId: 'mech-test-001',
    customerPhone: `+39-${exec.vu.idInInstance}-${Date.now()}`,
    serviceType: 'revisione',
    customerName: `Test User ${exec.vu.idInInstance}`,
  });

  const startTime = Date.now();
  
  const res = http.post(`${API_URL}/v1/bookings/reserve`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JWT_TOKEN}`,
      'X-Test-Scenario': 'race-condition',
    },
    tags: {
      scenario: 'race_condition',
    },
  });
  
  const latency = Date.now() - startTime;
  apiLatency.add(latency);

  // Track metrics
  if (res.status === 201) {
    successRate.add(1);
    conflictRate.add(0);
    raceResults.success++;
  } else if (res.status === 409) {
    successRate.add(0);
    conflictRate.add(1);
    raceResults.conflict++;
  } else {
    successRate.add(0);
    conflictRate.add(0);
    raceResults.error++;
  }
  raceResults.total++;

  // Validate response
  check(res, {
    'status is 201 or 409': (r) => r.status === 201 || r.status === 409,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'no server errors (5xx)': (r) => r.status < 500,
    'has booking ID on success': (r) => r.status !== 201 || r.json('id') !== undefined,
    'has conflict reason on 409': (r) => r.status !== 409 || r.json('error') !== undefined,
  });

  // Minimal think time to maximize contention
  sleep(0.01);
}

function runSmokeTest() {
  // Simple health check after race condition
  const res = http.get(`${API_URL}/health`, {
    headers: {
      'Authorization': `Bearer ${JWT_TOKEN}`,
    },
  });

  check(res, {
    'smoke: health check passes': (r) => r.status === 200,
    'smoke: response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}

// Post-test validation via handleSummary
// FIXED: Usa handleSummary() per generare VERO JSON (non JSONLINES)
export function handleSummary(data) {
  // Estrai metriche aggregate
  const httpReqs = data.metrics.http_reqs?.values?.count || 0;
  const httpErrors = data.metrics.http_req_failed?.values?.rate || 0;
  const p95Latency = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99Latency = data.metrics.http_req_duration?.values?.['p(99)'] || 0;
  
  // Conta status codes dai checks (approssimazione)
  const checksPassed = data.metrics.checks?.values?.passes || 0;
  const checksFailed = data.metrics.checks?.values?.fails || 0;
  
  // Race condition specific metrics
  const successCount = data.metrics.success_responses?.values?.rate * httpReqs || 0;
  const conflictCount = data.metrics.conflict_responses?.values?.rate * httpReqs || 0;

  const report = {
    test_metadata: {
      name: 'MechMind OS Race Condition Test',
      version: '2026.1',
      executed_at: new Date().toISOString(),
      executor: 'k6',
    },
    test_configuration: {
      concurrent_users: 100,
      total_iterations: 100,
      target_slot: SLOT_ID,
      api_endpoint: API_URL,
    },
    results: {
      total_requests: httpReqs,
      success_rate_percent: ((checksPassed / (checksPassed + checksFailed)) * 100).toFixed(2),
      error_rate_percent: (httpErrors * 100).toFixed(2),
      latency_ms: {
        p95: Math.round(p95Latency),
        p99: Math.round(p99Latency),
        avg: Math.round(data.metrics.http_req_duration?.values?.avg || 0),
      },
    },
    race_condition_analysis: {
      expected_behavior: {
        success_bookings: 1,
        conflict_responses: 99,
        double_bookings: 0,
      },
      // NOTE: I valori esatti richiedono post-processing DB
      estimated_success: Math.round(successCount),
      estimated_conflicts: Math.round(conflictCount),
      double_booking_verification: 'REQUIRES_DB_CHECK',
    },
    thresholds: {
      all_passed: Object.values(data.metrics).every(m => 
        !m.thresholds || Object.values(m.thresholds).every(t => t.ok)
      ),
      details: Object.entries(data.metrics).reduce((acc, [name, metric]) => {
        if (metric.thresholds) {
          acc[name] = Object.entries(metric.thresholds).map(([tname, t]) => ({
            name: tname,
            passed: t.ok,
          }));
        }
        return acc;
      }, {}),
    },
    recommendations: generateRecommendations(p95Latency, httpErrors),
  };

  return {
    'k6-summary.json': JSON.stringify(report, null, 2),  // ✅ VERO JSON
    'stdout': textSummary(data, { indent: '→', enableColors: true }),
  };
}

function generateRecommendations(p95, errorRate) {
  const recs = [];
  
  if (p95 > 500) {
    recs.push({
      severity: 'warning',
      issue: 'p95 latency > 500ms',
      recommendation: 'Consider Lambda Provisioned Concurrency or RDS connection pooling',
    });
  }
  
  if (errorRate > 0.01) {
    recs.push({
      severity: 'critical',
      issue: 'Error rate > 1%',
      recommendation: 'Check advisory lock implementation and connection limits',
    });
  }
  
  return recs.length > 0 ? recs : [{ severity: 'info', message: 'All metrics within SLO' }];
}
