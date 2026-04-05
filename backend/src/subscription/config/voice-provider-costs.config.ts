/**
 * VOICE AI PROVIDER COSTS CONFIGURATION
 *
 * Costi reali per minuto dei provider Voice AI.
 * Aggiornati automaticamente ogni trimestre dal VoicePricingService.
 *
 * Fonti prezzi (Q1 2026):
 *  - Vapi:        https://vapi.ai/pricing
 *  - ElevenLabs:  https://elevenlabs.io/pricing/api
 *  - Deepgram:    https://deepgram.com/pricing
 *  - Groq:        https://groq.com/pricing
 *  - Twilio:      https://www.twilio.com/voice/pricing
 */

// ==========================================
// PROVIDER COST PER MINUTE (USD)
// ==========================================

export interface ProviderCost {
  /** Nome del provider */
  name: string;
  /** Ruolo nella pipeline Voice AI */
  role: 'orchestration' | 'tts' | 'stt' | 'llm' | 'telephony';
  /** Costo per minuto in USD */
  costPerMinuteUsd: number;
  /** Data ultimo aggiornamento (ISO) */
  lastUpdated: string;
  /** URL pricing ufficiale */
  pricingUrl: string;
  /** Note */
  notes: string;
}

export const VOICE_PROVIDER_COSTS: ProviderCost[] = [
  {
    name: 'Vapi',
    role: 'orchestration',
    costPerMinuteUsd: 0.05,
    lastUpdated: '2026-03-31',
    pricingUrl: 'https://vapi.ai/pricing',
    notes: 'Base orchestration fee, fisso per tutte le chiamate',
  },
  {
    name: 'ElevenLabs',
    role: 'tts',
    costPerMinuteUsd: 0.072,
    lastUpdated: '2026-03-31',
    pricingUrl: 'https://elevenlabs.io/pricing/api',
    notes: 'Turbo v2.5, ~800 chars/min, $0.06-0.096/1K chars. Media: $0.072/min',
  },
  {
    name: 'Deepgram',
    role: 'stt',
    costPerMinuteUsd: 0.005,
    lastUpdated: '2026-03-31',
    pricingUrl: 'https://deepgram.com/pricing',
    notes: 'Nova-2 streaming, $0.0043-0.0058/min. Media: $0.005/min',
  },
  {
    name: 'Groq',
    role: 'llm',
    costPerMinuteUsd: 0.001,
    lastUpdated: '2026-03-31',
    pricingUrl: 'https://groq.com/pricing',
    notes: 'Llama 3.1 70B, ~800 tokens/min, $0.75-0.99/1M tokens',
  },
  {
    name: 'Twilio',
    role: 'telephony',
    costPerMinuteUsd: 0.02,
    lastUpdated: '2026-03-31',
    pricingUrl: 'https://www.twilio.com/voice/pricing/it',
    notes: 'Chiamate PSTN Italia, inbound + outbound media',
  },
];

// ==========================================
// PRICING STRATEGY
// ==========================================

export interface VoicePricingStrategy {
  /** Margine target minimo (0.6 = 60%) */
  targetMarginPercent: number;
  /** Margine minimo accettabile prima di trigger alert (0.45 = 45%) */
  minimumMarginPercent: number;
  /** Margine massimo — se superato, si puo abbassare il prezzo per competitivita */
  maximumMarginPercent: number;
  /** Tasso cambio USD → EUR */
  usdToEurRate: number;
  /** Arrotondamento prezzo finale (al multiplo piu vicino) */
  priceRoundingStep: number;
  /** Prezzo minimo mensile (floor) */
  minimumMonthlyPrice: number;
  /** Prezzo massimo mensile (ceiling) */
  maximumMonthlyPrice: number;
  /** Minuti inclusi nel pack base */
  includedMinutes: number;
  /** Moltiplicatore per prezzo extra-minuto rispetto al costo */
  extraMinuteMarkup: number;
}

export const VOICE_PRICING_STRATEGY: VoicePricingStrategy = {
  targetMarginPercent: 0.6,
  minimumMarginPercent: 0.45,
  maximumMarginPercent: 0.8,
  usdToEurRate: 0.92, // Aggiornato Q1 2026
  priceRoundingStep: 1, // Arrotonda all'euro
  minimumMonthlyPrice: 39,
  maximumMonthlyPrice: 99,
  includedMinutes: 100,
  extraMinuteMarkup: 2.5, // Prezzo extra = costo * 2.5
};

// ==========================================
// QUARTERLY REVIEW SCHEDULE
// ==========================================

export const QUARTERLY_REVIEW = {
  /** Mesi in cui eseguire la revisione (1=Gen, 4=Apr, 7=Lug, 10=Ott) */
  reviewMonths: [1, 4, 7, 10] as const,
  /** Giorno del mese per la revisione */
  reviewDay: 1,
  /** Cron expression: primo giorno di Gen, Apr, Lug, Ott alle 03:00 UTC */
  cronExpression: '0 3 1 1,4,7,10 *',
  /** Giorni di preavviso ai clienti prima di applicare nuovo prezzo */
  customerNoticeDays: 30,
  /** Se true, applica automaticamente. Se false, richiede approvazione manuale */
  autoApply: false,
};

// ==========================================
// HELPERS
// ==========================================

/** Calcola il costo totale per minuto in USD sommando tutti i provider */
export function calculateTotalCostPerMinuteUsd(): number {
  return VOICE_PROVIDER_COSTS.reduce((sum, p) => sum + p.costPerMinuteUsd, 0);
}

/** Calcola il costo totale per minuto in EUR */
export function calculateTotalCostPerMinuteEur(): number {
  return calculateTotalCostPerMinuteUsd() * VOICE_PRICING_STRATEGY.usdToEurRate;
}

/** Verifica se i costi sono aggiornati (meno di 90 giorni) */
export function areCostsStale(): boolean {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  return VOICE_PROVIDER_COSTS.some(p => new Date(p.lastUpdated) < ninetyDaysAgo);
}
