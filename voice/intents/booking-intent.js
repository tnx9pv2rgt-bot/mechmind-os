/**
 * MechMind OS v10 - Booking Intent Handler
 * 
 * Handles booking-related intents:
 * - New booking requests
 * - Booking modifications
 * - Booking cancellations
 * - Slot availability inquiries
 * 
 * @module intents/booking-intent
 */

const { 
  lookupCustomerByPhone,
  getVehicleHistory,
  getAvailableSlots,
  createBooking 
} = require('../tools/customer-lookup');

// Intent patterns for Italian
const BOOKING_PATTERNS = {
  new_booking: [
    /(?:prenot|vorrei|voglio|devo|ho bisogno).{0,30}(?:prenot|appunt|visita|controllo)/i,
    /(?:revisione|tagliando|cambio|riparazione|gomme)/i,
    /(?:quando|quanto).{0,20}(?:libero|disponibile|posto)/i
  ],
  
  modify_booking: [
    /(?:spost|modific|cambi).{0,30}(?:prenot|appunt)/i,
    /(?:non posso|non riesco).{0,20}(?:venire|presentarmi)/i,
    /(?:altro|diverso).{0,10}(?:giorno|orario|ora)/i
  ],
  
  cancel_booking: [
    /(?:cancell|annull|elimin).{0,30}(?:prenot|appunt)/i,
    /(?:non serve più|non ho più bisogno)/i
  ],
  
  check_availability: [
    /(?:quando|quali).{0,20}(?:libero|disponibile|orari)/i,
    /(?:avete|ci sono).{0,20}(?:posto|slot)/i
  ]
};

/**
 * Detect booking intent from transcript
 * @param {string} transcript - Call transcript
 * @returns {Object} Intent detection result
 */
function detectBookingIntent(transcript) {
  for (const [intentType, patterns] of Object.entries(BOOKING_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(transcript)) {
        return {
          detected: true,
          type: intentType,
          confidence: calculateConfidence(transcript, pattern),
          matchedPattern: pattern.source
        };
      }
    }
  }

  return {
    detected: false,
    type: null,
    confidence: 0
  };
}

/**
 * Handle booking intent
 * @param {Object} params - Handler parameters
 * @param {string} params.transcript - Call transcript
 * @param {string} params.phoneNumber - Caller phone number
 * @param {string} params.shopId - Shop ID
 * @param {Object} params.context - Conversation context
 */
async function handleBookingIntent(params) {
  const { transcript, phoneNumber, shopId, context } = params;

  // Detect specific booking intent type
  const intent = detectBookingIntent(transcript);

  console.log('[BookingIntent] Detected:', intent);

  switch (intent.type) {
    case 'new_booking':
      return await handleNewBooking(params);
      
    case 'modify_booking':
      return await handleModifyBooking(params);
      
    case 'cancel_booking':
      return await handleCancelBooking(params);
      
    case 'check_availability':
      return await handleCheckAvailability(params);
      
    default:
      return {
        handled: false,
        reason: 'unknown_intent',
        message: 'Non ho capito bene. Puoi ripetere?'
      };
  }
}

/**
 * Handle new booking request
 */
async function handleNewBooking(params) {
  const { phoneNumber, shopId, context } = params;

  // Step 1: Identify customer
  const customer = await lookupCustomerByPhone(phoneNumber, shopId);
  
  if (!customer.found) {
    return {
      handled: true,
      step: 'customer_identification',
      newCustomer: true,
      message: 'Non ti trovo in sistema. Per procedere con la prenotazione, ho bisogno di alcuni dati. Come ti chiami?',
      requiresData: ['firstName', 'lastName', 'email']
    };
  }

  // Step 2: Extract vehicle information
  let vehicle = null;
  
  if (customer.vehicles.length === 1) {
    // Single vehicle - use it
    vehicle = customer.vehicles[0];
  } else if (customer.vehicles.length > 1) {
    // Multiple vehicles - need to identify which one
    return {
      handled: true,
      step: 'vehicle_selection',
      customer: customer.customer,
      vehicles: customer.vehicles,
      message: `Ho trovato ${customer.vehicles.length} veicoli associati. Per quale macchina è la prenotazione?`,
      requiresSelection: true
    };
  } else {
    // No vehicles - need to register one
    return {
      handled: true,
      step: 'vehicle_registration',
      customer: customer.customer,
      message: 'Non ho veicoli registrati a tuo nome. Mi dai targa, marca e modello?',
      requiresData: ['licensePlate', 'make', 'model', 'year']
    };
  }

  // Step 3: Extract service type from context or ask
  const serviceType = extractServiceType(params.transcript);
  
  if (!serviceType) {
    return {
      handled: true,
      step: 'service_type_selection',
      customer: customer.customer,
      vehicle,
      message: `Perfetto, ho la tua ${vehicle.make} ${vehicle.model}. Che tipo di lavoro ti serve?`,
      options: ['Revisione', 'Tagliando', 'Riparazione', 'Gomme', 'Elettronica', 'Emergenza']
    };
  }

  // Step 4: Check urgency
  const urgency = extractUrgency(params.transcript);

  // Step 5: Get available slots
  const slots = await getAvailableSlots({
    shopId,
    serviceType,
    urgency,
    daysAhead: urgency === 'emergency' ? 2 : 14
  });

  if (!slots.found) {
    return {
      handled: true,
      step: 'no_slots_available',
      customer: customer.customer,
      vehicle,
      serviceType,
      urgency,
      message: urgency === 'emergency' 
        ? 'Non ho slot immediati disponibili. Ti metto in lista d\'attesa per emergenze e ti richiamo entro 30 minuti.'
        : 'Non ho slot disponibili nelle prossime due settimane. Posso metterti in lista d\'attesa?',
      offerWaitlist: true
    };
  }

  // Return slots for selection
  return {
    handled: true,
    step: 'slot_selection',
    customer: customer.customer,
    vehicle,
    serviceType,
    urgency,
    slots: slots.slots,
    message: formatSlotsMessage(slots.slots, serviceType),
    requiresSelection: true
  };
}

/**
 * Handle booking modification
 */
async function handleModifyBooking(params) {
  const { phoneNumber, shopId } = params;

  // Get active bookings for customer
  const bookings = await getActiveBookings(phoneNumber, shopId);

  if (!bookings || bookings.length === 0) {
    return {
      handled: true,
      step: 'no_active_bookings',
      message: 'Non ho trovato prenotazioni attive da modificare. Vuoi fare una nuova prenotazione?'
    };
  }

  if (bookings.length === 1) {
    // Single booking - proceed with modification
    return {
      handled: true,
      step: 'modify_single_booking',
      booking: bookings[0],
      message: `Ho trovato la tua prenotazione per ${bookings[0].serviceType} il ${formatDateItalian(bookings[0].scheduledAt)}. ` +
               `Che cambiamento vuoi fare?`,
      options: ['Spostare data', 'Cambiare orario', 'Cambiare servizio', 'Cancellare']
    };
  }

  // Multiple bookings - ask which one
  return {
    handled: true,
    step: 'select_booking_to_modify',
    bookings,
    message: `Ho trovato ${bookings.length} prenotazioni attive. Quale vuoi modificare?`,
    requiresSelection: true
  };
}

/**
 * Handle booking cancellation
 */
async function handleCancelBooking(params) {
  const { phoneNumber, shopId, transcript } = params;

  // Get active bookings
  const bookings = await getActiveBookings(phoneNumber, shopId);

  if (!bookings || bookings.length === 0) {
    return {
      handled: true,
      step: 'no_bookings_to_cancel',
      message: 'Non ho trovato prenotazioni attive da cancellare.'
    };
  }

  // Check if cancellation is confirmed
  const confirmed = extractConfirmation(transcript);

  if (!confirmed) {
    return {
      handled: true,
      step: 'confirm_cancellation',
      bookings,
      message: bookings.length === 1
        ? `Vuoi cancellare la prenotazione per ${bookings[0].serviceType} del ${formatDateItalian(bookings[0].scheduledAt)}?`
        : `Quale prenotazione vuoi cancellare?`,
      requiresConfirmation: true
    };
  }

  // Perform cancellation
  const bookingToCancel = bookings[0]; // Or selected one
  const cancelResult = await cancelBooking(bookingToCancel.id, shopId);

  if (cancelResult.success) {
    // Send cancellation SMS
    await sendCancellationSMS(bookingToCancel);

    return {
      handled: true,
      step: 'booking_cancelled',
      cancelledBooking: bookingToCancel,
      message: `Prenotazione cancellata con successo. Ti ho inviato un SMS di conferma.`,
      smsSent: true
    };
  }

  return {
    handled: true,
    step: 'cancellation_failed',
    error: cancelResult.error,
    message: 'Non sono riuscito a cancellare la prenotazione. Ti passo a un collega.'
  };
}

/**
 * Handle availability check
 */
async function handleCheckAvailability(params) {
  const { shopId, transcript } = params;

  // Extract service type if mentioned
  const serviceType = extractServiceType(transcript) || 'generico';
  
  // Extract date preference if mentioned
  const datePreference = extractDatePreference(transcript);

  const slots = await getAvailableSlots({
    shopId,
    serviceType,
    daysAhead: 14,
    preferredDate: datePreference
  });

  if (!slots.found) {
    return {
      handled: true,
      step: 'no_availability',
      serviceType,
      message: 'Mi dispiace, non ho disponibilità nelle prossime due settimane. Posso metterti in lista d\'attesa?'
    };
  }

  return {
    handled: true,
    step: 'availability_shown',
    serviceType,
    slots: slots.slots,
    message: formatSlotsMessage(slots.slots, serviceType)
  };
}

/**
 * Extract service type from transcript
 */
function extractServiceType(transcript) {
  const patterns = {
    'revisione': /revisione/i,
    'tagliando': /tagliando/i,
    'riparazione': /riparazione|guasto|rotto|non funziona/i,
    'gomme': /gomm|pneumatic|ruote/i,
    'elettronica': /elettronic|batteria|sensor|spia/i,
    'carrozzeria': /carrozzeri|ammacc|graffi|vernice/i,
    'emergenza': /emergenza|urgente|subito|immediat|fumo|perdita/i
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(transcript)) {
      return type;
    }
  }

  return null;
}

/**
 * Extract urgency level from transcript
 */
function extractUrgency(transcript) {
  const emergencyPatterns = /emergenza|urgente|subito|immediat|fumo|perdita|non parte|incident/i;
  const highPatterns = /al più presto|domani|questa settimana|importante/i;
  const lowPatterns = /quando volete|non urgente|prossime settimane/i;

  if (emergencyPatterns.test(transcript)) return 'emergency';
  if (highPatterns.test(transcript)) return 'high';
  if (lowPatterns.test(transcript)) return 'low';
  
  return 'medium';
}

/**
 * Extract confirmation from transcript
 */
function extractConfirmation(transcript) {
  const confirmPatterns = /^(si|sì|yes|ok|confermo|procedi|cancella|annulla)$/i;
  return confirmPatterns.test(transcript.trim());
}

/**
 * Extract date preference from transcript
 */
function extractDatePreference(transcript) {
  const patterns = {
    'today': /oggi/i,
    'tomorrow': /domani/i,
    'this_week': /questa settimana/i,
    'next_week': /settimana prossima/i,
    'weekend': /weekend|sabato|domenica/i
  };

  for (const [preference, pattern] of Object.entries(patterns)) {
    if (pattern.test(transcript)) {
      return preference;
    }
  }

  return null;
}

/**
 * Calculate intent confidence
 */
function calculateConfidence(transcript, pattern) {
  // Simple confidence based on match quality
  const match = transcript.match(pattern);
  if (!match) return 0;
  
  // Higher confidence for longer matches closer to start
  const position = match.index / transcript.length;
  const length = match[0].length / transcript.length;
  
  return Math.min(0.95, 0.5 + (1 - position) * 0.3 + length * 0.2);
}

/**
 * Format slots message for natural response
 */
function formatSlotsMessage(slots, serviceType) {
  if (slots.length === 0) {
    return 'Non ho slot disponibili al momento.';
  }

  const slotTexts = slots.slice(0, 3).map(s => s.formatted);
  
  return `Ho questi slot disponibili per ${serviceType}: ${slotTexts.join(', ')}. Quale preferisci?`;
}

/**
 * Get active bookings for customer
 */
async function getActiveBookings(phoneNumber, shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/bookings/active?phone=${encodeURIComponent(phoneNumber)}&shopId=${shopId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
        }
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.bookings || [];

  } catch (error) {
    console.error('[BookingIntent] Failed to get active bookings:', error);
    return [];
  }
}

/**
 * Cancel a booking
 */
async function cancelBooking(bookingId, shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/bookings/${bookingId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shopId
        },
        body: JSON.stringify({
          cancelledAt: new Date().toISOString(),
          source: 'voice-ai'
        })
      }
    );

    return {
      success: response.ok,
      error: response.ok ? null : await response.text()
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send cancellation SMS
 */
async function sendCancellationSMS(booking) {
  // Implementation in twilio/sms.js
  console.log('[BookingIntent] Sending cancellation SMS for booking:', booking.id);
}

// Helper functions

function formatDateItalian(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

module.exports = {
  detectBookingIntent,
  handleBookingIntent,
  handleNewBooking,
  handleModifyBooking,
  handleCancelBooking,
  handleCheckAvailability,
  extractServiceType,
  extractUrgency,
  BOOKING_PATTERNS
};
