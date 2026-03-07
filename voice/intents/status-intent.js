/**
 * MechMind OS v10 - Status Check Intent Handler
 * 
 * Handles vehicle/work status inquiries:
 * - Work progress checks
 * - Completion time estimates
 * - Parts availability
 * - Pickup notifications
 * 
 * @module intents/status-intent
 */

const { checkBookingStatus } = require('../tools/booking-tools');

// Status intent patterns
const STATUS_PATTERNS = {
  work_status: [
    /(?:quando|a che ora).{0,30}(?:pront|finit|complet|terminat)/i,
    /(?:dove|come).{0,20}(?:lavorazione|stato|andament)/i,
    /(?:macchin|auto|veicol|macchina).{0,20}(?:pront|finit)/i
  ],
  
  parts_status: [
    /(?:ricambi|pezzi|parti).{0,20}(?:arriv|disponib|ordinat)/i,
    /(?:quando|a che ora).{0,20}(?:ricambi|pezzi)/i
  ],
  
  cost_estimate: [
    /(?:quanto|costo|prezzo|fattura).{0,30}(?:costa|viene|sarà)/i,
    /(?:preventivo|stima|quotazione)/i
  ],
  
  pickup_ready: [
    /(?:posso|possiamo).{0,20}(?:ritir|venire|passare)/i,
    /(?:quando|a che ora).{0,20}(?:ritir|venire)/i
  ]
};

// Status descriptions in Italian
const STATUS_DESCRIPTIONS = {
  'pending': {
    text: 'in attesa di inizio',
    response: 'La tua prenotazione è confermata e in attesa della data prevista.'
  },
  'confirmed': {
    text: 'confermata',
    response: 'La tua prenotazione è confermata. Ti aspettiamo alla data e ora concordate.'
  },
  'checked_in': {
    text: 'consegnata',
    response: 'Il veicolo è stato consegnato e sta per entrare in officina.'
  },
  'in_progress': {
    text: 'in lavorazione',
    response: 'Stiamo lavorando sul tuo veicolo. Ti aggiorniamo appena possibile.'
  },
  'waiting_parts': {
    text: 'in attesa ricambi',
    response: 'Stiamo aspettando l\'arrivo dei ricambi necessari. Ti contattiamo appena arrivano.'
  },
  'quality_check': {
    text: 'in controllo qualità',
    response: 'Il veicolo è in fase di controllo qualità finale.'
  },
  'ready': {
    text: 'pronta per il ritiro',
    response: 'Ottime notizie! Il veicolo è pronto per il ritiro.'
  },
  'completed': {
    text: 'completata',
    response: 'La lavorazione è stata completata. Grazie per averci scelto!'
  },
  'on_hold': {
    text: 'in sospeso',
    response: 'La lavorazione è temporaneamente in sospeso. Ti contattiamo per i dettagli.'
  }
};

/**
 * Detect status check intent
 */
function detectStatusIntent(transcript) {
  for (const [intentType, patterns] of Object.entries(STATUS_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(transcript)) {
        return {
          detected: true,
          type: intentType,
          confidence: 0.85
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
 * Handle status check intent
 */
async function handleStatusIntent(params) {
  const { transcript, phoneNumber, shopId, context } = params;

  // Detect specific status intent
  const intent = detectStatusIntent(transcript);

  console.log('[StatusIntent] Detected:', intent);

  // Get customer and active bookings
  const customerResult = await lookupCustomer(phoneNumber, shopId);
  
  if (!customerResult.found) {
    return {
      handled: true,
      step: 'customer_not_found',
      message: 'Non ti trovo in sistema. Hai un\'attiva prenotazione?'
    };
  }

  // Get active work/bookings
  const activeWork = await getActiveWork(customerResult.customer.id, shopId);

  if (!activeWork || activeWork.length === 0) {
    return {
      handled: true,
      step: 'no_active_work',
      message: 'Non ho trovato lavorazioni in corso. Posso aiutarti con una nuova prenotazione?'
    };
  }

  // Handle based on intent type
  switch (intent.type) {
    case 'work_status':
      return await handleWorkStatusCheck(activeWork, params);
      
    case 'parts_status':
      return await handlePartsStatusCheck(activeWork, params);
      
    case 'cost_estimate':
      return await handleCostEstimate(activeWork, params);
      
    case 'pickup_ready':
      return await handlePickupReady(activeWork, params);
      
    default:
      // General status check
      return await handleGeneralStatusCheck(activeWork, params);
  }
}

/**
 * Handle work status check
 */
async function handleWorkStatusCheck(activeWork, params) {
  const work = activeWork[0]; // Most recent
  const status = STATUS_DESCRIPTIONS[work.status] || { text: work.status, response: '' };

  let message = '';

  switch (work.status) {
    case 'in_progress':
      message = `La tua ${work.vehicleMake} ${work.vehicleModel} è in lavorazione. `;
      if (work.progress) {
        message += `Siamo al ${work.progress}% del lavoro. `;
      }
      if (work.estimatedCompletion) {
        const eta = formatTimeItalian(work.estimatedCompletion);
        message += `Stimiamo il completamento attorno alle ${eta}.`;
      }
      break;

    case 'waiting_parts':
      message = `La tua ${work.vehicleMake} è in attesa di ricambi. `;
      if (work.partsExpectedDate) {
        const partsDate = formatDateItalian(work.partsExpectedDate);
        message += `I pezzi dovrebbero arrivare ${partsDate}. `;
      }
      message += 'Ti chiamiamo appena arrivano per darti un aggiornamento.';
      break;

    case 'quality_check':
      message = `La tua ${work.vehicleMake} è in fase di controllo qualità finale. `;
      message += 'Dovrebbe essere pronta per il ritiro a breve.';
      break;

    case 'ready':
      message = `Ottime notizie! La tua ${work.vehicleMake} ${work.vehicleModel} è pronta per il ritiro. `;
      message += `Puoi passare negli orari di apertura. Ti aspettiamo!`;
      break;

    default:
      message = status.response || `Stato attuale: ${status.text}`;
  }

  return {
    handled: true,
    step: 'work_status_provided',
    work,
    message,
    details: {
      status: work.status,
      progress: work.progress,
      estimatedCompletion: work.estimatedCompletion
    }
  };
}

/**
 * Handle parts status check
 */
async function handlePartsStatusCheck(activeWork, params) {
  const work = activeWork[0];

  if (work.status !== 'waiting_parts') {
    return {
      handled: true,
      step: 'no_parts_waiting',
      message: work.status === 'in_progress' 
        ? 'La lavorazione è in corso, non siamo in attesa di ricambi.'
        : 'Non ci sono ricambi in attesa per la tua lavorazione.',
      work
    };
  }

  let message = `Per la tua ${work.vehicleMake} stiamo aspettando: `;
  
  if (work.waitingParts && work.waitingParts.length > 0) {
    const partsList = work.waitingParts.map(p => p.name).join(', ');
    message += `${partsList}. `;
  }

  if (work.partsOrderedDate) {
    message += `Ordinati il ${formatDateItalian(work.partsOrderedDate)}. `;
  }

  if (work.partsExpectedDate) {
    const daysUntil = getDaysUntil(work.partsExpectedDate);
    if (daysUntil === 0) {
      message += 'Dovrebbero arrivare oggi!';
    } else if (daysUntil === 1) {
      message += 'Dovrebbero arrivare domani.';
    } else {
      message += `Stimiamo l'arrivo tra ${daysUntil} giorni.`;
    }
  }

  return {
    handled: true,
    step: 'parts_status_provided',
    work,
    message,
    parts: work.waitingParts || []
  };
}

/**
 * Handle cost estimate request
 */
async function handleCostEstimate(activeWork, params) {
  const work = activeWork[0];

  // Check if estimate is available
  if (!work.estimate) {
    return {
      handled: true,
      step: 'estimate_not_ready',
      message: 'Il preventivo non è ancora pronto. Il nostro staff ti contatterà appena disponibile.',
      work
    };
  }

  const estimate = work.estimate;
  
  let message = `Ecco il preventivo per la tua ${work.vehicleMake}: `;
  message += `Totale stimato €${estimate.total}. `;
  
  if (estimate.breakdown) {
    message += `Include manodopera €${estimate.breakdown.labor}, `;
    message += `ricambi €${estimate.breakdown.parts}`;
    if (estimate.breakdown.other > 0) {
      message += `, altro €${estimate.breakdown.other}`;
    }
    message += '. ';
  }

  if (estimate.approvalRequired && !estimate.approved) {
    message += 'Richiediamo la tua approvazione per procedere. ';
    message += 'Puoi confermare rispondendo a questo messaggio con SI o chiamandoci.';
  }

  return {
    handled: true,
    step: 'estimate_provided',
    work,
    message,
    estimate: {
      total: estimate.total,
      requiresApproval: estimate.approvalRequired && !estimate.approved
    }
  };
}

/**
 * Handle pickup ready check
 */
async function handlePickupReady(activeWork, params) {
  const work = activeWork[0];

  if (work.status === 'ready') {
    return {
      handled: true,
      step: 'vehicle_ready',
      work,
      message: `Sì, la tua ${work.vehicleMake} ${work.vehicleModel} è pronta per il ritiro! ` +
               `Puoi passare negli orari di apertura. Porta un documento d'identità.`,
      ready: true
    };
  }

  if (work.status === 'completed') {
    return {
      handled: true,
      step: 'already_completed',
      work,
      message: `La lavorazione sulla tua ${work.vehicleMake} è già stata completata. ` +
               `Se non hai ancora ritirato il veicolo, passa quando vuoi.`,
      ready: true
    };
  }

  // Not ready yet
  const status = STATUS_DESCRIPTIONS[work.status] || { text: work.status };
  
  let message = `La tua ${work.vehicleMake} non è ancora pronta. `;
  message += `Stato attuale: ${status.text}. `;
  
  if (work.estimatedCompletion) {
    const eta = formatDateTimeItalian(work.estimatedCompletion);
    message += `Stimiamo il completamento per ${eta}.`;
  } else {
    message += 'Ti chiamiamo non appena è pronta.';
  }

  return {
    handled: true,
    step: 'vehicle_not_ready',
    work,
    message,
    ready: false,
    estimatedCompletion: work.estimatedCompletion
  };
}

/**
 * Handle general status check
 */
async function handleGeneralStatusCheck(activeWork, params) {
  const work = activeWork[0];
  const status = STATUS_DESCRIPTIONS[work.status];

  let message = '';

  if (work.status === 'ready') {
    message = `Buone notizie! La tua ${work.vehicleMake} ${work.vehicleModel} è pronta per il ritiro.`;
  } else if (work.status === 'in_progress') {
    message = `La tua ${work.vehicleMake} è in lavorazione. `;
    if (work.progress) {
      message += `Completamento al ${work.progress}%. `;
    }
    if (work.estimatedCompletion) {
      message += `Prevista pronta per ${formatDateItalian(work.estimatedCompletion)}.`;
    }
  } else {
    message = status?.response || `Stato: ${status?.text || work.status}`;
  }

  return {
    handled: true,
    step: 'general_status_provided',
    work,
    message,
    status: work.status
  };
}

/**
 * Lookup customer by phone
 */
async function lookupCustomer(phoneNumber, shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/customers/lookup?phone=${encodeURIComponent(phoneNumber)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
          'X-Shop-ID': shopId
        }
      }
    );

    if (!response.ok) return { found: false };

    return {
      found: true,
      customer: await response.json()
    };

  } catch (error) {
    console.error('[StatusIntent] Customer lookup failed:', error);
    return { found: false };
  }
}

/**
 * Get active work for customer
 */
async function getActiveWork(customerId, shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/customers/${customerId}/work/active?shopId=${shopId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
        }
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.work || [];

  } catch (error) {
    console.error('[StatusIntent] Failed to get active work:', error);
    return [];
  }
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

function formatTimeItalian(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateTimeItalian(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getDaysUntil(isoString) {
  const target = new Date(isoString);
  const now = new Date();
  const diffTime = target - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

module.exports = {
  detectStatusIntent,
  handleStatusIntent,
  handleWorkStatusCheck,
  handlePartsStatusCheck,
  handleCostEstimate,
  handlePickupReady,
  STATUS_DESCRIPTIONS,
  STATUS_PATTERNS
};
