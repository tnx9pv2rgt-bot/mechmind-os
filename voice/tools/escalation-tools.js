/**
 * MechMind OS v10 - Escalation Tools
 * 
 * Human escalation management:
 * - Transfer to human operator
 * - Queue management
 * - Priority handling
 * - Context passing
 * 
 * @module tools/escalation-tools
 */

const { transferToHuman: twilioTransfer } = require('../twilio/transfer');

// Escalation reasons and priorities
const ESCALATION_REASONS = {
  COMPLAINT: 'complaint',
  UNKNOWN_INTENT: 'unknown_intent',
  AI_TIMEOUT: 'ai_timeout',
  CUSTOMER_REQUEST: 'customer_request',
  BOOKING_FAILURE: 'booking_failure',
  SYSTEM_ERROR: 'system_error',
  NEGATIVE_SENTIMENT: 'negative_sentiment',
  COMPLEX_REQUEST: 'complex_request',
  GDPR_REQUEST: 'gdpr_request'
};

const PRIORITY_LEVELS = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Escalation configuration
const ESCALATION_CONFIG = {
  MAX_QUEUE_TIME_MINUTES: 10,
  CALLBACK_OFFER_THRESHOLD: 5,
  CONTEXT_SUMMARY_MAX_LENGTH: 500
};

/**
 * Escalate call to human operator
 * @param {Object} params - Escalation parameters
 */
async function escalateToHuman(params) {
  const {
    phoneNumber,
    shopId,
    reason,
    priority = PRIORITY_LEVELS.NORMAL,
    context = {},
    conversationHistory = [],
    customerData = null
  } = params;

  console.log('[Escalation] Initiating:', { reason, priority, shopId });

  try {
    // Build escalation context
    const escalationContext = buildEscalationContext({
      reason,
      priority,
      conversationHistory,
      customerData,
      customContext: context
    });

    // Log escalation
    const escalationLog = await logEscalation({
      phoneNumber,
      shopId,
      reason,
      priority,
      context: escalationContext,
      escalatedAt: new Date().toISOString()
    });

    // Check for available staff
    const staffAvailability = await checkStaffAvailability(shopId, priority);

    if (staffAvailability.availableNow) {
      // Direct transfer
      const transferResult = await twilioTransfer({
        phoneNumber,
        targetNumber: staffAvailability.staffPhone,
        shopId,
        context: escalationContext,
        priority
      });

      return {
        success: true,
        escalated: true,
        transferType: 'direct',
        targetStaff: staffAvailability.staffName,
        estimatedWait: 0,
        escalationId: escalationLog.id,
        message: 'Ti passo subito a un collega.'
      };
    }

    // No staff available - queue or offer callback
    if (staffAvailability.estimatedWaitMinutes > ESCALATION_CONFIG.CALLBACK_OFFER_THRESHOLD) {
      return await offerCallbackEscalation({
        phoneNumber,
        shopId,
        reason,
        priority,
        context: escalationContext,
        estimatedWait: staffAvailability.estimatedWaitMinutes,
        escalationId: escalationLog.id
      });
    }

    // Add to queue
    return await queueEscalation({
      phoneNumber,
      shopId,
      reason,
      priority,
      context: escalationContext,
      position: staffAvailability.queueLength + 1,
      estimatedWait: staffAvailability.estimatedWaitMinutes,
      escalationId: escalationLog.id
    });

  } catch (error) {
    console.error('[Escalation] Error:', error);

    // Fail-safe: offer callback
    return await offerCallbackEscalation({
      phoneNumber,
      shopId,
      reason,
      priority,
      context: {},
      estimatedWait: 10,
      error: error.message
    });
  }
}

/**
 * Build escalation context for human operator
 */
function buildEscalationContext(params) {
  const { reason, priority, conversationHistory, customerData, customContext } = params;

  const context = {
    reason,
    priority,
    timestamp: new Date().toISOString(),
    summary: generateConversationSummary(conversationHistory),
    customer: customerData ? {
      id: customerData.id,
      name: customerData.fullName,
      phone: customerData.phone,
      isVIP: customerData.isVIP,
      loyaltyTier: customerData.loyaltyTier
    } : null,
    ...customContext
  };

  return context;
}

/**
 * Generate conversation summary for operator
 */
function generateConversationSummary(history) {
  if (!history || history.length === 0) {
    return 'Nessuna conversazione precedente';
  }

  // Extract key points from conversation
  const summary = [];
  let customerIntent = null;
  let customerMood = 'neutral';

  for (const turn of history.slice(-5)) { // Last 5 turns
    if (turn.speaker === 'customer') {
      // Detect intent
      if (!customerIntent) {
        customerIntent = detectIntent(turn.text);
      }
      
      // Detect mood
      const mood = detectMood(turn.text);
      if (mood !== 'neutral') {
        customerMood = mood;
      }
    }
  }

  if (customerIntent) {
    summary.push(`Intento: ${customerIntent}`);
  }
  
  summary.push(`Umore cliente: ${customerMood}`);
  summary.push(`Turni conversazione: ${history.length}`);

  return summary.join(' | ');
}

/**
 * Detect customer intent from text
 */
function detectIntent(text) {
  const patterns = {
    'prenotazione': /prenot|appunt/i,
    'stato_lavoro': /pront|finit|dove/i,
    'reclamo': /problema|male|arrabbiat/i,
    'informazioni': /orari|dove|costa/i,
    'emergenza': /emergenza|urgente|subito/i
  };

  for (const [intent, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return intent;
    }
  }

  return 'generico';
}

/**
 * Detect customer mood
 */
function detectMood(text) {
  const negative = /arrabbiat|furios|delus|insoddisfatt|scandal/i;
  const positive = /content|soddisfatt|felic|grazie/i;
  const urgent = /urgente|subito|emergenza|aiuto/i;

  if (urgent.test(text)) return 'urgente';
  if (negative.test(text)) return 'negativo';
  if (positive.test(text)) return 'positivo';
  
  return 'neutral';
}

/**
 * Check staff availability
 */
async function checkStaffAvailability(shopId, priority) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/shops/${shopId}/staff/availability?priority=${priority}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shopId
        }
      }
    );

    if (!response.ok) {
      // Return fallback data
      return {
        availableNow: false,
        estimatedWaitMinutes: 5,
        queueLength: 2
      };
    }

    return await response.json();

  } catch (error) {
    console.error('[Escalation] Staff check error:', error);
    return {
      availableNow: false,
      estimatedWaitMinutes: 5,
      queueLength: 2
    };
  }
}

/**
 * Queue escalation for later handling
 */
async function queueEscalation(params) {
  const { phoneNumber, shopId, position, estimatedWait, escalationId } = params;

  try {
    // Add to escalation queue
    await fetch(`${process.env.BACKEND_API_URL}/escalation-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
      },
      body: JSON.stringify(params)
    });

    return {
      success: true,
      escalated: true,
      transferType: 'queued',
      queuePosition: position,
      estimatedWait,
      escalationId,
      message: `Tutti gli operatori sono occupati. Sei in posizione ${position} in coda. Tempo stimato: ${estimatedWait} minuti.`
    };

  } catch (error) {
    console.error('[Escalation] Queue error:', error);
    
    return {
      success: false,
      escalated: false,
      error: error.message
    };
  }
}

/**
 * Offer callback instead of waiting
 */
async function offerCallbackEscalation(params) {
  const { phoneNumber, shopId, estimatedWait, escalationId } = params;

  // Schedule callback
  try {
    await fetch(`${process.env.BACKEND_API_URL}/callbacks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
      },
      body: JSON.stringify({
        phoneNumber,
        shopId,
        priority: 'high',
        reason: 'escalation_callback',
        estimatedCallback: new Date(Date.now() + estimatedWait * 60000).toISOString(),
        escalationId
      })
    });

    return {
      success: true,
      escalated: true,
      transferType: 'callback_scheduled',
      estimatedCallback: estimatedWait,
      escalationId,
      message: `Ti richiameremo entro ${estimatedWait} minuti. Grazie per la pazienza.`
    };

  } catch (error) {
    console.error('[Escalation] Callback scheduling error:', error);
    
    return {
      success: false,
      escalated: false,
      error: error.message,
      message: 'Ti richiamiamo al più presto. Grazie.'
    };
  }
}

/**
 * Log escalation for analytics
 */
async function logEscalation(escalationData) {
  try {
    const response = await fetch(`${process.env.BACKEND_API_URL}/escalations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
      },
      body: JSON.stringify(escalationData)
    });

    if (!response.ok) {
      throw new Error('Escalation logging failed');
    }

    return await response.json();

  } catch (error) {
    console.error('[Escalation] Logging error:', error);
    return { id: 'unknown' };
  }
}

/**
 * Get escalation statistics
 */
async function getEscalationStats(shopId, period = '24h') {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/analytics/escalations?shopId=${shopId}&period=${period}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
        }
      }
    );

    if (!response.ok) return null;

    return await response.json();

  } catch (error) {
    console.error('[Escalation] Stats error:', error);
    return null;
  }
}

/**
 * Handle GDPR-related escalation
 */
async function handleGDPREscalation(params) {
  const { phoneNumber, shopId, requestType } = params;

  // GDPR requests require immediate human attention
  return await escalateToHuman({
    phoneNumber,
    shopId,
    reason: ESCALATION_REASONS.GDPR_REQUEST,
    priority: PRIORITY_LEVELS.HIGH,
    context: {
      gdprRequestType: requestType,
      requiresVerification: true
    }
  });
}

module.exports = {
  escalateToHuman,
  buildEscalationContext,
  generateConversationSummary,
  checkStaffAvailability,
  queueEscalation,
  offerCallbackEscalation,
  getEscalationStats,
  handleGDPREscalation,
  ESCALATION_REASONS,
  PRIORITY_LEVELS,
  ESCALATION_CONFIG
};
