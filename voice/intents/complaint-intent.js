/**
 * MechMind OS v10 - Complaint Intent Handler
 * 
 * Handles customer complaints with de-escalation:
 * - Service complaints
 * - Billing disputes
 * - Quality issues
 * - Escalation to manager
 * 
 * @module intents/complaint-intent
 */

const { escalateToHuman } = require('../tools/escalation-tools');

// Complaint detection patterns
const COMPLAINT_PATTERNS = {
  service_complaint: [
    /(?:non funziona|non va|peggio|rotto di nuovo|stesso problema)/i,
    /(?:non siete bravi|non capite|incompetent|impreparat)/i,
    /(?:avete rovinato|avete danneggiato|avete rotto)/i
  ],
  
  billing_complaint: [
    /(?:fattura|conto|prezzo|costo|troppo caro|esagerat)/i,
    /(?:non ho chiesto|non avevo approvat|non concordat)/i,
    /(?:sorpresa|imprevisto|extra|non preventivat)/i
  ],
  
  delay_complaint: [
    /(?:tardi|ritardo|aspetto da|non finite|quando finite)/i,
    /(?:avevate detto|mi avevate promesso|doveva essere pront)/i
  ],
  
  negative_sentiment: [
    /(?:arrabbiat|furios|delus|insoddisfatt|scandal|vergogn)/i,
    /(?:denunci|avvocat|legge|tribunal|diffid)/i
  ]
} };

// De-escalation responses
const DEESCALATION_RESPONSES = {
  initial: [
    "Mi scuso per l'inconveniente. Capisco la tua frustrazione e sono qui per aiutarti.",
    "Mi dispiace sentire che hai avuto questa esperienza. Vediamo come posso risolvere."
  ],
  
  service: [
    "Capisco che il problema persiste. Voglio assicurarmi che venga risolto definitivamente.",
    "Mi scuso se la riparazione non ha funzionato come previsto. Verifichiamo subito."
  ],
  
  billing: [
    "Capisco le tue preoccupazioni sulla fattura. Verifichiamo insieme le voci.",
    "Mi scuso per la confusione sul costo. Ti spiego ogni voce."
  ],
  
  delay: [
    "Mi scuso per il ritardo. Capisco quanto sia frustrante.",
    "So che il tempo è prezioso. Ti do subito un aggiornamento realistico."
  ],
  
  escalation: [
    "Capisco che questo richiede attenzione immediata. Ti passo subito al responsabile.",
    "Voglio assicurarmi che questo venga gestito al meglio. Ti collego con il nostro responsabile."
  ]
};

// Sentiment thresholds
const SENTIMENT_THRESHOLDS = {
  MILD: -0.3,
  MODERATE: -0.6,
  SEVERE: -0.8
};

/**
 * Detect complaint intent with sentiment analysis
 */
function detectComplaintIntent(transcript) {
  let highestConfidence = 0;
  let detectedType = null;
  let sentimentScore = 0;

  // Check complaint patterns
  for (const [type, patterns] of Object.entries(COMPLAINT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(transcript)) {
        const confidence = calculatePatternConfidence(transcript, pattern);
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          detectedType = type;
        }
      }
    }
  }

  // Calculate sentiment score
  sentimentScore = calculateSentimentScore(transcript);

  // Determine severity
  let severity = 'none';
  if (sentimentScore <= SENTIMENT_THRESHOLDS.SEVERE) {
    severity = 'severe';
  } else if (sentimentScore <= SENTIMENT_THRESHOLDS.MODERATE) {
    severity = 'moderate';
  } else if (sentimentScore <= SENTIMENT_THRESHOLDS.MILD || detectedType) {
    severity = 'mild';
  }

  return {
    detected: severity !== 'none',
    type: detectedType,
    severity,
    sentimentScore,
    confidence: highestConfidence,
    requiresEscalation: severity === 'severe' || sentimentScore <= SENTIMENT_THRESHOLDS.MODERATE
  };
}

/**
 * Handle complaint intent with de-escalation
 */
async function handleComplaintIntent(params) {
  const { transcript, phoneNumber, shopId, context, conversationHistory = [] } = params;

  // Analyze complaint
  const complaint = detectComplaintIntent(transcript);

  console.log('[ComplaintIntent] Detected:', complaint);

  // Track complaint in conversation context
  const updatedContext = {
    ...context,
    complaintDetected: true,
    complaintType: complaint.type,
    complaintSeverity: complaint.severity,
    complaintTurns: (context.complaintTurns || 0) + 1
  };

  // Check for immediate escalation
  if (complaint.requiresEscalation || updatedContext.complaintTurns >= 2) {
    return await escalateComplaint(params, complaint, updatedContext);
  }

  // Generate de-escalation response
  const response = generateDeescalationResponse(complaint, conversationHistory);

  // Try to gather more information
  const information = extractComplaintDetails(transcript);

  return {
    handled: true,
    step: 'complaint_acknowledged',
    complaint,
    context: updatedContext,
    message: response,
    information,
    nextAction: 'gather_more_info'
  };
}

/**
 * Escalate complaint to human/manager
 */
async function escalateComplaint(params, complaint, context) {
  const { phoneNumber, shopId, transcript } = params;

  // Log escalation
  await logComplaint({
    phoneNumber,
    shopId,
    complaintType: complaint.type,
    severity: complaint.severity,
    sentimentScore: complaint.sentimentScore,
    transcript,
    escalatedAt: new Date().toISOString()
  });

  // Get escalation response
  const escalationMessage = getRandomResponse(DEESCALATION_RESPONSES.escalation);

  // Initiate transfer
  const transferResult = await escalateToHuman({
    phoneNumber,
    shopId,
    reason: `complaint:${complaint.type}`,
    priority: complaint.severity === 'severe' ? 'urgent' : 'high',
    context: {
      complaintType: complaint.type,
      severity: complaint.severity,
      customerTranscript: transcript,
      sentimentScore: complaint.sentimentScore
    }
  });

  return {
    handled: true,
    step: 'complaint_escalated',
    complaint,
    escalated: true,
    message: escalationMessage,
    transferInitiated: transferResult.success,
    estimatedWait: transferResult.estimatedWait || 'pochi minuti'
  };
}

/**
 * Generate de-escalation response
 */
function generateDeescalationResponse(complaint, conversationHistory) {
  // Select appropriate response category
  let responseCategory = DEESCALATION_RESPONSES.initial;
  
  if (complaint.type && DEESCALATION_RESPONSES[complaint.type]) {
    responseCategory = DEESCALATION_RESPONSES[complaint.type];
  }

  // Get response
  let response = getRandomResponse(responseCategory);

  // Add specific acknowledgment based on complaint type
  const acknowledgments = {
    service_complaint: " Verifichiamo subito cosa è successo.",
    billing_complaint: " Controlliamo subito la tua fattura.",
    delay_complaint: " Ti do un aggiornamento immediato sui tempi."
  };

  if (acknowledgments[complaint.type]) {
    response += acknowledgments[complaint.type];
  }

  return response;
}

/**
 * Extract complaint details from transcript
 */
function extractComplaintDetails(transcript) {
  const details = {
    mentionsVehicle: /(?:macchin|auto|veicol|mot)/i.test(transcript),
    mentionsSpecificIssue: null,
    mentionsTimeframe: null,
    mentionsAmount: null,
    requestsRefund: /(?:rimborso|indennizz|soldi indietro)/i.test(transcript),
    threatensLegal: /(?:avvocat|legge|denunci|tribunal)/i.test(transcript),
    mentionsCompetitor: /(?:altro|altra officin|garage)/i.test(transcript)
  };

  // Extract specific issue
  const issuePatterns = {
    'engine': /(?:motor|motore|fumo|rumor)/i,
    'brakes': /(?:fren|freno)/i,
    'electrical': /(?:elettric|batteria|luci|spia)/i,
    'transmission': /(?:cambio|trasmission|frizione)/i,
    'bodywork': /(?:carrozzeri|vernice|graffi)/i
  };

  for (const [issue, pattern] of Object.entries(issuePatterns)) {
    if (pattern.test(transcript)) {
      details.mentionsSpecificIssue = issue;
      break;
    }
  }

  // Extract timeframe
  const timeframePatterns = {
    'recent': /(?:ieri|oggi|questa settimana|pochi giorni)/i,
    'ongoing': /(?:settimane|mesi|da tempo|sempre)/i,
    'recurring': /(?:di nuovo|ancora|sempre lo stesso)/i
  };

  for (const [timeframe, pattern] of Object.entries(timeframePatterns)) {
    if (pattern.test(transcript)) {
      details.mentionsTimeframe = timeframe;
      break;
    }
  }

  // Extract amount if mentioned
  const amountMatch = transcript.match(/(?:€|euro|EUR)\s*(\d+(?:[.,]\d{2})?)/i);
  if (amountMatch) {
    details.mentionsAmount = parseFloat(amountMatch[1].replace(',', '.'));
  }

  return details;
}

/**
 * Calculate sentiment score
 */
function calculateSentimentScore(transcript) {
  const negativeWords = {
    severe: ['denunci', 'avvocat', 'tribunal', 'legge', 'scandalo', 'vergogn', 'furios', 'arrabbiatissimo'],
    moderate: ['arrabbiat', 'delus', 'insoddisfatt', 'stanco', 'frustrat', 'peggio', 'rovinato'],
    mild: ['male', 'non bene', 'problema', 'errore', 'sbagliato']
  };

  let score = 0;
  const text = transcript.toLowerCase();

  negativeWords.severe.forEach(word => {
    if (text.includes(word)) score -= 0.4;
  });

  negativeWords.moderate.forEach(word => {
    if (text.includes(word)) score -= 0.25;
  });

  negativeWords.mild.forEach(word => {
    if (text.includes(word)) score -= 0.1;
  });

  // Check for intensifiers
  const intensifiers = ['molto', 'troppo', 'veramente', 'assolutamente', 'completamente'];
  intensifiers.forEach(intensifier => {
    if (text.includes(intensifier)) score *= 1.2;
  });

  return Math.max(-1, Math.min(0, score));
}

/**
 * Calculate pattern confidence
 */
function calculatePatternConfidence(transcript, pattern) {
  const match = transcript.match(pattern);
  if (!match) return 0;
  
  // Higher confidence for longer matches
  return Math.min(0.95, 0.5 + (match[0].length / transcript.length) * 0.5);
}

/**
 * Get random response from array
 */
function getRandomResponse(responses) {
  if (Array.isArray(responses)) {
    return responses[Math.floor(Math.random() * responses.length)];
  }
  return responses;
}

/**
 * Log complaint for analysis
 */
async function logComplaint(complaintData) {
  try {
    await fetch(`${process.env.BACKEND_API_URL}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`
      },
      body: JSON.stringify(complaintData)
    });
  } catch (error) {
    console.error('[ComplaintIntent] Failed to log complaint:', error);
  }
}

module.exports = {
  detectComplaintIntent,
  handleComplaintIntent,
  escalateComplaint,
  generateDeescalationResponse,
  extractComplaintDetails,
  calculateSentimentScore,
  COMPLAINT_PATTERNS,
  DEESCALATION_RESPONSES,
  SENTIMENT_THRESHOLDS
};
