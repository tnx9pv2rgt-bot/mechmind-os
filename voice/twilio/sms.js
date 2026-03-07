/**
 * MechMind OS v10 - Twilio SMS Integration
 * 
 * Handles SMS sending for:
 * - Booking confirmations
 * - Appointment reminders
 * - Work completion notifications
 * - Call drop recaps
 * - Marketing (opt-in only)
 * 
 * @module twilio/sms
 */

const twilio = require('twilio');

// Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// SMS configuration
const SMS_CONFIG = {
  FROM_NUMBER: process.env.TWILIO_SMS_NUMBER,
  MAX_LENGTH: 1600, // Twilio max
  DEFAULT_COUNTRY: 'IT',
  RATE_LIMIT_PER_MINUTE: 30
};

// Message templates in Italian
const MESSAGE_TEMPLATES = {
  booking_confirmation: (data) => 
    `Conferma prenotazione ${data.confirmationCode}: ${data.serviceType} il ${data.date} alle ${data.time}. ` +
    `Indirizzo: ${data.shopAddress}. Per modifiche chiama ${data.shopPhone}`,
  
  booking_reminder: (data) =>
    `Promemoria: domani alle ${data.time} hai ${data.serviceType} in officina. ` +
    `Conferma: ${data.confirmationCode}. Ci vediamo presto!`,
  
  work_started: (data) =>
    `Abbiamo iniziato la lavorazione sulla tua ${data.vehicle}. ` +
    `Ti aggiorniamo sui progressi. Grazie per la fiducia!`,
  
  work_ready: (data) =>
    `Buone notizie! La tua ${data.vehicle} è pronta per il ritiro. ` +
    `Orari: ${data.shopHours}. A presto!`,
  
  work_completed: (data) =>
    `Lavorazione completata su ${data.vehicle}. ` +
    `Fattura disponibile nell'area clienti. Grazie!`,
  
  call_drop_recap: (data) =>
    `Grazie per aver chiamato ${data.shopName}. ` +
    `Ti richiamiamo al più presto per assisterti.`,
  
  callback_scheduled: (data) =>
    `Ti richiameremo entro ${data.timeframe} per ${data.reason}. ` +
    `Grazie per la pazienza!`,
  
  gdpr_consent_request: (data) =>
    `${data.shopName}: Per inviarti promemoria e offerte, abbiamo bisogno del tuo consenso. ` +
    `Rispondi SI per accettare o NO per rifiutare.`,
  
  gdpr_data_deleted: (data) =>
    `Come richiesto, abbiamo cancellato tutti i tuoi dati personali. ` +
    `Arrivederci e grazie.`,
  
  emergency_slot_available: (data) =>
    `Slot emergenza disponibile: ${data.date} alle ${data.time}. ` +
    `Conferma rispondendo SI entro 10 minuti.`
};

/**
 * Send SMS message
 * @param {Object} params - SMS parameters
 * @param {string} params.to - Recipient phone number
 * @param {string} params.body - Message body
 * @param {string} params.shopId - Shop ID for tracking
 * @param {string} params.tenantId - Tenant ID
 * @param {string} params.template - Optional template name
 * @param {Object} params.templateData - Data for template
 */
async function sendSMS(params) {
  const { to, body, shopId, tenantId, template, templateData } = params;

  try {
    // Validate phone number
    const validatedNumber = validatePhoneNumber(to);
    if (!validatedNumber) {
      throw new Error(`Invalid phone number: ${to}`);
    }

    // Use template if specified
    let messageBody = body;
    if (template && MESSAGE_TEMPLATES[template]) {
      messageBody = MESSAGE_TEMPLATES[template](templateData);
    }

    // Truncate if too long
    if (messageBody.length > SMS_CONFIG.MAX_LENGTH) {
      messageBody = messageBody.substring(0, SMS_CONFIG.MAX_LENGTH - 3) + '...';
    }

    // Check rate limiting
    const canSend = await checkRateLimit(shopId);
    if (!canSend) {
      throw new Error('Rate limit exceeded for shop');
    }

    // Send SMS via Twilio
    const message = await client.messages.create({
      body: messageBody,
      from: SMS_CONFIG.FROM_NUMBER,
      to: validatedNumber,
      statusCallback: `${process.env.WEBHOOK_BASE_URL}/twilio/sms-status`
    });

    // Log SMS
    await logSMS({
      messageId: message.sid,
      to: validatedNumber,
      body: messageBody,
      shopId,
      tenantId,
      template,
      status: 'sent',
      sentAt: new Date().toISOString()
    });

    console.log('[SMS] Sent:', {
      messageId: message.sid,
      to: validatedNumber,
      shopId
    });

    return {
      success: true,
      messageId: message.sid,
      status: message.status
    };

  } catch (error) {
    console.error('[SMS] Send failed:', error);

    // Log failure
    await logSMS({
      to,
      body: messageBody || body,
      shopId,
      tenantId,
      template,
      status: 'failed',
      error: error.message,
      sentAt: new Date().toISOString()
    });

    throw error;
  }
}

/**
 * Send booking confirmation SMS
 */
async function sendBookingConfirmation(booking, shop) {
  const templateData = {
    confirmationCode: booking.confirmationCode,
    serviceType: booking.serviceType,
    date: formatDateItalian(booking.scheduledAt),
    time: formatTimeItalian(booking.scheduledAt),
    shopAddress: shop.address,
    shopPhone: shop.phone
  };

  return await sendSMS({
    to: booking.customerPhone,
    shopId: shop.id,
    tenantId: shop.tenantId,
    template: 'booking_confirmation',
    templateData
  });
}

/**
 * Send booking reminder (day before)
 */
async function sendBookingReminder(booking, shop) {
  const templateData = {
    confirmationCode: booking.confirmationCode,
    serviceType: booking.serviceType,
    time: formatTimeItalian(booking.scheduledAt)
  };

  return await sendSMS({
    to: booking.customerPhone,
    shopId: shop.id,
    tenantId: shop.tenantId,
    template: 'booking_reminder',
    templateData
  });
}

/**
 * Send work ready notification
 */
async function sendWorkReadyNotification(booking, shop) {
  const templateData = {
    vehicle: `${booking.vehicleMake} ${booking.vehicleModel}`,
    shopHours: shop.openingHours
  };

  return await sendSMS({
    to: booking.customerPhone,
    shopId: shop.id,
    tenantId: shop.tenantId,
    template: 'work_ready',
    templateData
  });
}

/**
 * Send call drop recap SMS
 */
async function sendCallDropRecap(phoneNumber, shop) {
  const templateData = {
    shopName: shop.name
  };

  return await sendSMS({
    to: phoneNumber,
    shopId: shop.id,
    tenantId: shop.tenantId,
    template: 'call_drop_recap',
    templateData
  });
}

/**
 * Handle incoming SMS (replies from customers)
 */
async function handleIncomingSMS(req, res) {
  const { From, Body, MessageSid } = req.body;

  console.log('[SMS] Incoming:', {
    from: From,
    body: Body,
    messageId: MessageSid
  });

  try {
    // Parse intent from message
    const intent = parseSMSIntent(Body);

    switch (intent.type) {
      case 'gdpr_consent':
        await handleGDPRConsent(From, intent.value);
        break;
        
      case 'booking_confirm':
        await handleBookingConfirm(From, intent);
        break;
        
      case 'booking_cancel':
        await handleBookingCancel(From, intent);
        break;
        
      case 'callback_request':
        await handleCallbackRequest(From);
        break;
        
      default:
        // Forward to shop for manual handling
        await forwardToShop(From, Body);
    }

    res.sendStatus(200);

  } catch (error) {
    console.error('[SMS] Incoming handler error:', error);
    res.sendStatus(500);
  }
}

/**
 * Parse SMS intent
 */
function parseSMSIntent(message) {
  const text = message.toLowerCase().trim();

  // GDPR consent
  if (/^(si|sì|yes|ok|accetto)$/i.test(text)) {
    return { type: 'gdpr_consent', value: true };
  }
  if (/^(no|non|rifiuto)$/i.test(text)) {
    return { type: 'gdpr_consent', value: false };
  }

  // Booking confirmation
  if (/^(confermo|ok|si|sì)$/i.test(text)) {
    return { type: 'booking_confirm', value: true };
  }

  // Booking cancellation
  if (/^(cancella|annulla|no)$/i.test(text)) {
    return { type: 'booking_cancel', value: true };
  }

  // Callback request
  if (/(richiam|chiam|telefon)/i.test(text)) {
    return { type: 'callback_request' };
  }

  return { type: 'unknown', text };
}

/**
 * Handle GDPR consent response
 */
async function handleGDPRConsent(phoneNumber, consent) {
  try {
    await fetch(`${process.env.BACKEND_API_URL}/customers/gdpr-consent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
      },
      body: JSON.stringify({
        phoneNumber,
        consent,
        consentDate: new Date().toISOString(),
        source: 'sms'
      })
    });

    // Send acknowledgment
    const responseMessage = consent
      ? 'Grazie! Da ora riceverai promemoria e offerte esclusive.'
      : 'OK, riceverai solo comunicazioni necessarie per i servizi.';

    await sendSMS({
      to: phoneNumber,
      body: responseMessage,
      shopId: 'system',
      tenantId: 'system'
    });

  } catch (error) {
    console.error('[SMS] GDPR consent handling failed:', error);
  }
}

/**
 * Handle SMS status callbacks
 */
async function handleSMSStatus(req, res) {
  const { MessageSid, MessageStatus, ErrorCode } = req.body;

  console.log('[SMS] Status update:', {
    messageId: MessageSid,
    status: MessageStatus,
    errorCode: ErrorCode
  });

  // Update message status in database
  try {
    await fetch(`${process.env.BACKEND_API_URL}/sms/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
      },
      body: JSON.stringify({
        messageId: MessageSid,
        status: MessageStatus,
        errorCode,
        updatedAt: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('[SMS] Status update failed:', error);
  }

  res.sendStatus(200);
}

/**
 * Validate and format phone number
 */
function validatePhoneNumber(number) {
  // Remove non-numeric characters
  let cleaned = number.replace(/\D/g, '');

  // Add Italy country code if missing
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    cleaned = '39' + cleaned;
  }

  // Validate length
  if (cleaned.length < 10 || cleaned.length > 15) {
    return null;
  }

  return '+' + cleaned;
}

/**
 * Check rate limit for shop
 */
async function checkRateLimit(shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/sms/rate-check?shopId=${shopId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
        }
      }
    );

    if (!response.ok) return true; // Allow if backend unavailable

    const data = await response.json();
    return data.allowed;

  } catch (error) {
    console.error('[SMS] Rate check failed:', error);
    return true; // Allow on error
  }
}

/**
 * Log SMS to backend
 */
async function logSMS(logData) {
  try {
    await fetch(`${process.env.BACKEND_API_URL}/analytics/sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
      },
      body: JSON.stringify(logData)
    });
  } catch (error) {
    console.error('[SMS] Logging failed:', error);
  }
}

// Helper functions

function formatDateItalian(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long'
  });
}

function formatTimeItalian(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

module.exports = {
  sendSMS,
  sendBookingConfirmation,
  sendBookingReminder,
  sendWorkReadyNotification,
  sendCallDropRecap,
  handleIncomingSMS,
  handleSMSStatus,
  MESSAGE_TEMPLATES,
  SMS_CONFIG
};
