/**
 * MechMind OS v10 - Vapi Call Event Webhook Handler
 * 
 * Handles all Vapi webhook events:
 * - call.started
 * - call.ended
 * - function_call
 * - status_update
 * - transcript
 * 
 * @module webhooks/call-event-handler
 */

const crypto = require('crypto');
const { verifyHmacSignature } = require('../utils/hmac');
const { handleFunctionCall } = require('./function-handler');
const { sendSMS } = require('../twilio/sms');
const { transferToHuman } = require('../twilio/transfer');

// Configuration
const CONFIG = {
  MAX_RESPONSE_TIME_MS: 2500,
  FALLBACK_TIMEOUT_MS: 5000,
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000
};

/**
 * Main webhook handler for Vapi call events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleCallEvent(req, res) {
  const startTime = Date.now();
  
  try {
    // Verify HMAC signature
    const signature = req.headers['x-vapi-signature'];
    const secret = process.env.VAPI_WEBHOOK_SECRET;
    
    if (!verifyHmacSignature(req.body, signature, secret)) {
      console.error('[VAPI] Invalid HMAC signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const { type, call } = event;
    
    console.log(`[VAPI] Received event: ${type}`, {
      callId: call?.id,
      phoneNumber: call?.customer?.number,
      timestamp: new Date().toISOString()
    });

    // Extract tenant/shop context from headers or call metadata
    const shopId = req.headers['x-shop-id'] || call?.metadata?.shopId;
    const tenantId = req.headers['x-tenant-id'] || call?.metadata?.tenantId;

    if (!shopId || !tenantId) {
      console.error('[VAPI] Missing tenant/shop context');
      return res.status(400).json({ error: 'Missing tenant context' });
    }

    let result;

    switch (type) {
      case 'call.started':
        result = await handleCallStarted(call, { shopId, tenantId });
        break;
        
      case 'call.ended':
        result = await handleCallEnded(call, { shopId, tenantId });
        break;
        
      case 'function_call':
        result = await handleFunctionCallEvent(event, { shopId, tenantId });
        break;
        
      case 'status_update':
        result = await handleStatusUpdate(call, event.status, { shopId, tenantId });
        break;
        
      case 'transcript':
        result = await handleTranscript(call, event.transcript, { shopId, tenantId });
        break;
        
      default:
        console.warn(`[VAPI] Unknown event type: ${type}`);
        result = { acknowledged: true, type: 'unknown' };
    }

    // Check response time
    const responseTime = Date.now() - startTime;
    if (responseTime > CONFIG.MAX_RESPONSE_TIME_MS) {
      console.warn(`[VAPI] Slow response: ${responseTime}ms`);
    }

    res.json({
      success: true,
      responseTime,
      ...result
    });

  } catch (error) {
    console.error('[VAPI] Webhook handler error:', error);
    
    // Fail-safe: return graceful error to prevent Vapi from hanging
    res.status(500).json({
      success: false,
      error: 'Internal error',
      fallback: true,
      message: 'Aspetta un momento, ti passo a un collega umano.'
    });
  }
}

/**
 * Handle call started event
 */
async function handleCallStarted(call, context) {
  const { shopId, tenantId } = context;
  const phoneNumber = call.customer?.number;

  console.log(`[VAPI] Call started from ${phoneNumber} to shop ${shopId}`);

  // Log call start for analytics
  await logCallEvent({
    event: 'call.started',
    callId: call.id,
    shopId,
    tenantId,
    phoneNumber,
    startedAt: new Date().toISOString()
  });

  // Pre-fetch customer data for faster responses
  const customerLookup = await prefetchCustomerData(phoneNumber, shopId);

  return {
    type: 'call.started',
    customerPreloaded: !!customerLookup,
    shopId,
    greeting: customerLookup 
      ? `Bentornato ${customerLookup.firstName}!`
      : 'Benvenuto!'
  };
}

/**
 * Handle call ended event
 */
async function handleCallEnded(call, context) {
  const { shopId, tenantId } = context;
  const phoneNumber = call.customer?.number;
  const duration = call.endedAt - call.startedAt;

  console.log(`[VAPI] Call ended: ${call.id}, duration: ${duration}ms`);

  // Log call end
  await logCallEvent({
    event: 'call.ended',
    callId: call.id,
    shopId,
    tenantId,
    phoneNumber,
    duration,
    endedAt: new Date().toISOString(),
    endedReason: call.endedReason
  });

  // Send SMS recap if call dropped unexpectedly
  if (call.endedReason === 'customer-disconnected' && duration < 30000) {
    await sendSMS({
      to: phoneNumber,
      body: 'Grazie per aver chiamato la nostra officina. Ti richiamiamo al più presto per assisterti.',
      shopId,
      tenantId
    });
  }

  return {
    type: 'call.ended',
    logged: true,
    smsSent: call.endedReason === 'customer-disconnected' && duration < 30000
  };
}

/**
 * Handle function call events from Vapi
 */
async function handleFunctionCallEvent(event, context) {
  const { functionCall } = event;
  const { name, parameters, callId } = functionCall;

  console.log(`[VAPI] Function call: ${name}`, parameters);

  // Execute function with retry logic
  let attempts = 0;
  let lastError;

  while (attempts < CONFIG.MAX_RETRIES) {
    try {
      const result = await handleFunctionCall(name, parameters, context);
      
      return {
        type: 'function_call',
        function: name,
        result,
        attempts: attempts + 1
      };
    } catch (error) {
      lastError = error;
      attempts++;
      
      if (attempts < CONFIG.MAX_RETRIES) {
        await delay(CONFIG.RETRY_DELAY_MS);
      }
    }
  }

  // All retries failed
  console.error(`[VAPI] Function ${name} failed after ${attempts} attempts:`, lastError);

  // Return graceful fallback
  return {
    type: 'function_call',
    function: name,
    error: true,
    fallback: true,
    message: getFallbackMessage(name),
    details: lastError.message
  };
}

/**
 * Handle status update events
 */
async function handleStatusUpdate(call, status, context) {
  console.log(`[VAPI] Status update: ${status}`);

  // Check for timeout/failure conditions
  if (status === 'no-response' || status === 'error') {
    // Trigger fallback transfer
    await transferToHuman({
      callId: call.id,
      reason: 'AI timeout/no-response',
      priority: 'high',
      context: { shopId: context.shopId, tenantId: context.tenantId }
    });
  }

  return {
    type: 'status_update',
    status,
    actionTaken: status === 'no-response' ? 'transfer_initiated' : 'logged'
  };
}

/**
 * Handle transcript events for logging/analysis
 */
async function handleTranscript(call, transcript, context) {
  // Store transcript for quality assurance
  await storeTranscript({
    callId: call.id,
    shopId: context.shopId,
    tenantId: context.tenantId,
    transcript,
    timestamp: new Date().toISOString()
  });

  // Analyze sentiment for escalation
  const sentiment = analyzeSentiment(transcript);
  
  if (sentiment.score < -0.7) {
    // Negative sentiment - prepare for escalation
    await flagForEscalation({
      callId: call.id,
      reason: 'negative_sentiment',
      sentiment: sentiment.score,
      shopId: context.shopId
    });
  }

  return {
    type: 'transcript',
    stored: true,
    sentiment: sentiment.score
  };
}

/**
 * Prefetch customer data for faster responses
 */
async function prefetchCustomerData(phoneNumber, shopId) {
  try {
    // This would call your backend API
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/customers/lookup?phone=${encodeURIComponent(phoneNumber)}&shopId=${shopId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shopId
        }
      }
    );

    if (!response.ok) return null;
    
    return await response.json();
  } catch (error) {
    console.error('[VAPI] Customer prefetch failed:', error);
    return null;
  }
}

/**
 * Log call event for analytics
 */
async function logCallEvent(eventData) {
  try {
    await fetch(`${process.env.BACKEND_API_URL}/analytics/call-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
      },
      body: JSON.stringify(eventData)
    });
  } catch (error) {
    console.error('[VAPI] Failed to log call event:', error);
  }
}

/**
 * Store transcript for QA
 */
async function storeTranscript(transcriptData) {
  try {
    await fetch(`${process.env.BACKEND_API_URL}/calls/transcripts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
      },
      body: JSON.stringify(transcriptData)
    });
  } catch (error) {
    console.error('[VAPI] Failed to store transcript:', error);
  }
}

/**
 * Simple sentiment analysis
 */
function analyzeSentiment(transcript) {
  const negativeWords = ['rotto', 'problema', 'arrabbiato', 'deluso', 'pessimo', 'scandalo', 'denuncia'];
  const positiveWords = ['grazie', 'ottimo', 'perfetto', 'bravi', 'soddisfatto'];
  
  let score = 0;
  const text = transcript.toLowerCase();
  
  negativeWords.forEach(word => {
    if (text.includes(word)) score -= 0.3;
  });
  
  positiveWords.forEach(word => {
    if (text.includes(word)) score += 0.2;
  });

  return { score: Math.max(-1, Math.min(1, score)) };
}

/**
 * Flag call for human escalation
 */
async function flagForEscalation(data) {
  try {
    await fetch(`${process.env.BACKEND_API_URL}/escalations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
      },
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.error('[VAPI] Failed to flag escalation:', error);
  }
}

/**
 * Get fallback message for failed functions
 */
function getFallbackMessage(functionName) {
  const messages = {
    'lookup_customer_by_phone': 'Non riesco a trovare i tuoi dati al momento.',
    'get_available_slots': 'Ho un problema a controllare gli orari disponibili.',
    'create_booking': 'Non riesco a completare la prenotazione ora.',
    'check_booking_status': 'Non riesco a verificare lo stato adesso.',
    'get_vehicle_history': 'Non riesco a recuperare lo storico del veicolo.',
    'escalate_to_human': 'Ti passo subito a un collega.',
    'send_sms_confirmation': 'Invierò il messaggio tra poco.'
  };
  
  return messages[functionName] || 'Aspetta un momento, ti passo a un collega umano.';
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  handleCallEvent,
  handleCallStarted,
  handleCallEnded,
  handleFunctionCallEvent,
  handleStatusUpdate,
  handleTranscript
};
