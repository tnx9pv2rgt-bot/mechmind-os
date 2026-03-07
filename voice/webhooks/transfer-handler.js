/**
 * MechMind OS v10 - Transfer Handler
 * 
 * Handles call transfers to human operators:
 * - Queue management
 * - Mechanic availability check
 * - Conference bridging
 * - Fallback routing
 * 
 * @module webhooks/transfer-handler
 */

const twilio = require('twilio');

// Twilio client initialization
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Transfer configuration
const TRANSFER_CONFIG = {
  MAX_QUEUE_TIME_SECONDS: 300, // 5 minutes max wait
  FALLBACK_AFTER_SECONDS: 60,  // Fallback after 1 minute
  CONFERENCE_TIMEOUT_SECONDS: 30,
  HOLD_MUSIC_URL: 'https://api.mechmind-os.com/audio/hold-music.mp3'
};

/**
 * Handle transfer webhook from Vapi
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function handleTransferWebhook(req, res) {
  try {
    const { callId, reason, priority, customerPhone, shopId } = req.body;

    console.log('[Transfer] Transfer request received', {
      callId,
      reason,
      priority,
      shopId
    });

    // Check mechanic availability
    const availability = await checkMechanicAvailability(shopId);

    if (availability.availableNow) {
      // Direct transfer to available mechanic
      const transferResult = await initiateDirectTransfer({
        callId,
        targetNumber: availability.mechanicPhone,
        customerPhone,
        shopId
      });

      return res.json({
        success: true,
        transferType: 'direct',
        target: availability.mechanicName,
        estimatedWait: 0
      });
    }

    // No immediate availability - queue the call
    const queueResult = await queueForTransfer({
      callId,
      customerPhone,
      shopId,
      priority,
      reason,
      estimatedWait: availability.estimatedWaitMinutes
    });

    return res.json({
      success: true,
      transferType: 'queued',
      queuePosition: queueResult.position,
      estimatedWait: availability.estimatedWaitMinutes
    });

  } catch (error) {
    console.error('[Transfer] Transfer handler error:', error);

    // Fail-safe: fallback to main shop number
    return res.json({
      success: false,
      transferType: 'fallback',
      fallbackNumber: process.env.FALLBACK_SHOP_NUMBER,
      message: 'Transferring to main shop line'
    });
  }
}

/**
 * Check mechanic availability for transfer
 */
async function checkMechanicAvailability(shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/shops/${shopId}/staff/available`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shopId
        }
      }
    );

    if (!response.ok) {
      // Default fallback if backend unavailable
      return {
        availableNow: false,
        estimatedWaitMinutes: 5
      };
    }

    const data = await response.json();

    return {
      availableNow: data.available?.length > 0,
      mechanicPhone: data.available?.[0]?.phone,
      mechanicName: data.available?.[0]?.name,
      estimatedWaitMinutes: data.estimatedWaitMinutes || 5
    };

  } catch (error) {
    console.error('[Transfer] Availability check failed:', error);
    return {
      availableNow: false,
      estimatedWaitMinutes: 5
    };
  }
}

/**
 * Initiate direct transfer to mechanic
 */
async function initiateDirectTransfer(params) {
  const { callId, targetNumber, customerPhone, shopId } = params;

  try {
    // Create TwiML for conference bridge
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Dial the mechanic
    const dial = twiml.dial({
      timeout: TRANSFER_CONFIG.CONFERENCE_TIMEOUT_SECONDS,
      record: 'record-from-answer',
      recordingStatusCallback: `${process.env.WEBHOOK_BASE_URL}/twilio/recording-status`
    });

    dial.number(targetNumber);

    // Create conference room
    const conferenceName = `mechmind-transfer-${callId}`;
    
    // Update call with transfer instructions
    await twilioClient.calls(callId).update({
      twiml: twiml.toString()
    });

    // Log transfer
    await logTransfer({
      callId,
      type: 'direct',
      targetNumber,
      customerPhone,
      shopId,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      conferenceName,
      connected: true
    };

  } catch (error) {
    console.error('[Transfer] Direct transfer failed:', error);
    throw error;
  }
}

/**
 * Queue call for later transfer
 */
async function queueForTransfer(params) {
  const { callId, customerPhone, shopId, priority, reason, estimatedWait } = params;

  try {
    // Add to transfer queue
    const response = await fetch(`${process.env.BACKEND_API_URL}/transfer-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
        'X-Shop-ID': shopId
      },
      body: JSON.stringify({
        callId,
        customerPhone,
        shopId,
        priority,
        reason,
        estimatedWait,
        queuedAt: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to queue transfer');
    }

    const queueData = await response.json();

    // Put caller in hold with music
    const twiml = new twilio.twiml.VoiceResponse();
    
    twiml.say(
      { voice: 'alice', language: 'it-IT' },
      `Ti sto mettendo in attesa. Tempo stimato: circa ${estimatedWait} minuti. Resta in linea.`
    );
    
    twiml.play(TRANSFER_CONFIG.HOLD_MUSIC_URL);
    
    twiml.redirect(`${process.env.WEBHOOK_BASE_URL}/twilio/queue-check?callId=${callId}`);

    // Update call
    await twilioClient.calls(callId).update({
      twiml: twiml.toString()
    });

    return {
      success: true,
      position: queueData.position,
      queueId: queueData.queueId
    };

  } catch (error) {
    console.error('[Transfer] Queue failed:', error);
    throw error;
  }
}

/**
 * Check queue status and connect when mechanic available
 */
async function handleQueueCheck(req, res) {
  const { callId } = req.query;

  try {
    // Check if mechanic now available
    const queueStatus = await fetch(
      `${process.env.BACKEND_API_URL}/transfer-queue/status?callId=${callId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
        }
      }
    );

    const status = await queueStatus.json();

    const twiml = new twilio.twiml.VoiceResponse();

    if (status.mechanicAvailable) {
      // Connect to mechanic
      twiml.say(
        { voice: 'alice', language: 'it-IT' },
        'Collegamento con un operatore. Attendi.'
      );

      const dial = twiml.dial({
        timeout: TRANSFER_CONFIG.CONFERENCE_TIMEOUT_SECONDS
      });

      dial.number(status.mechanicPhone);

    } else if (status.waitTime > TRANSFER_CONFIG.FALLBACK_AFTER_SECONDS) {
      // Too long wait - fallback
      twiml.say(
        { voice: 'alice', language: 'it-IT' },
        'Tutti i nostri operatori sono occupati. Ti richiamiamo al più presto.'
      );

      // Schedule callback
      await scheduleCallback({
        callId,
        phoneNumber: status.customerPhone,
        shopId: status.shopId
      });

      twiml.hangup();

    } else {
      // Continue holding
      twiml.play(TRANSFER_CONFIG.HOLD_MUSIC_URL);
      twiml.redirect(`${process.env.WEBHOOK_BASE_URL}/twilio/queue-check?callId=${callId}`);
    }

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('[Transfer] Queue check error:', error);

    // Fail-safe: end call gracefully
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(
      { voice: 'alice', language: 'it-IT' },
      'Si è verificato un problema. Ti richiamiamo al più presto.'
    );
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  }
}

/**
 * Handle conference status callbacks
 */
async function handleConferenceStatus(req, res) {
  const { ConferenceSid, Status, CallSid } = req.body;

  console.log('[Transfer] Conference status:', {
    conferenceSid: ConferenceSid,
    status: Status,
    callSid: CallSid
  });

  // Log conference events
  await logTransfer({
    type: 'conference_status',
    conferenceSid: ConferenceSid,
    status: Status,
    callSid: CallSid,
    timestamp: new Date().toISOString()
  });

  res.sendStatus(200);
}

/**
 * Schedule a callback for failed transfers
 */
async function scheduleCallback(params) {
  const { callId, phoneNumber, shopId } = params;

  try {
    await fetch(`${process.env.BACKEND_API_URL}/callbacks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
        'X-Shop-ID': shopId
      },
      body: JSON.stringify({
        callId,
        phoneNumber,
        shopId,
        priority: 'high',
        reason: 'transfer_failed',
        scheduledAt: new Date(Date.now() + 5 * 60000).toISOString() // 5 min
      })
    });
  } catch (error) {
    console.error('[Transfer] Callback scheduling failed:', error);
  }
}

/**
 * Log transfer events
 */
async function logTransfer(logData) {
  try {
    await fetch(`${process.env.BACKEND_API_URL}/analytics/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
      },
      body: JSON.stringify(logData)
    });
  } catch (error) {
    console.error('[Transfer] Logging failed:', error);
  }
}

/**
 * Get transfer statistics for a shop
 */
async function getTransferStats(shopId, period = '24h') {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/analytics/transfers/stats?shopId=${shopId}&period=${period}`,
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
    console.error('[Transfer] Stats fetch failed:', error);
    return null;
  }
}

module.exports = {
  handleTransferWebhook,
  handleQueueCheck,
  handleConferenceStatus,
  checkMechanicAvailability,
  initiateDirectTransfer,
  queueForTransfer,
  getTransferStats,
  TRANSFER_CONFIG
};
