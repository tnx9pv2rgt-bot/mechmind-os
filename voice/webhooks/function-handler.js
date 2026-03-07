/**
 * MechMind OS v10 - Vapi Function Call Handler
 * 
 * Handles all function calls from Vapi AI assistant:
 * - lookup_customer_by_phone
 * - get_vehicle_history
 * - get_available_slots
 * - create_booking
 * - check_booking_status
 * - escalate_to_human
 * - send_sms_confirmation
 * 
 * @module webhooks/function-handler
 */

const { sendSMS } = require('../twilio/sms');
const { transferToHuman } = require('../twilio/transfer');

/**
 * Main function call router
 * @param {string} name - Function name
 * @param {Object} parameters - Function parameters
 * @param {Object} context - Shop/tenant context
 */
async function handleFunctionCall(name, parameters, context) {
  console.log(`[Function] Executing: ${name}`, { parameters, context });

  switch (name) {
    case 'lookup_customer_by_phone':
      return await lookupCustomerByPhone(parameters, context);
      
    case 'get_vehicle_history':
      return await getVehicleHistory(parameters, context);
      
    case 'get_available_slots':
      return await getAvailableSlots(parameters, context);
      
    case 'create_booking':
      return await createBooking(parameters, context);
      
    case 'check_booking_status':
      return await checkBookingStatus(parameters, context);
      
    case 'escalate_to_human':
      return await escalateToHuman(parameters, context);
      
    case 'send_sms_confirmation':
      return await sendSMSConfirmation(parameters, context);
      
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}

/**
 * Lookup customer by phone number
 */
async function lookupCustomerByPhone(parameters, context) {
  const { phone_number } = parameters;
  const { shopId, tenantId } = context;

  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/customers/lookup?phone=${encodeURIComponent(phone_number)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shopId,
          'X-Tenant-ID': tenantId
        }
      }
    );

    if (response.status === 404) {
      return {
        found: false,
        message: 'Nuovo cliente - richiedi registrazione',
        phone_number
      };
    }

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const customer = await response.json();

    return {
      found: true,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        gdprConsent: customer.gdprConsent,
        vehicles: customer.vehicles?.map(v => ({
          id: v.id,
          licensePlate: v.licensePlate,
          make: v.make,
          model: v.model,
          year: v.year,
          lastService: v.lastService,
          nextServiceDue: v.nextServiceDue,
          mileage: v.mileage
        })) || []
      },
      message: `Trovato cliente: ${customer.firstName} ${customer.lastName}`
    };

  } catch (error) {
    console.error('[Function] lookup_customer_by_phone error:', error);
    throw error;
  }
}

/**
 * Get vehicle service history
 */
async function getVehicleHistory(parameters, context) {
  const { customer_id, license_plate } = parameters;
  const { shopId, tenantId } = context;

  try {
    let url = `${process.env.BACKEND_API_URL}/customers/${customer_id}/vehicles`;
    if (license_plate) {
      url += `?licensePlate=${encodeURIComponent(license_plate)}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
        'X-Shop-ID': shopId,
        'X-Tenant-ID': tenantId
      }
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    return {
      found: true,
      vehicles: data.vehicles?.map(v => ({
        id: v.id,
        licensePlate: v.licensePlate,
        make: v.make,
        model: v.model,
        year: v.year,
        mileage: v.mileage,
        lastService: {
          date: v.lastService?.date,
          type: v.lastService?.type,
          mileage: v.lastService?.mileage,
          notes: v.lastService?.notes
        },
        nextServiceDue: v.nextServiceDue,
        serviceHistory: v.serviceHistory?.slice(0, 3).map(h => ({
          date: h.date,
          type: h.type,
          description: h.description,
          cost: h.cost
        })) || []
      })) || [],
      message: `Trovati ${data.vehicles?.length || 0} veicoli`
    };

  } catch (error) {
    console.error('[Function] get_vehicle_history error:', error);
    throw error;
  }
}

/**
 * Get available booking slots
 */
async function getAvailableSlots(parameters, context) {
  const { shop_id, service_type, days_ahead = 14, urgency = 'medium' } = parameters;
  const { tenantId } = context;

  try {
    // Determine slot duration based on service type
    const durationMap = {
      'revisione': 60,
      'tagliando': 90,
      'riparazione': 120,
      'emergenza': 30,
      'gomme': 45,
      'elettronica': 60
    };
    
    const duration = durationMap[service_type.toLowerCase()] || 60;

    // For emergency/urgent requests, look for slots within 24-48 hours
    const actualDaysAhead = urgency === 'emergency' ? 2 : urgency === 'high' ? 3 : days_ahead;

    const response = await fetch(
      `${process.env.BACKEND_API_URL}/shops/${shop_id}/slots/available?` +
      `daysAhead=${actualDaysAhead}&duration=${duration}&serviceType=${encodeURIComponent(service_type)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shop_id,
          'X-Tenant-ID': tenantId
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    // Format slots for natural language
    const formattedSlots = data.slots?.slice(0, 5).map(slot => ({
      date: slot.date,
      time: slot.time,
      duration: slot.duration,
      formatted: formatSlotForItalian(slot)
    })) || [];

    return {
      found: formattedSlots.length > 0,
      slots: formattedSlots,
      serviceType: service_type,
      duration,
      urgency,
      message: formattedSlots.length > 0
        ? `Trovati ${formattedSlots.length} slot disponibili`
        : urgency === 'emergency'
          ? 'Nessuno slot immediato disponibile, suggerisco lista d\'attesa'
          : 'Nessuno slot disponibile nel periodo richiesto'
    };

  } catch (error) {
    console.error('[Function] get_available_slots error:', error);
    throw error;
  }
}

/**
 * Create a new booking
 */
async function createBooking(parameters, context) {
  const {
    customer_id,
    shop_id,
    vehicle_id,
    service_type,
    scheduled_at,
    duration_minutes = 60,
    notes = '',
    urgency = 'medium'
  } = parameters;
  const { tenantId } = context;

  try {
    const bookingData = {
      customerId: customer_id,
      shopId: shop_id,
      vehicleId: vehicle_id,
      serviceType: service_type,
      scheduledAt: scheduled_at,
      durationMinutes: duration_minutes,
      notes,
      urgency,
      source: 'voice-ai',
      createdAt: new Date().toISOString()
    };

    const response = await fetch(`${process.env.BACKEND_API_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
        'X-Shop-ID': shop_id,
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify(bookingData)
    });

    if (response.status === 409) {
      // Slot no longer available
      return {
        success: false,
        error: 'slot_unavailable',
        message: 'Lo slot selezionato non è più disponibile',
        suggestion: 'Chiedi al cliente di scegliere un altro orario'
      };
    }

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const booking = await response.json();

    // Send SMS confirmation asynchronously
    sendSMSConfirmation({
      phone_number: booking.customerPhone,
      booking_id: booking.id,
      message_type: 'confirmation'
    }, context).catch(err => console.error('SMS send failed:', err));

    return {
      success: true,
      booking: {
        id: booking.id,
        scheduledAt: booking.scheduledAt,
        serviceType: booking.serviceType,
        confirmationCode: booking.confirmationCode
      },
      message: `Prenotazione confermata per ${formatDateTimeItalian(booking.scheduledAt)}`,
      smsSent: true
    };

  } catch (error) {
    console.error('[Function] create_booking error:', error);
    throw error;
  }
}

/**
 * Check booking/work status
 */
async function checkBookingStatus(parameters, context) {
  const { customer_id, license_plate } = parameters;
  const { shopId, tenantId } = context;

  try {
    let url = `${process.env.BACKEND_API_URL}/customers/${customer_id}/bookings/active`;
    if (license_plate) {
      url += `?licensePlate=${encodeURIComponent(license_plate)}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
        'X-Shop-ID': shopId,
        'X-Tenant-ID': tenantId
      }
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.bookings || data.bookings.length === 0) {
      return {
        found: false,
        message: 'Nessuna lavorazione attiva trovata',
        suggestion: 'Verifica se ha prenotazioni future'
      };
    }

    const booking = data.bookings[0]; // Most recent

    const statusMap = {
      'pending': 'in attesa',
      'confirmed': 'confermata',
      'in_progress': 'in corso',
      'waiting_parts': 'in attesa ricambi',
      'quality_check': 'controllo qualità',
      'ready': 'pronta per il ritiro',
      'completed': 'completata',
      'cancelled': 'cancellata'
    };

    return {
      found: true,
      booking: {
        id: booking.id,
        vehicle: `${booking.vehicleMake} ${booking.vehicleModel} (${booking.licensePlate})`,
        status: booking.status,
        statusText: statusMap[booking.status] || booking.status,
        scheduledAt: booking.scheduledAt,
        estimatedCompletion: booking.estimatedCompletion,
        workDescription: booking.workDescription,
        progress: booking.progress || 0
      },
      message: formatStatusMessage(booking, statusMap)
    };

  } catch (error) {
    console.error('[Function] check_booking_status error:', error);
    throw error;
  }
}

/**
 * Escalate to human operator
 */
async function escalateToHuman(parameters, context) {
  const { reason, priority = 'normal', context: escalationContext } = parameters;
  const { shopId, tenantId } = context;

  try {
    // Log escalation
    await fetch(`${process.env.BACKEND_API_URL}/escalations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
        'X-Shop-ID': shopId,
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify({
        reason,
        priority,
        context: escalationContext,
        shopId,
        createdAt: new Date().toISOString()
      })
    });

    // Initiate transfer via Twilio
    const transferResult = await transferToHuman({
      shopId,
      priority,
      reason,
      context: escalationContext
    });

    return {
      success: true,
      escalated: true,
      transferInitiated: transferResult.success,
      message: 'Ti passo subito a un collega umano. Attendi un momento.',
      estimatedWait: transferResult.estimatedWait || 'pochi minuti'
    };

  } catch (error) {
    console.error('[Function] escalate_to_human error:', error);
    
    // Return graceful error - don't fail the call
    return {
      success: false,
      escalated: false,
      message: 'Ti passo a un collega. Un momento per favore.',
      manualTransfer: true
    };
  }
}

/**
 * Send SMS confirmation
 */
async function sendSMSConfirmation(parameters, context) {
  const { phone_number, booking_id, message_type = 'confirmation' } = parameters;
  const { shopId, tenantId } = context;

  try {
    // Get booking details
    const bookingResponse = await fetch(
      `${process.env.BACKEND_API_URL}/bookings/${booking_id}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shopId,
          'X-Tenant-ID': tenantId
        }
      }
    );

    if (!bookingResponse.ok) {
      throw new Error(`Booking not found: ${booking_id}`);
    }

    const booking = await bookingResponse.json();

    // Compose message based on type
    const messages = {
      confirmation: `Conferma prenotazione ${booking.confirmationCode}: ${booking.serviceType} il ${formatDateShortItalian(booking.scheduledAt)} alle ${formatTimeItalian(booking.scheduledAt)}. Indirizzo: ${booking.shopAddress}. Per modifiche chiama ${booking.shopPhone}`,
      reminder: `Promemoria: domani alle ${formatTimeItalian(booking.scheduledAt)} hai ${booking.serviceType} in officina. Conferma prenotazione ${booking.confirmationCode}.`,
      cancellation: `Prenotazione ${booking.confirmationCode} cancellata. Per riprogrammare chiama ${booking.shopPhone}.`,
      ready: `La tua ${booking.vehicleMake} ${booking.vehicleModel} (${booking.licensePlate}) è pronta per il ritiro. Orari: ${booking.shopHours}. Grazie!`
    };

    const message = messages[message_type] || messages.confirmation;

    // Send via Twilio
    const smsResult = await sendSMS({
      to: phone_number,
      body: message,
      shopId,
      tenantId
    });

    return {
      success: smsResult.success,
      messageId: smsResult.messageId,
      message: 'SMS inviato con successo'
    };

  } catch (error) {
    console.error('[Function] send_sms_confirmation error:', error);
    throw error;
  }
}

// Helper functions

function formatSlotForItalian(slot) {
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const date = new Date(slot.date);
  const dayName = days[date.getDay()];
  return `${dayName} ${slot.time}`;
}

function formatDateTimeItalian(isoString) {
  const date = new Date(isoString);
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const months = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 
                  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} alle ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDateShortItalian(isoString) {
  const date = new Date(isoString);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function formatTimeItalian(isoString) {
  const date = new Date(isoString);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatStatusMessage(booking, statusMap) {
  const statusText = statusMap[booking.status] || booking.status;
  
  if (booking.status === 'in_progress') {
    return `La tua ${booking.vehicleMake} è in officina. Lavorazione ${statusText}, completamento previsto attorno alle ${formatTimeItalian(booking.estimatedCompletion)}.`;
  } else if (booking.status === 'ready') {
    return `Buone notizie! La tua ${booking.vehicleMake} è pronta per il ritiro.`;
  } else if (booking.status === 'waiting_parts') {
    return `La tua ${booking.vehicleMake} è in attesa di ricambi. Ti contattiamo appena arrivano.`;
  }
  
  return `Stato lavorazione: ${statusText}`;
}

module.exports = {
  handleFunctionCall,
  lookupCustomerByPhone,
  getVehicleHistory,
  getAvailableSlots,
  createBooking,
  checkBookingStatus,
  escalateToHuman,
  sendSMSConfirmation
};
