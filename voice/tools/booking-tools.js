/**
 * MechMind OS v10 - Booking Tools
 * 
 * Booking creation and management:
 * - Create new bookings
 * - Update existing bookings
 * - Cancel bookings
 * - Booking confirmation
 * 
 * @module tools/booking-tools
 */

const { sendSMS } = require('../twilio/sms');
const { calculateServiceDuration, detectServiceType } = require('./slot-query');

// Booking configuration
const BOOKING_CONFIG = {
  CONFIRMATION_CODE_LENGTH: 6,
  REMINDER_HOURS_BEFORE: 24,
  MAX_RESCHEDULE_ATTEMPTS: 3,
  CANCELLATION_DEADLINE_HOURS: 2
};

/**
 * Create a new booking
 * @param {Object} params - Booking parameters
 */
async function createBooking(params) {
  const {
    customerId,
    shopId,
    vehicleId,
    serviceType,
    scheduledAt,
    durationMinutes,
    notes = '',
    urgency = 'medium',
    source = 'voice-ai',
    phoneNumber
  } = params;

  try {
    // Generate confirmation code
    const confirmationCode = generateConfirmationCode();

    // Prepare booking data
    const bookingData = {
      customerId,
      shopId,
      vehicleId,
      serviceType,
      scheduledAt,
      durationMinutes: durationMinutes || calculateServiceDuration(serviceType, params.vehicle),
      notes,
      urgency,
      source,
      confirmationCode,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      reminders: {
        sms24h: false,
        sms2h: false
      }
    };

    // Send to backend
    const response = await fetch(`${process.env.BACKEND_API_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
        'X-Shop-ID': shopId
      },
      body: JSON.stringify(bookingData)
    });

    // Handle conflicts
    if (response.status === 409) {
      const conflict = await response.json();
      return {
        success: false,
        error: 'slot_conflict',
        conflictDetails: conflict,
        message: 'Lo slot selezionato non è più disponibile',
        alternatives: conflict.alternatives || []
      };
    }

    if (!response.ok) {
      throw new Error(`Booking creation failed: ${response.status}`);
    }

    const booking = await response.json();

    // Send confirmation SMS
    const smsResult = await sendBookingConfirmationSMS(booking, phoneNumber);

    // Schedule reminder
    await scheduleBookingReminder(booking);

    console.log('[BookingTools] Created booking:', booking.id);

    return {
      success: true,
      booking: {
        id: booking.id,
        confirmationCode: booking.confirmationCode,
        scheduledAt: booking.scheduledAt,
        serviceType: booking.serviceType,
        duration: booking.durationMinutes
      },
      message: `Prenotazione confermata con codice ${booking.confirmationCode}`,
      smsSent: smsResult.success,
      formattedDateTime: formatDateTimeItalian(booking.scheduledAt)
    };

  } catch (error) {
    console.error('[BookingTools] Create booking error:', error);
    
    return {
      success: false,
      error: true,
      message: 'Errore nella creazione della prenotazione',
      details: error.message
    };
  }
}

/**
 * Update an existing booking
 * @param {string} bookingId - Booking ID
 * @param {Object} updates - Fields to update
 * @param {string} shopId - Shop ID
 */
async function updateBooking(bookingId, updates, shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/bookings/${bookingId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shopId
        },
        body: JSON.stringify({
          ...updates,
          updatedAt: new Date().toISOString(),
          updatedBy: 'voice-ai'
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Update failed: ${response.status}`);
    }

    const updatedBooking = await response.json();

    // Send update notification
    if (updates.scheduledAt) {
      await sendBookingUpdateSMS(updatedBooking);
    }

    return {
      success: true,
      booking: updatedBooking,
      message: 'Prenotazione aggiornata'
    };

  } catch (error) {
    console.error('[BookingTools] Update error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cancel a booking
 * @param {string} bookingId - Booking ID
 * @param {string} shopId - Shop ID
 * @param {string} reason - Cancellation reason
 */
async function cancelBooking(bookingId, shopId, reason = 'customer_request') {
  try {
    // Get booking details first
    const bookingResponse = await fetch(
      `${process.env.BACKEND_API_URL}/bookings/${bookingId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shopId
        }
      }
    );

    if (!bookingResponse.ok) {
      throw new Error('Booking not found');
    }

    const booking = await bookingResponse.json();

    // Check cancellation deadline
    const bookingTime = new Date(booking.scheduledAt);
    const now = new Date();
    const hoursUntil = (bookingTime - now) / (1000 * 60 * 60);

    if (hoursUntil < BOOKING_CONFIG.CANCELLATION_DEADLINE_HOURS) {
      return {
        success: false,
        error: 'deadline_passed',
        message: `La prenotazione è troppo vicina per essere cancellata automaticamente. Chiama l'officina.`,
        requiresManual: true
      };
    }

    // Perform cancellation
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
          reason,
          cancelledAt: new Date().toISOString(),
          cancelledBy: 'voice-ai'
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Cancellation failed: ${response.status}`);
    }

    // Send cancellation SMS
    await sendCancellationSMS(booking);

    // Free up the slot
    await freeUpSlot(booking, shopId);

    return {
      success: true,
      message: 'Prenotazione cancellata',
      refundEligible: hoursUntil > 24 // Example policy
    };

  } catch (error) {
    console.error('[BookingTools] Cancel error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get booking by ID
 * @param {string} bookingId - Booking ID
 * @param {string} shopId - Shop ID
 */
async function getBooking(bookingId, shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/bookings/${bookingId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shopId
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Booking not found: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error('[BookingTools] Get booking error:', error);
    return null;
  }
}

/**
 * Get active bookings for customer
 * @param {string} customerId - Customer ID
 * @param {string} shopId - Shop ID
 */
async function getActiveBookings(customerId, shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/customers/${customerId}/bookings/active?shopId=${shopId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return data.bookings || [];

  } catch (error) {
    console.error('[BookingTools] Get active bookings error:', error);
    return [];
  }
}

/**
 * Check booking status
 * @param {string} bookingId - Booking ID
 * @param {string} shopId - Shop ID
 */
async function checkBookingStatus(bookingId, shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/bookings/${bookingId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shopId
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`);
    }

    const status = await response.json();

    return {
      bookingId,
      status: status.status,
      statusText: getStatusTextItalian(status.status),
      progress: status.progress,
      estimatedCompletion: status.estimatedCompletion,
      workDescription: status.workDescription,
      waitingFor: status.waitingFor,
      notes: status.notes
    };

  } catch (error) {
    console.error('[BookingTools] Status check error:', error);
    return null;
  }
}

/**
 * Reschedule booking to new slot
 * @param {string} bookingId - Booking ID
 * @param {string} newScheduledAt - New date/time
 * @param {string} shopId - Shop ID
 */
async function rescheduleBooking(bookingId, newScheduledAt, shopId) {
  try {
    // Get current booking
    const booking = await getBooking(bookingId, shopId);
    
    if (!booking) {
      return {
        success: false,
        error: 'booking_not_found'
      };
    }

    // Check reschedule limit
    if (booking.rescheduleCount >= BOOKING_CONFIG.MAX_RESCHEDULE_ATTEMPTS) {
      return {
        success: false,
        error: 'max_reschedules_reached',
        message: 'Numero massimo di spostamenti raggiunto. Contatta l\'officina.'
      };
    }

    // Update booking
    const result = await updateBooking(bookingId, {
      scheduledAt: newScheduledAt,
      rescheduleCount: (booking.rescheduleCount || 0) + 1,
      previousDates: [...(booking.previousDates || []), booking.scheduledAt]
    }, shopId);

    return result;

  } catch (error) {
    console.error('[BookingTools] Reschedule error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Add to waitlist when no slots available
 * @param {Object} params - Waitlist parameters
 */
async function addToWaitlist(params) {
  const {
    customerId,
    shopId,
    serviceType,
    preferredDates = [],
    urgency = 'medium',
    phoneNumber
  } = params;

  try {
    const response = await fetch(`${process.env.BACKEND_API_URL}/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
        'X-Shop-ID': shopId
      },
      body: JSON.stringify({
        customerId,
        shopId,
        serviceType,
        preferredDates,
        urgency,
        phoneNumber,
        addedAt: new Date().toISOString(),
        source: 'voice-ai'
      })
    });

    if (!response.ok) {
      throw new Error(`Waitlist add failed: ${response.status}`);
    }

    const waitlistEntry = await response.json();

    // Send confirmation
    await sendSMS({
      to: phoneNumber,
      body: `Sei in lista d'attesa per ${serviceType}. Ti contattiamo appena abbiamo disponibilità.`,
      shopId
    });

    return {
      success: true,
      waitlistId: waitlistEntry.id,
      position: waitlistEntry.position,
      message: 'Aggiunto alla lista d\'attesa'
    };

  } catch (error) {
    console.error('[BookingTools] Waitlist error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper functions

function generateConfirmationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars
  let code = '';
  for (let i = 0; i < BOOKING_CONFIG.CONFIRMATION_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function sendBookingConfirmationSMS(booking, phoneNumber) {
  const message = `Conferma prenotazione ${booking.confirmationCode}: ${booking.serviceType} ` +
                  `il ${formatDateShortItalian(booking.scheduledAt)} alle ${formatTimeItalian(booking.scheduledAt)}. ` +
                  `Per modifiche chiama l'officina.`;

  return await sendSMS({
    to: phoneNumber || booking.customerPhone,
    body: message,
    shopId: booking.shopId
  });
}

async function sendBookingUpdateSMS(booking) {
  const message = `Prenotazione ${booking.confirmationCode} aggiornata: ` +
                  `nuova data ${formatDateShortItalian(booking.scheduledAt)} ` +
                  `alle ${formatTimeItalian(booking.scheduledAt)}.`;

  return await sendSMS({
    to: booking.customerPhone,
    body: message,
    shopId: booking.shopId
  });
}

async function sendCancellationSMS(booking) {
  const message = `Prenotazione ${booking.confirmationCode} cancellata. ` +
                  `Per una nuova prenotazione chiama l'officina.`;

  return await sendSMS({
    to: booking.customerPhone,
    body: message,
    shopId: booking.shopId
  });
}

async function scheduleBookingReminder(booking) {
  // This would typically be handled by a scheduled job
  // For now, just log it
  console.log('[BookingTools] Reminder scheduled for booking:', booking.id);
}

async function freeUpSlot(booking, shopId) {
  try {
    await fetch(`${process.env.BACKEND_API_URL}/shops/${shopId}/slots/free`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
      },
      body: JSON.stringify({
        date: booking.scheduledAt.split('T')[0],
        time: booking.scheduledAt.split('T')[1].substring(0, 5),
        duration: booking.durationMinutes
      })
    });
  } catch (error) {
    console.error('[BookingTools] Free slot error:', error);
  }
}

function getStatusTextItalian(status) {
  const statusMap = {
    'pending': 'in attesa',
    'confirmed': 'confermata',
    'checked_in': 'consegnata',
    'in_progress': 'in lavorazione',
    'waiting_parts': 'in attesa ricambi',
    'quality_check': 'controllo qualità',
    'ready': 'pronta per il ritiro',
    'completed': 'completata',
    'cancelled': 'cancellata'
  };
  return statusMap[status] || status;
}

function formatDateShortItalian(isoString) {
  const date = new Date(isoString);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function formatTimeItalian(isoString) {
  const date = new Date(isoString);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDateTimeItalian(isoString) {
  const date = new Date(isoString);
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  return `${days[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1} alle ${formatTimeItalian(isoString)}`;
}

module.exports = {
  createBooking,
  updateBooking,
  cancelBooking,
  getBooking,
  getActiveBookings,
  checkBookingStatus,
  rescheduleBooking,
  addToWaitlist,
  generateConfirmationCode,
  BOOKING_CONFIG
};
