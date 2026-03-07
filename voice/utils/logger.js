/**
 * MechMind OS v10 - Voice AI Logger
 * 
 * Structured logging for voice interactions:
 * - Call event logging
 * - Performance metrics
 * - Error tracking
 * - Analytics data
 * 
 * @module utils/logger
 */

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

// Log buffer for batching
const logBuffer = [];
const BUFFER_FLUSH_INTERVAL = 5000; // 5 seconds
const BUFFER_MAX_SIZE = 100;

// Initialize buffer flush
setInterval(flushLogBuffer, BUFFER_FLUSH_INTERVAL);

/**
 * Log call event
 * @param {Object} event - Call event data
 */
function logCallEvent(event) {
  const logEntry = {
    type: 'call_event',
    timestamp: new Date().toISOString(),
    ...event
  };

  bufferLog(logEntry);
  
  if (CURRENT_LEVEL >= LOG_LEVELS.INFO) {
    console.log(`[Call] ${event.event}:`, {
      callId: event.callId,
      shopId: event.shopId,
      duration: event.duration
    });
  }
}

/**
 * Log function call
 * @param {Object} call - Function call data
 */
function logFunctionCall(call) {
  const logEntry = {
    type: 'function_call',
    timestamp: new Date().toISOString(),
    function: call.name,
    duration: call.duration,
    success: call.success,
    error: call.error,
    shopId: call.shopId
  };

  bufferLog(logEntry);

  if (CURRENT_LEVEL >= LOG_LEVELS.DEBUG) {
    console.log(`[Function] ${call.name}:`, {
      duration: call.duration,
      success: call.success
    });
  }
}

/**
 * Log intent detection
 * @param {Object} intent - Intent detection result
 */
function logIntentDetection(intent) {
  const logEntry = {
    type: 'intent_detection',
    timestamp: new Date().toISOString(),
    intentType: intent.type,
    confidence: intent.confidence,
    detected: intent.detected,
    transcript: intent.transcript?.substring(0, 200) // Truncate
  };

  bufferLog(logEntry);

  if (CURRENT_LEVEL >= LOG_LEVELS.DEBUG) {
    console.log(`[Intent] ${intent.type}:`, {
      confidence: intent.confidence,
      detected: intent.detected
    });
  }
}

/**
 * Log escalation
 * @param {Object} escalation - Escalation data
 */
function logEscalation(escalation) {
  const logEntry = {
    type: 'escalation',
    timestamp: new Date().toISOString(),
    reason: escalation.reason,
    priority: escalation.priority,
    transferType: escalation.transferType,
    estimatedWait: escalation.estimatedWait,
    shopId: escalation.shopId
  };

  bufferLog(logEntry);

  console.log(`[Escalation] ${escalation.reason}:`, {
    priority: escalation.priority,
    transferType: escalation.transferType
  });
}

/**
 * Log performance metric
 * @param {Object} metric - Performance metric
 */
function logPerformance(metric) {
  const logEntry = {
    type: 'performance',
    timestamp: new Date().toISOString(),
    metric: metric.name,
    value: metric.value,
    unit: metric.unit,
    shopId: metric.shopId,
    context: metric.context
  };

  bufferLog(logEntry);

  if (CURRENT_LEVEL >= LOG_LEVELS.DEBUG) {
    console.log(`[Perf] ${metric.name}:`, metric.value, metric.unit);
  }
}

/**
 * Log error
 * @param {Error} error - Error object
 * @param {Object} context - Error context
 */
function logError(error, context = {}) {
  const logEntry = {
    type: 'error',
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    },
    context: {
      shopId: context.shopId,
      callId: context.callId,
      function: context.function,
      ...context
    }
  };

  bufferLog(logEntry);

  console.error(`[Error] ${error.message}:`, {
    context: context,
    stack: error.stack?.split('\n')[0]
  });

  // Send to error tracking service
  sendToErrorTracking(error, context).catch(err => {
    console.error('Failed to send to error tracking:', err);
  });
}

/**
 * Log security event
 * @param {Object} event - Security event
 */
function logSecurityEvent(event) {
  const logEntry = {
    type: 'security',
    timestamp: new Date().toISOString(),
    event: event.type,
    severity: event.severity,
    source: event.source,
    details: event.details,
    shopId: event.shopId
  };

  bufferLog(logEntry);

  console.warn(`[Security] ${event.type}:`, {
    severity: event.severity,
    source: event.source
  });
}

/**
 * Log analytics event
 * @param {Object} event - Analytics event
 */
function logAnalytics(event) {
  const logEntry = {
    type: 'analytics',
    timestamp: new Date().toISOString(),
    event: event.name,
    properties: event.properties,
    shopId: event.shopId,
    sessionId: event.sessionId
  };

  bufferLog(logEntry);
}

/**
 * Add log to buffer
 * @param {Object} logEntry - Log entry
 */
function bufferLog(logEntry) {
  logBuffer.push(logEntry);

  // Flush if buffer is full
  if (logBuffer.length >= BUFFER_MAX_SIZE) {
    flushLogBuffer();
  }
}

/**
 * Flush log buffer to backend
 */
async function flushLogBuffer() {
  if (logBuffer.length === 0) return;

  const logsToSend = [...logBuffer];
  logBuffer.length = 0;

  try {
    const response = await fetch(`${process.env.BACKEND_API_URL}/logs/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
      },
      body: JSON.stringify({ logs: logsToSend })
    });

    if (!response.ok) {
      throw new Error(`Log flush failed: ${response.status}`);
    }

  } catch (error) {
    console.error('[Logger] Flush failed:', error);
    
    // Re-add logs to buffer for retry (with limit)
    if (logBuffer.length + logsToSend.length < BUFFER_MAX_SIZE * 2) {
      logBuffer.unshift(...logsToSend);
    }
  }
}

/**
 * Send error to tracking service
 * @param {Error} error - Error object
 * @param {Object} context - Error context
 */
async function sendToErrorTracking(error, context) {
  // Integration with Sentry, Rollbar, etc.
  if (process.env.SENTRY_DSN) {
    // Sentry integration would go here
  }
}

/**
 * Create call session logger
 * @param {string} callId - Call ID
 * @param {string} shopId - Shop ID
 */
function createCallLogger(callId, shopId) {
  return {
    log: (event, data) => logCallEvent({
      callId,
      shopId,
      event,
      ...data
    }),
    
    logIntent: (intent) => logIntentDetection({
      callId,
      shopId,
      ...intent
    }),
    
    logFunction: (func) => logFunctionCall({
      callId,
      shopId,
      ...func
    }),
    
    logError: (error, context) => logError(error, {
      callId,
      shopId,
      ...context
    }),
    
    logPerformance: (metric) => logPerformance({
      callId,
      shopId,
      ...metric
    })
  };
}

/**
 * Get log statistics
 */
function getLogStats() {
  return {
    bufferSize: logBuffer.length,
    lastFlush: new Date().toISOString()
  };
}

module.exports = {
  logCallEvent,
  logFunctionCall,
  logIntentDetection,
  logEscalation,
  logPerformance,
  logError,
  logSecurityEvent,
  logAnalytics,
  createCallLogger,
  getLogStats,
  flushLogBuffer,
  LOG_LEVELS
};
