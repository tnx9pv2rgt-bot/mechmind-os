/**
 * IVR Fallback Strategy
 * Triggered when Vapi latency > 2.5s or Vapi service is unavailable
 * 
 * Implements: P0 FIX #2 - Voice Latency Realistic SLA
 * Validation: https://voiceaiwrapper.com/insights/vapi-voice-ai-optimization-performance-guide-voiceaiwrapper
 */

const { Twilio } = require('twilio');
const logger = require('../utils/logger');

class IVRFallback {
  constructor() {
    this.twilio = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.fallbackNumber = process.env.FALLBACK_SHOP_NUMBER;
    this.ivrTimeout = 30000; // 30 seconds
  }

  /**
   * Generate TwiML for IVR menu
   * Called when AI voice response timeout
   */
  generateIVRMenu(shopConfig = {}) {
    const twiml = new Twilio.twiml.VoiceResponse();
    
    // Welcome message
    twiml.say(
      { voice: 'alice', language: 'it-IT' },
      'Grazie per aver chiamato. Al momento il nostro sistema automatico non è disponibile.'
    );
    
    // Present menu options
    const gather = twiml.gather({
      numDigits: 1,
      timeout: 5,
      action: '/twilio/ivr-handler',
      method: 'POST',
    });
    
    gather.say(
      { voice: 'alice', language: 'it-IT' },
      'Per una nuova prenotazione, premi 1. Per controllare lo stato del tuo veicolo, premi 2. ' +
      'Per parlare con un operatore, premi 3. Per lasciare un messaggio, premi 4.'
    );
    
    // If no input, retry once then transfer
    twiml.say(
      { voice: 'alice', language: 'it-IT' },
      'Non ho ricevuto una risposta. Ti trasferisco a un operatore.'
    );
    twiml.dial(this.fallbackNumber, { timeout: 30 });
    
    return twiml.toString();
  }

  /**
   * Handle IVR menu selection
   */
  async handleIVRSelection(digit, callerNumber, shopId) {
    const twiml = new Twilio.twiml.VoiceResponse();
    
    switch (digit) {
      case '1':
        // Booking request - collect callback
        twiml.say(
          { voice: 'alice', language: 'it-IT' },
          'Per una nuova prenotazione, ti richiameremo entro 30 minuti. Lascia il tuo numero di telefono dopo il segnale.'
        );
        twiml.record({
          maxLength: 30,
          action: '/twilio/voicemail-booking',
          transcribe: true,
        });
        break;
        
      case '2':
        // Status check - transfer to human (requires lookup)
        twiml.say(
          { voice: 'alice', language: 'it-IT' },
          'Ti trasferisco a un operatore per controllare lo stato del tuo veicolo.'
        );
        twiml.dial(this.fallbackNumber, { timeout: 30 });
        break;
        
      case '3':
        // Direct transfer to human
        twiml.say(
          { voice: 'alice', language: 'it-IT' },
          'Ti trasferisco a un operatore. Attendi in linea.'
        );
        twiml.dial(this.fallbackNumber, { timeout: 60 });
        break;
        
      case '4':
        // Voicemail
        twiml.say(
          { voice: 'alice', language: 'it-IT' },
          'Lascia il tuo messaggio dopo il segnale. Ti richiameremo al più presto.'
        );
        twiml.record({
          maxLength: 120,
          action: '/twilio/voicemail-general',
          transcribe: true,
        });
        break;
        
      default:
        // Invalid option, retry
        twiml.redirect('/twilio/ivr-menu');
    }
    
    // Log fallback event
    logger.info('IVR_FALLBACK_USED', {
      shopId,
      callerNumber,
      selection: digit,
      timestamp: new Date().toISOString(),
    });
    
    return twiml.toString();
  }

  /**
   * Check if fallback should be triggered based on latency
   */
  shouldTriggerFallback(latencyMs, error = null) {
    // Trigger if latency > 2.5s
    if (latencyMs > 2500) {
      return { trigger: true, reason: 'LATENCY_TIMEOUT' };
    }
    
    // Trigger on specific errors
    if (error) {
      const triggerErrors = [
        'VAPI_CONNECTION_ERROR',
        'VAPI_TIMEOUT',
        'VAPI_SERVICE_UNAVAILABLE',
        'WEBHOOK_TIMEOUT',
      ];
      
      if (triggerErrors.some(e => error.message?.includes(e))) {
        return { trigger: true, reason: 'SERVICE_ERROR' };
      }
    }
    
    return { trigger: false };
  }

  /**
   * Send SMS recap after call drop
   */
  async sendSMSRecap(phoneNumber, callData) {
    try {
      const message = await this.twilio.messages.create({
        body: `Grazie per aver chiamato. Per prenotazioni: rispondi con DATA e ORA preferiti. ` +
              `Per emergenze: chiama ${this.fallbackNumber}`,
        from: process.env.TWILIO_SMS_NUMBER,
        to: phoneNumber,
      });
      
      logger.info('SMS_RECAP_SENT', {
        phoneNumber,
        messageSid: message.sid,
      });
      
      return message;
    } catch (error) {
      logger.error('SMS_RECAP_FAILED', { error: error.message, phoneNumber });
      throw error;
    }
  }
}

module.exports = IVRFallback;
