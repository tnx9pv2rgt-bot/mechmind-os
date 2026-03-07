/**
 * MechMind OS v10 - Twilio Call Transfer
 * 
 * Handles call transfers using Twilio:
 * - Direct transfers to mechanics
 * - Conference bridging
 * - Queue management
 * - Fallback routing
 * 
 * @module twilio/transfer
 */

const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Transfer configuration
const CONFIG = {
  FALLBACK_NUMBER: process.env.FALLBACK_SHOP_NUMBER,
  CONFERENCE_TIMEOUT: 30,
  DIAL_TIMEOUT: 20,
  RECORD_CALLS: true
};

/**
 * Transfer call to human operator
 * @param {Object} params - Transfer parameters
 * @param {string} params.shopId - Shop ID
 * @param {string} params.priority - Priority level
 * @param {string} params.reason - Transfer reason
 * @param {string} params.context - Conversation context
 */
async function transferToHuman(params) {
  const { shopId, priority, reason, context } = params;

  try {
    // Get available staff for shop
    const staff = await getAvailableStaff(shopId);

    if (staff.length === 0) {
      // No staff available - queue or fallback
      return await handleNoStaffAvailable(params);
    }

    // Select best staff member based on priority and availability
    const selectedStaff = selectStaffForTransfer(staff, priority);

    // Initiate transfer
    const transferResult = await initiateTransfer({
      targetNumber: selectedStaff.phone,
      staffName: selectedStaff.name,
      shopId,
      reason,
      context
    });

    return {
      success: true,
      transferType: 'direct',
      target: selectedStaff.name,
      estimatedWait: 0,
      ...transferResult
    };

  } catch (error) {
    console.error('[Transfer] Error:', error);
    
    // Fallback to main number
    return await fallbackTransfer(params);
  }
}

/**
 * Get available staff for shop
 */
async function getAvailableStaff(shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/shops/${shopId}/staff/available-for-transfer`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shopId
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return data.staff || [];

  } catch (error) {
    console.error('[Transfer] Failed to get staff:', error);
    return [];
  }
}

/**
 * Select best staff member for transfer
 */
function selectStaffForTransfer(staff, priority) {
  // Sort by:
  // 1. Availability (ready > busy)
  // 2. Specialization match (if context includes service type)
  // 3. Queue length (shortest first)
  // 4. Random for equal candidates

  return staff
    .sort((a, b) => {
      // Availability score
      const availScore = (s) => s.status === 'ready' ? 2 : s.status === 'wrap-up' ? 1 : 0;
      if (availScore(a) !== availScore(b)) {
        return availScore(b) - availScore(a);
      }

      // Queue length
      return (a.queueLength || 0) - (b.queueLength || 0);
    })[0];
}

/**
 * Initiate direct transfer
 */
async function initiateTransfer(params) {
  const { targetNumber, staffName, shopId, reason, context } = params;

  // Create TwiML for transfer
  const twiml = new twilio.twiml.VoiceResponse();

  // Announce transfer to caller
  twiml.say(
    { voice: 'alice', language: 'it-IT' },
    `Ti passo ${staffName}. Attendi un momento.`
  );

  // Dial target with recording
  const dial = twiml.dial({
    timeout: CONFIG.DIAL_TIMEOUT,
    record: CONFIG.RECORD_CALLS ? 'record-from-answer' : false,
    recordingStatusCallback: `${process.env.WEBHOOK_BASE_URL}/twilio/recording-status`,
    action: `${process.env.WEBHOOK_BASE_URL}/twilio/transfer-status`
  });

  dial.number(
    {
      statusCallback: `${process.env.WEBHOOK_BASE_URL}/twilio/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    },
    targetNumber
  );

  // If dial fails, redirect to fallback
  twiml.redirect(`${process.env.WEBHOOK_BASE_URL}/twilio/transfer-fallback`);

  return {
    twiml: twiml.toString(),
    targetNumber,
    staffName
  };
}

/**
 * Handle no staff available
 */
async function handleNoStaffAvailable(params) {
  const { shopId, reason } = params;

  // Check if we should queue or fallback
  const queueStatus = await getQueueStatus(shopId);

  if (queueStatus.waitTimeMinutes > 5) {
    // Too long - offer callback
    return await offerCallback(params);
  }

  // Add to queue
  return await addToTransferQueue(params);
}

/**
 * Get queue status for shop
 */
async function getQueueStatus(shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/shops/${shopId}/transfer-queue/status`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      return { waitTimeMinutes: 10, queueLength: 5 };
    }

    return await response.json();

  } catch (error) {
    return { waitTimeMinutes: 10, queueLength: 5 };
  }
}

/**
 * Add call to transfer queue
 */
async function addToTransferQueue(params) {
  const { shopId, reason, context } = params;

  try {
    const response = await fetch(`${process.env.BACKEND_API_URL}/transfer-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
      },
      body: JSON.stringify({
        shopId,
        reason,
        context,
        priority: params.priority || 'normal',
        queuedAt: new Date().toISOString()
      })
    });

    const queueData = await response.json();

    // Create TwiML for queue hold
    const twiml = new twilio.twiml.VoiceResponse();

    twiml.say(
      { voice: 'alice', language: 'it-IT' },
      `Tutti i nostri operatori sono occupati. Sei in posizione ${queueData.position} nella coda. ` +
      `Tempo stimato di attesa: circa ${queueData.estimatedWaitMinutes} minuti.`
    );

    // Play hold music
    twiml.play('https://api.mechmind-os.com/audio/hold-music.mp3');

    // Redirect to queue check
    twiml.redirect(`${process.env.WEBHOOK_BASE_URL}/twilio/queue-check`);

    return {
      success: true,
      transferType: 'queued',
      queuePosition: queueData.position,
      estimatedWait: queueData.estimatedWaitMinutes,
      twiml: twiml.toString()
    };

  } catch (error) {
    console.error('[Transfer] Queue failed:', error);
    return await fallbackTransfer(params);
  }
}

/**
 * Offer callback instead of waiting
 */
async function offerCallback(params) {
  const { shopId, context } = params;

  // Create TwiML offering callback
  const twiml = new twilio.twiml.VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    action: `${process.env.WEBHOOK_BASE_URL}/twilio/callback-confirm`,
    method: 'POST',
    timeout: 10
  });

  gather.say(
    { voice: 'alice', language: 'it-IT' },
    `Il tempo di attesa è superiore a 5 minuti. ` +
    `Premi 1 per richiedere un richiamo entro 30 minuti, ` +
    `o resta in linea per attendere.`
  );

  // If no input, continue to queue
  twiml.redirect(`${process.env.WEBHOOK_BASE_URL}/twilio/queue-check`);

  return {
    success: true,
    transferType: 'callback_offer',
    twiml: twiml.toString()
  };
}

/**
 * Fallback transfer to main number
 */
async function fallbackTransfer(params) {
  const twiml = new twilio.twiml.VoiceResponse();

  twiml.say(
    { voice: 'alice', language: 'it-IT' },
    'Ti sto trasferendo alla segreteria principale.'
  );

  const dial = twiml.dial({
    timeout: CONFIG.DIAL_TIMEOUT,
    action: `${process.env.WEBHOOK_BASE_URL}/twilio/transfer-status`
  });

  dial.number(CONFIG.FALLBACK_NUMBER);

  // If fallback fails, take voicemail
  twiml.say(
    { voice: 'alice', language: 'it-IT' },
    'Non riusciamo a rispondere al momento. Lascia un messaggio dopo il segnale.'
  );

  twiml.record({
    maxLength: 120,
    action: `${process.env.WEBHOOK_BASE_URL}/twilio/voicemail-received`
  });

  return {
    success: true,
    transferType: 'fallback',
    twiml: twiml.toString()
  };
}

/**
 * Handle transfer status callback
 */
async function handleTransferStatus(req, res) {
  const { DialCallStatus, DialCallSid, CallSid } = req.body;

  console.log('[Transfer] Status:', {
    dialStatus: DialCallStatus,
    dialSid: DialCallSid,
    callSid: CallSid
  });

  const twiml = new twilio.twiml.VoiceResponse();

  if (DialCallStatus === 'completed') {
    // Transfer successful
    twiml.hangup();
  } else if (DialCallStatus === 'busy' || DialCallStatus === 'no-answer') {
    // Target busy/unavailable - try next staff or fallback
    twiml.say(
      { voice: 'alice', language: 'it-IT' },
      'L\'operatore non è disponibile. Ti trasferisco alla segreteria.'
    );
    twiml.redirect(`${process.env.WEBHOOK_BASE_URL}/twilio/transfer-fallback`);
  } else {
    // Other failure
    twiml.say(
      { voice: 'alice', language: 'it-IT' },
      'Si è verificato un problema. Riprova più tardi.'
    );
    twiml.hangup();
  }

  res.type('text/xml');
  res.send(twiml.toString());
}

/**
 * Handle callback confirmation
 */
async function handleCallbackConfirm(req, res) {
  const { Digits, From } = req.body;

  const twiml = new twilio.twiml.VoiceResponse();

  if (Digits === '1') {
    // Schedule callback
    await scheduleCallback({
      phoneNumber: From,
      priority: 'high',
      requestedAt: new Date().toISOString()
    });

    twiml.say(
      { voice: 'alice', language: 'it-IT' },
      'Richiamata programmata. Ti contatteremo entro 30 minuti. Grazie!'
    );
  } else {
    twiml.say(
      { voice: 'alice', language: 'it-IT' },
      'Resta in linea. Ti metto in attesa.'
    );
    twiml.redirect(`${process.env.WEBHOOK_BASE_URL}/twilio/queue-check`);
    res.type('text/xml');
    res.send(twiml.toString());
    return;
  }

  twiml.hangup();
  res.type('text/xml');
  res.send(twiml.toString());
}

/**
 * Schedule a callback
 */
async function scheduleCallback(params) {
  try {
    await fetch(`${process.env.BACKEND_API_URL}/callbacks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
      },
      body: JSON.stringify(params)
    });
  } catch (error) {
    console.error('[Transfer] Callback scheduling failed:', error);
  }
}

/**
 * Create conference room for multi-party calls
 */
async function createConference(params) {
  const { conferenceName, participants } = params;

  const twiml = new twilio.twiml.VoiceResponse();

  twiml.say(
    { voice: 'alice', language: 'it-IT' },
    'Ti stiamo collegando alla conferenza.'
  );

  const dial = twiml.dial();

  dial.conference(conferenceName, {
    startConferenceOnEnter: true,
    endConferenceOnExit: false,
    record: 'record-from-start',
    recordingStatusCallback: `${process.env.WEBHOOK_BASE_URL}/twilio/recording-status`
  });

  return {
    twiml: twiml.toString(),
    conferenceName
  };
}

module.exports = {
  transferToHuman,
  initiateTransfer,
  handleNoStaffAvailable,
  addToTransferQueue,
  offerCallback,
  fallbackTransfer,
  handleTransferStatus,
  handleCallbackConfirm,
  createConference,
  CONFIG
};
