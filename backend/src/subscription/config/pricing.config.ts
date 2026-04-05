/**
 * PRICING CONFIGURATION
 *
 * Centralized pricing configuration for MechMind OS
 * Easy to modify prices, features, and limits
 */

import { SubscriptionPlan, FeatureFlag } from '@prisma/client';

// ==========================================
// PRICING TIERS
// ==========================================

export interface PlanPricing {
  id: SubscriptionPlan;
  name: string;
  nameIt: string; // Italian name
  description: string;
  monthlyPrice: number;
  yearlyPrice: number; // With discount applied
  yearlyDiscountPercent: number;
  stripePriceId?: string; // Set via environment
  isCustomPricing: boolean;
}

export const PLAN_PRICING: Record<SubscriptionPlan, PlanPricing> = {
  [SubscriptionPlan.SMALL]: {
    id: SubscriptionPlan.SMALL,
    name: 'Starter',
    nameIt: 'Starter',
    description: 'Per officine con 1-3 dipendenti, 1 sede',
    monthlyPrice: 39.0,
    yearlyPrice: 399.0, // €39 * 12 * 0.85 (15% discount)
    yearlyDiscountPercent: 15,
    stripePriceId: process.env.STRIPE_PRICE_SMALL,
    isCustomPricing: false,
  },
  [SubscriptionPlan.MEDIUM]: {
    id: SubscriptionPlan.MEDIUM,
    name: 'Pro',
    nameIt: 'Pro',
    description: 'Per officine in crescita (4-10 dipendenti, fino a 3 sedi)',
    monthlyPrice: 89.0,
    yearlyPrice: 899.0, // €89 * 12 * 0.84 (16% discount)
    yearlyDiscountPercent: 16,
    stripePriceId: process.env.STRIPE_PRICE_MEDIUM,
    isCustomPricing: false,
  },
  [SubscriptionPlan.ENTERPRISE]: {
    id: SubscriptionPlan.ENTERPRISE,
    name: 'Enterprise',
    nameIt: 'Enterprise',
    description: 'Per grandi operazioni (10+ dipendenti, sedi illimitate)',
    monthlyPrice: 249.0,
    yearlyPrice: 2499.0, // €249 * 12 * 0.84 (16% discount)
    yearlyDiscountPercent: 16,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
    isCustomPricing: false,
  },
  [SubscriptionPlan.TRIAL]: {
    id: SubscriptionPlan.TRIAL,
    name: 'Trial',
    nameIt: 'Prova',
    description: '14 giorni di prova gratuita con accesso completo',
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyDiscountPercent: 0,
    stripePriceId: undefined,
    isCustomPricing: false,
  },
};

// ==========================================
// AI ADD-ON
// ==========================================

export const AI_ADDON = {
  name: 'AI Inspections',
  nameIt: 'Ispezioni AI',
  description: 'Ispezioni veicoli potenziate da AI con rilevamento danni automatico',
  monthlyPrice: 29.0,
  yearlyPrice: 295.0, // €29 * 12 * 0.85
  stripePriceId: process.env.STRIPE_PRICE_AI_ADDON,
};

// ==========================================
// VOICE AI ADD-ON (ElevenLabs + Vapi)
// ==========================================

export let VOICE_ADDON = {
  name: 'Voice AI Assistant',
  nameIt: 'Assistente Vocale AI',
  description:
    'Assistente vocale AI per rispondere alle chiamate e prenotare appuntamenti (ElevenLabs + Vapi)',
  monthlyPrice: 49.0, // 100 minuti inclusi
  yearlyPrice: 499.0, // €49 * 12 * 0.85
  includedMinutes: 100,
  extraMinutePrice: 0.4, // €0.40/min oltre i 100 inclusi
  costPerMinute: 0.14, // Costo reale medio Vapi+ElevenLabs+Deepgram+Groq (aggiornato Q1 2026)
  stripePriceId: process.env.STRIPE_PRICE_VOICE_ADDON,
  enterpriseIncludedMinutes: 100,
};

/** Aggiorna VOICE_ADDON con pricing ricalcolato dal VoicePricingService */
export function updateVoiceAddonPricing(updated: Partial<typeof VOICE_ADDON>): void {
  VOICE_ADDON = { ...VOICE_ADDON, ...updated };
}

// ==========================================
// PLAN LIMITS
// ==========================================

export interface PlanLimits {
  maxUsers: number | null;
  maxLocations: number | null;
  maxApiCallsPerMonth: number | null; // null = unlimited
  maxStorageBytes: number | null; // null = unlimited
  maxCustomers: number | null;
  maxInspectionsPerMonth: number | null;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  [SubscriptionPlan.TRIAL]: {
    maxUsers: 3,
    maxLocations: 1,
    maxApiCallsPerMonth: 1000,
    maxStorageBytes: 5 * 1024 * 1024 * 1024, // 5GB
    maxCustomers: 100,
    maxInspectionsPerMonth: 50,
  },
  [SubscriptionPlan.SMALL]: {
    maxUsers: 5,
    maxLocations: 1,
    maxApiCallsPerMonth: 10000,
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10GB
    maxCustomers: 500,
    maxInspectionsPerMonth: 200,
  },
  [SubscriptionPlan.MEDIUM]: {
    maxUsers: 15,
    maxLocations: 3,
    maxApiCallsPerMonth: 50000,
    maxStorageBytes: 50 * 1024 * 1024 * 1024, // 50GB
    maxCustomers: 5000,
    maxInspectionsPerMonth: 1000,
  },
  [SubscriptionPlan.ENTERPRISE]: {
    maxUsers: null, // Unlimited
    maxLocations: null, // Unlimited
    maxApiCallsPerMonth: null, // Unlimited
    maxStorageBytes: null, // Unlimited
    maxCustomers: null, // Unlimited
    maxInspectionsPerMonth: null, // Unlimited
  },
};

// ==========================================
// FEATURE AVAILABILITY BY PLAN
// ==========================================

export const PLAN_FEATURES: Record<SubscriptionPlan, FeatureFlag[]> = {
  [SubscriptionPlan.TRIAL]: [
    FeatureFlag.AI_INSPECTIONS,
    FeatureFlag.API_ACCESS,
    FeatureFlag.ADVANCED_REPORTS,
    FeatureFlag.OBD_INTEGRATION,
    FeatureFlag.INVENTORY_MANAGEMENT,
  ],
  [SubscriptionPlan.SMALL]: [FeatureFlag.OBD_INTEGRATION, FeatureFlag.INVENTORY_MANAGEMENT],
  [SubscriptionPlan.MEDIUM]: [
    FeatureFlag.MULTI_LOCATION,
    FeatureFlag.API_ACCESS,
    FeatureFlag.ADVANCED_REPORTS,
    FeatureFlag.OBD_INTEGRATION,
    FeatureFlag.INVENTORY_MANAGEMENT,
    FeatureFlag.CUSTOM_BRANDING,
    FeatureFlag.PRIORITY_SUPPORT,
  ],
  [SubscriptionPlan.ENTERPRISE]: [
    FeatureFlag.AI_INSPECTIONS,
    FeatureFlag.MULTI_LOCATION,
    FeatureFlag.API_ACCESS,
    FeatureFlag.ADVANCED_REPORTS,
    FeatureFlag.CUSTOM_BRANDING,
    FeatureFlag.PRIORITY_SUPPORT,
    FeatureFlag.WHITE_LABEL,
    FeatureFlag.BLOCKCHAIN_VERIFICATION,
    FeatureFlag.OBD_INTEGRATION,
    FeatureFlag.INVENTORY_MANAGEMENT,
    FeatureFlag.CUSTOM_INTEGRATIONS,
    FeatureFlag.DEDICATED_MANAGER,
    FeatureFlag.SLA_GUARANTEE,
    // VOICE_ASSISTANT NOT included — requires Voice AI add-on (€39/mese)
    // Enterprise gets 100 min included when Voice add-on is active
  ],
};

// Features that require AI add-on (in addition to base plan)
export const AI_ADDON_FEATURES: FeatureFlag[] = [FeatureFlag.AI_INSPECTIONS];

// Features that require Voice add-on (separate from AI add-on)
export const VOICE_ADDON_FEATURES: FeatureFlag[] = [FeatureFlag.VOICE_ASSISTANT];

// ==========================================
// FEATURE DETAILS
// ==========================================

export interface FeatureDetail {
  flag: FeatureFlag;
  name: string;
  description: string;
  icon?: string;
  requiresAiAddon?: boolean;
}

export const FEATURE_DETAILS: Record<FeatureFlag, FeatureDetail> = {
  [FeatureFlag.AI_INSPECTIONS]: {
    flag: FeatureFlag.AI_INSPECTIONS,
    name: 'AI Vehicle Inspections',
    description: 'AI-powered damage detection and inspection analysis',
    icon: 'brain',
    requiresAiAddon: true,
  },
  [FeatureFlag.MULTI_LOCATION]: {
    flag: FeatureFlag.MULTI_LOCATION,
    name: 'Multi-Location Support',
    description: 'Manage multiple workshop locations',
    icon: 'building-2',
  },
  [FeatureFlag.API_ACCESS]: {
    flag: FeatureFlag.API_ACCESS,
    name: 'API Access',
    description: 'Full REST API access for integrations',
    icon: 'code',
  },
  [FeatureFlag.ADVANCED_REPORTS]: {
    flag: FeatureFlag.ADVANCED_REPORTS,
    name: 'Advanced Analytics',
    description: 'Detailed reports and business insights',
    icon: 'bar-chart-3',
  },
  [FeatureFlag.CUSTOM_BRANDING]: {
    flag: FeatureFlag.CUSTOM_BRANDING,
    name: 'Custom Branding',
    description: 'Add your logo and customize colors',
    icon: 'palette',
  },
  [FeatureFlag.PRIORITY_SUPPORT]: {
    flag: FeatureFlag.PRIORITY_SUPPORT,
    name: 'Priority Support',
    description: 'Priority email and chat support',
    icon: 'headphones',
  },
  [FeatureFlag.WHITE_LABEL]: {
    flag: FeatureFlag.WHITE_LABEL,
    name: 'White Label',
    description: 'Remove MechMind branding',
    icon: 'eye-off',
  },
  [FeatureFlag.BLOCKCHAIN_VERIFICATION]: {
    flag: FeatureFlag.BLOCKCHAIN_VERIFICATION,
    name: 'Blockchain Verification',
    description: 'Tamper-proof inspection certificates',
    icon: 'shield-check',
  },
  [FeatureFlag.VOICE_ASSISTANT]: {
    flag: FeatureFlag.VOICE_ASSISTANT,
    name: 'Voice AI Assistant',
    description: 'AI voice assistant for customer calls',
    icon: 'mic',
    requiresAiAddon: true,
  },
  [FeatureFlag.OBD_INTEGRATION]: {
    flag: FeatureFlag.OBD_INTEGRATION,
    name: 'OBD Integration',
    description: 'Connect OBD devices for diagnostics',
    icon: 'activity',
  },
  [FeatureFlag.INVENTORY_MANAGEMENT]: {
    flag: FeatureFlag.INVENTORY_MANAGEMENT,
    name: 'Inventory Management',
    description: 'Track parts and manage stock',
    icon: 'package',
  },
  [FeatureFlag.CUSTOM_INTEGRATIONS]: {
    flag: FeatureFlag.CUSTOM_INTEGRATIONS,
    name: 'Custom Integrations',
    description: 'Custom third-party integrations',
    icon: 'plug',
  },
  [FeatureFlag.DEDICATED_MANAGER]: {
    flag: FeatureFlag.DEDICATED_MANAGER,
    name: 'Dedicated Account Manager',
    description: 'Personal account manager',
    icon: 'user-cog',
  },
  [FeatureFlag.SLA_GUARANTEE]: {
    flag: FeatureFlag.SLA_GUARANTEE,
    name: 'SLA Guarantee',
    description: '99.9% uptime guarantee with SLA',
    icon: 'clock',
  },
};

// ==========================================
// USAGE WARNING THRESHOLDS
// ==========================================

export const USAGE_WARNING_THRESHOLDS = {
  apiCalls: [0.7, 0.85, 0.95], // Warn at 70%, 85%, 95%
  storage: [0.7, 0.85, 0.95],
  users: [0.8, 0.9, 1.0],
  locations: [0.8, 0.9, 1.0],
  customers: [0.8, 0.9, 0.95],
  inspections: [0.8, 0.9, 0.95],
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export function getPlanPrice(plan: SubscriptionPlan, billingCycle: 'monthly' | 'yearly'): number {
  const pricing = PLAN_PRICING[plan];
  if (pricing.isCustomPricing) return 0;
  return billingCycle === 'yearly' ? pricing.yearlyPrice : pricing.monthlyPrice;
}

export function getFormattedPrice(
  plan: SubscriptionPlan,
  billingCycle: 'monthly' | 'yearly',
): string {
  const price = getPlanPrice(plan, billingCycle);
  if (PLAN_PRICING[plan].isCustomPricing) {
    return 'Custom';
  }
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(billingCycle === 'yearly' ? price / 12 : price);
}

export function calculateProratedAmount(
  oldPlan: SubscriptionPlan,
  newPlan: SubscriptionPlan,
  billingCycle: 'monthly' | 'yearly',
  daysRemaining: number,
  daysInPeriod: number = 30,
): number {
  const oldPrice = getPlanPrice(oldPlan, billingCycle);
  const newPrice = getPlanPrice(newPlan, billingCycle);

  const remainingValue = (oldPrice / daysInPeriod) * daysRemaining;
  const newValue = (newPrice / daysInPeriod) * daysRemaining;

  return Math.round((newValue - remainingValue) * 100) / 100;
}

export function getFeaturesForPlan(
  plan: SubscriptionPlan,
  hasAiAddon: boolean,
  hasVoiceAddon: boolean = false,
): FeatureFlag[] {
  const baseFeatures = [...PLAN_FEATURES[plan]];

  if (hasAiAddon) {
    baseFeatures.push(...AI_ADDON_FEATURES);
  }

  if (hasVoiceAddon) {
    baseFeatures.push(...VOICE_ADDON_FEATURES);
  }

  return [...new Set(baseFeatures)];
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function getLimitDisplayValue(limit: number | null): string {
  if (limit === null) return 'Unlimited';
  return limit.toLocaleString('it-IT');
}
