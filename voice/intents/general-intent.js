/**
 * MechMind OS v10 - General Inquiry Intent Handler
 * 
 * Handles general inquiries:
 * - Opening hours
 * - Location/directions
 * - Services offered
 * - Pricing information
 * - General questions
 * 
 * @module intents/general-intent
 */

// Intent patterns for general inquiries
const GENERAL_PATTERNS = {
  opening_hours: [
    /(?:orari|quando|che ore).{0,20}(?:apert|chius|aprite|chiudete)/i,
    /(?:sabato|domenica|festivi).{0,10}(?:apert|chius)/i,
    /(?:fino a che ora|dalle|orario)/i
  ],
  
  location: [
    /(?:dove|indirizzo|siete|trovate|ubicazione)/i,
    /(?:come arrivo|come si arriva|dove siete)/i,
    /(?:parcheggio|posteggio)/i
  ],
  
  services: [
    /(?:cosa|cose|servizi|fate|offrite)/i,
    /(?:revisione|tagliando|riparazione|elettronica|carrozzeria|gomme)/i,
    /(?:fate anche|fate pure|fate anche|fate anche)/i
  ],
  
  pricing: [
    /(?:quanto|prezzo|costo|tariffa)/i,
    /(?:revisione|tagliando).{0,10}(?:costa|viene)/i,
    /(?:preventivo|stima|quotazione)/i
  ],
  
  emergency: [
    /(?:emergenza|urgente|soccorso|carro attrezzi)/i,
    /(?:non parte|non si avvia|guasto|panne)/i,
    /(?:aiuto|urgente|subito)/i
  ],
  
  new_customer: [
    /(?:nuovo|prima volta|mai stato|non sono mai)/i,
    /(?:come funziona|come si fa|devo fare)/i
  ],
  
  gdpr: [
    /(?:privacy|dati|gdpr|consenso|cancellare)/i,
    /(?:diritto all'oblio|eliminare dati|non voglio più)/i
  ],
  
  greeting: [
    /^(ciao|buongiorno|buonasera|salve|pronto)$/i,
    /(?:chi parla|con chi parlo|chi sei)/i
  ],
  
  goodbye: [
    /^(arrivederci|ciao|grazie|a presto|buona giornata)$/i,
    /(?:nient'altro|basta così|va bene così)/i
  ]
};

// Response templates
const RESPONSES = {
  opening_hours: (shop) => {
    const hours = shop.openingHours;
    return `Siamo aperti ${hours}. ` +
           `Il sabato mattina siamo aperti ${shop.saturdayHours || 'su appuntamento'}. ` +
           `Domenica e festivi chiusi.`;
  },
  
  location: (shop) => {
    return `Siamo in ${shop.address}. ` +
           `Abbiamo parcheggio disponibile per i clienti. ` +
           `Vuoi che ti invii la posizione via SMS?`;
  },
  
  services: (shop) => {
    const services = shop.services?.join(', ') || 'revisioni, tagliandi, riparazioni meccaniche ed elettroniche';
    return `Offriamo: ${services}. ` +
           `Tutti i lavori sono garantiti. ` +
           `Per quale servizio ti serve assistenza?`;
  },
  
  pricing: (shop) => {
    return `I prezzi dipendono dal tipo di intervento e dal veicolo. ` +
           `Per un preventivo preciso serve vedere la macchina. ` +
           `Le revisioni partono da circa ${shop.baseRevisionPrice || '80'} euro. ` +
           `Vuoi prenotare una verifica?`;
  },
  
  emergency: (shop) => {
    if (shop.emergencyService) {
      return `Per emergenze chiamaci direttamente al ${shop.emergencyPhone || shop.phone}. ` +
             `Abbiamo servizio di carro attrezzi convenzionato. ` +
             `Descrivimi il problema così valutiamo l'urgenza.`;
    }
    return `Per emergenze fuori orario chiama il ${shop.emergencyPhone || 'nostro numero principale'}. ` +
           `Se necessario, ti indirizziamo al servizio di soccorso più vicino.`;
  },
  
  new_customer: (shop) => {
    return `Benvenuto! Per i nuovi clienti facciamo sempre un controllo gratuito iniziale. ` +
           `Basta prenotare un appuntamento. Hai bisogno di un servizio specifico?`;
  },
  
  gdpr: () => {
    return `Per la privacy: conserviamo i dati solo per 30 giorni senza consenso esplicito. ` +
           `Puoi richiedere la cancellazione in qualsiasi momento. ` +
           `Vuoi che ti invii maggiori informazioni?`;
  },
  
  greeting: (shop) => {
    return `Pronto, sono MechSecretary, la segretaria digitale di ${shop.name}. ` +
           `Come posso aiutarti oggi?`;
  },
  
  goodbye: () => {
    return `Grazie per aver chiamato! A presto e buona giornata!`;
  }
};

/**
 * Detect general inquiry intent
 */
function detectGeneralIntent(transcript) {
  for (const [intentType, patterns] of Object.entries(GENERAL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(transcript)) {
        return {
          detected: true,
          type: intentType,
          confidence: 0.8
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
 * Handle general inquiry intent
 */
async function handleGeneralIntent(params) {
  const { transcript, phoneNumber, shopId, context } = params;

  // Detect intent
  const intent = detectGeneralIntent(transcript);

  console.log('[GeneralIntent] Detected:', intent);

  if (!intent.detected) {
    return {
      handled: false,
      reason: 'unknown_intent',
      message: 'Non ho capito bene. Puoi ripetere o essere più specifico?'
    };
  }

  // Get shop info
  const shop = await getShopInfo(shopId);

  if (!shop) {
    return {
      handled: false,
      error: 'shop_not_found',
      message: 'Mi dispiace, sto avendo problemi tecnici. Ti passo a un collega.'
    };
  }

  // Generate response based on intent type
  const responseGenerator = RESPONSES[intent.type];
  
  if (!responseGenerator) {
    return {
      handled: false,
      reason: 'no_response_generator',
      message: 'Non sono sicura di aver capito. Puoi riformulare?'
    };
  }

  const message = responseGenerator(shop);

  // Handle special cases
  if (intent.type === 'goodbye') {
    return {
      handled: true,
      step: 'goodbye',
      endCall: true,
      message
    };
  }

  if (intent.type === 'gdpr') {
    return {
      handled: true,
      step: 'gdpr_info',
      message,
      offerConsent: true
    };
  }

  return {
    handled: true,
    step: `general_${intent.type}`,
    intentType: intent.type,
    message,
    shop: {
      name: shop.name,
      phone: shop.phone
    }
  };
}

/**
 * Get shop information
 */
async function getShopInfo(shopId) {
  try {
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/shops/${shopId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
        }
      }
    );

    if (!response.ok) return null;

    return await response.json();

  } catch (error) {
    console.error('[GeneralIntent] Failed to get shop info:', error);
    return null;
  }
}

/**
 * Handle unknown/fallback intent
 */
async function handleUnknownIntent(params) {
  const { context } = params;
  
  // Track unknown turns for escalation
  const unknownTurns = (context.unknownTurns || 0) + 1;

  if (unknownTurns >= 2) {
    // Escalate after 2 unknown turns
    return {
      handled: true,
      step: 'escalate_unknown',
      unknownTurns,
      escalate: true,
      message: 'Mi scuso, ma non sto capendo bene. Ti passo a un collega umano che potrà aiutarti meglio.',
      reason: 'multiple_unknown_intents'
    };
  }

  // Try to clarify
  const clarifications = [
    'Non ho capito bene. Puoi ripetere?',
    'Scusa, puoi essere più specifico?',
    'Mi dispiace, non ho capito. Cosa posso fare per te?'
  ];

  return {
    handled: true,
    step: 'clarification',
    unknownTurns,
    message: clarifications[unknownTurns - 1] || clarifications[0],
    context: {
      ...context,
      unknownTurns
    }
  };
}

/**
 * Extract potential intent from partial/unclear input
 */
function extractPotentialIntent(transcript) {
  const keywords = {
    booking: ['prenot', 'appunt', 'quando', 'libero'],
    status: ['pront', 'finit', 'dove', 'quando'],
    complaint: ['problema', 'male', 'non va', 'arrabbiato'],
    general: ['orari', 'dove', 'costa', 'servizi']
  };

  const scores = {};
  const text = transcript.toLowerCase();

  for (const [intent, words] of Object.entries(keywords)) {
    scores[intent] = words.filter(w => text.includes(w)).length;
  }

  const bestMatch = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0)[0];

  return bestMatch ? bestMatch[0] : null;
}

/**
 * Handle multi-intent detection
 */
async function handleMultiIntent(params) {
  const { transcript } = params;

  // Check for multiple intents in single message
  const detectedIntents = [];

  for (const [intentType, patterns] of Object.entries(GENERAL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(transcript)) {
        detectedIntents.push(intentType);
        break;
      }
    }
  }

  if (detectedIntents.length > 1) {
    return {
      handled: true,
      step: 'multi_intent',
      detectedIntents,
      message: `Hai chiesto più cose. Iniziamo con ${detectedIntents[0]}. Per le altre domande, chiedi pure dopo.`
    };
  }

  return null;
}

module.exports = {
  detectGeneralIntent,
  handleGeneralIntent,
  handleUnknownIntent,
  handleMultiIntent,
  extractPotentialIntent,
  getShopInfo,
  GENERAL_PATTERNS,
  RESPONSES
};
