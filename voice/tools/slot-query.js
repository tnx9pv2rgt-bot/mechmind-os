/**
 * MechMind OS v10 - Slot Query Tools
 * 
 * Calendar and availability management:
 * - Available slot queries
 * - Slot duration calculation
 * - Service type mapping
 * - Emergency slot handling
 * 
 * @module tools/slot-query
 */

// Service type configurations
const SERVICE_CONFIG = {
  revisione: {
    durationMinutes: 60,
    priority: 'normal',
    bufferMinutes: 15,
    maxAdvanceBookingDays: 90
  },
  tagliando: {
    durationMinutes: 90,
    priority: 'normal',
    bufferMinutes: 15,
    maxAdvanceBookingDays: 90
  },
  riparazione: {
    durationMinutes: 120,
    priority: 'normal',
    bufferMinutes: 30,
    maxAdvanceBookingDays: 60
  },
  gomme: {
    durationMinutes: 45,
    priority: 'normal',
    bufferMinutes: 10,
    maxAdvanceBookingDays: 60
  },
  elettronica: {
    durationMinutes: 60,
    priority: 'normal',
    bufferMinutes: 15,
    maxAdvanceBookingDays: 60
  },
  carrozzeria: {
    durationMinutes: 180,
    priority: 'normal',
    bufferMinutes: 30,
    maxAdvanceBookingDays: 60
  },
  emergenza: {
    durationMinutes: 30,
    priority: 'high',
    bufferMinutes: 0,
    maxAdvanceBookingDays: 7,
    allowOverflow: true
  },
  diagnosi: {
    durationMinutes: 45,
    priority: 'normal',
    bufferMinutes: 15,
    maxAdvanceBookingDays: 30
  }
};

// Urgency multipliers for slot search
const URGENCY_CONFIG = {
  emergency: {
    daysToSearch: 2,
    allowSameDay: true,
    allowAfterHours: true,
    priority: 10
  },
  high: {
    daysToSearch: 3,
    allowSameDay: true,
    allowAfterHours: false,
    priority: 5
  },
  medium: {
    daysToSearch: 14,
    allowSameDay: false,
    allowAfterHours: false,
    priority: 3
  },
  low: {
    daysToSearch: 30,
    allowSameDay: false,
    allowAfterHours: false,
    priority: 1
  }
};

/**
 * Get available slots for booking
 * @param {Object} params - Query parameters
 * @param {string} params.shopId - Shop ID
 * @param {string} params.serviceType - Type of service
 * @param {string} params.urgency - Urgency level
 * @param {number} params.daysAhead - Days to look ahead
 * @param {string} params.preferredDate - Preferred date (ISO)
 * @param {string} params.preferredTime - Preferred time range
 */
async function getAvailableSlots(params) {
  const {
    shopId,
    serviceType,
    urgency = 'medium',
    daysAhead = 14,
    preferredDate,
    preferredTime
  } = params;

  const serviceConfig = SERVICE_CONFIG[serviceType.toLowerCase()] || SERVICE_CONFIG.riparazione;
  const urgencyConfig = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.medium;

  const actualDaysAhead = Math.min(
    urgencyConfig.daysToSearch,
    daysAhead,
    serviceConfig.maxAdvanceBookingDays
  );

  try {
    // Build query URL
    let url = `${process.env.BACKEND_API_URL}/shops/${shopId}/slots/available?`;
    url += `duration=${serviceConfig.durationMinutes}`;
    url += `&daysAhead=${actualDaysAhead}`;
    url += `&serviceType=${encodeURIComponent(serviceType)}`;
    url += `&priority=${urgencyConfig.priority}`;
    
    if (preferredDate) {
      url += `&preferredDate=${preferredDate}`;
    }
    if (preferredTime) {
      url += `&preferredTime=${encodeURIComponent(preferredTime)}`;
    }
    if (urgencyConfig.allowSameDay) {
      url += `&allowSameDay=true`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
        'X-Shop-ID': shopId
      }
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    // Format slots for voice response
    const formattedSlots = formatSlotsForVoice(data.slots || [], serviceType);

    return {
      found: formattedSlots.length > 0,
      slots: formattedSlots,
      serviceType,
      urgency,
      duration: serviceConfig.durationMinutes,
      totalAvailable: data.totalAvailable || formattedSlots.length,
      alternativeDates: data.alternativeDates || [],
      message: formattedSlots.length > 0
        ? `Trovati ${formattedSlots.length} slot disponibili`
        : generateNoSlotsMessage(urgency, serviceType)
    };

  } catch (error) {
    console.error('[SlotQuery] Error:', error);
    
    return {
      found: false,
      error: true,
      slots: [],
      message: 'Errore nella ricerca slot disponibili',
      fallback: true
    };
  }
}

/**
 * Check slot availability for specific date/time
 * @param {Object} params - Check parameters
 */
async function checkSlotAvailability(params) {
  const { shopId, date, time, duration, serviceType } = params;

  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/shops/${shopId}/slots/check`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shopId
        },
        body: JSON.stringify({
          date,
          time,
          duration,
          serviceType
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    return {
      available: data.available,
      conflicts: data.conflicts || [],
      alternativeSlots: data.alternatives || [],
      message: data.available 
        ? 'Slot disponibile'
        : 'Slot non disponibile'
    };

  } catch (error) {
    console.error('[SlotQuery] Availability check error:', error);
    return {
      available: false,
      error: true,
      message: 'Errore nel controllo disponibilità'
    };
  }
}

/**
 * Get next available emergency slot
 * @param {string} shopId - Shop ID
 * @param {string} serviceType - Service type
 */
async function getEmergencySlot(shopId, serviceType) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/shops/${shopId}/slots/emergency?serviceType=${encodeURIComponent(serviceType)}`,
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

    return {
      found: data.found,
      slot: data.slot ? {
        date: data.slot.date,
        time: data.slot.time,
        formatted: formatSlotForItalian(data.slot),
        isOverflow: data.slot.isOverflow || false
      } : null,
      estimatedWait: data.estimatedWait,
      alternativeShops: data.alternativeShops || []
    };

  } catch (error) {
    console.error('[SlotQuery] Emergency slot error:', error);
    return {
      found: false,
      error: true
    };
  }
}

/**
 * Get shop schedule/hours
 * @param {string} shopId - Shop ID
 */
async function getShopSchedule(shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/shops/${shopId}/schedule`,
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

    const schedule = await response.json();

    return {
      regularHours: schedule.regularHours,
      saturdayHours: schedule.saturdayHours,
      sundayHours: schedule.sundayHours,
      holidays: schedule.holidays || [],
      specialHours: schedule.specialHours || [],
      timezone: schedule.timezone || 'Europe/Rome'
    };

  } catch (error) {
    console.error('[SlotQuery] Schedule error:', error);
    return null;
  }
}

/**
 * Format slots for natural voice response
 */
function formatSlotsForVoice(slots, serviceType) {
  return slots.map(slot => ({
    date: slot.date,
    time: slot.time,
    duration: slot.duration,
    formatted: formatSlotForItalian(slot),
    isPreferred: slot.isPreferred || false,
    distance: slot.distanceFromPreferred
  }));
}

/**
 * Format slot for Italian natural language
 */
function formatSlotForItalian(slot) {
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const date = new Date(slot.date);
  const dayName = days[date.getDay()];
  const dayMonth = `${date.getDate()}/${date.getMonth() + 1}`;
  
  return `${dayName} ${dayMonth} alle ${slot.time}`;
}

/**
 * Generate no slots available message
 */
function generateNoSlotsMessage(urgency, serviceType) {
  const messages = {
    emergency: `Non ho slot immediati per emergenze. Ti metto in lista d'attesa prioritaria e ti richiamo entro 30 minuti.`,
    high: `Non ho disponibilità nei prossimi giorni. Posso metterti in lista d'attesa?`,
    medium: `Non ho slot disponibili nelle prossime due settimane. Posso cercare date successive?`,
    low: `La disponibilità è limitata. Posso metterti in lista d'attesa o cercare date più lontane?`
  };

  return messages[urgency] || messages.medium;
}

/**
 * Calculate service duration based on vehicle and service
 */
function calculateServiceDuration(serviceType, vehicle, additionalWork = []) {
  const baseConfig = SERVICE_CONFIG[serviceType.toLowerCase()] || SERVICE_CONFIG.riparazione;
  let duration = baseConfig.durationMinutes;

  // Add time for additional work
  additionalWork.forEach(work => {
    const workConfig = SERVICE_CONFIG[work.toLowerCase()];
    if (workConfig) {
      duration += workConfig.durationMinutes;
    }
  });

  // Adjust for vehicle type (larger vehicles may need more time)
  if (vehicle) {
    const vehicleType = detectVehicleType(vehicle);
    if (vehicleType === 'suv' || vehicleType === 'van') {
      duration = Math.ceil(duration * 1.1); // 10% more
    }
  }

  return duration + baseConfig.bufferMinutes;
}

/**
 * Detect vehicle type from make/model
 */
function detectVehicleType(vehicle) {
  const suvKeywords = ['suv', 'crossover', '4x4', 'jeep'];
  const vanKeywords = ['van', 'furgone', 'transit', 'ducato'];
  
  const searchText = `${vehicle.make} ${vehicle.model}`.toLowerCase();
  
  if (suvKeywords.some(k => searchText.includes(k))) return 'suv';
  if (vanKeywords.some(k => searchText.includes(k))) return 'van';
  
  return 'car';
}

/**
 * Get service type from description
 */
function detectServiceType(description) {
  const patterns = {
    'revisione': /revisione|revisionare/i,
    'tagliando': /tagliando|olio|filtro/i,
    'riparazione': /riparazione|guasto|rotto/i,
    'gomme': /gomme|pneumatici|ruote/i,
    'elettronica': /elettronica|batteria|sensori|spia/i,
    'carrozzeria': /carrozzeria|vernice|ammaccatura/i,
    'emergenza': /emergenza|urgente|fumo|perdita/i
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(description)) {
      return type;
    }
  }

  return 'riparazione'; // default
}

/**
 * Get alternative slot suggestions
 */
async function getAlternativeSlots(params) {
  const { shopId, originalDate, serviceType, urgency } = params;

  // Try nearby dates
  const alternatives = [];
  const daysToCheck = [1, -1, 2, -2, 3, -3];

  for (const dayOffset of daysToCheck) {
    const checkDate = new Date(originalDate);
    checkDate.setDate(checkDate.getDate() + dayOffset);
    
    const result = await getAvailableSlots({
      shopId,
      serviceType,
      urgency,
      daysAhead: 1,
      preferredDate: checkDate.toISOString().split('T')[0]
    });

    if (result.found && result.slots.length > 0) {
      alternatives.push(...result.slots.slice(0, 2));
    }

    if (alternatives.length >= 3) break;
  }

  return alternatives;
}

module.exports = {
  getAvailableSlots,
  checkSlotAvailability,
  getEmergencySlot,
  getShopSchedule,
  calculateServiceDuration,
  detectServiceType,
  detectVehicleType,
  formatSlotForItalian,
  getAlternativeSlots,
  SERVICE_CONFIG,
  URGENCY_CONFIG
};
