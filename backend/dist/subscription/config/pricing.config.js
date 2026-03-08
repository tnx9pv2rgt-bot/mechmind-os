"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USAGE_WARNING_THRESHOLDS = exports.FEATURE_DETAILS = exports.AI_ADDON_FEATURES = exports.PLAN_FEATURES = exports.PLAN_LIMITS = exports.AI_ADDON = exports.PLAN_PRICING = void 0;
exports.getPlanPrice = getPlanPrice;
exports.getFormattedPrice = getFormattedPrice;
exports.calculateProratedAmount = calculateProratedAmount;
exports.getFeaturesForPlan = getFeaturesForPlan;
exports.formatBytes = formatBytes;
exports.getLimitDisplayValue = getLimitDisplayValue;
const client_1 = require("@prisma/client");
exports.PLAN_PRICING = {
    [client_1.SubscriptionPlan.SMALL]: {
        id: client_1.SubscriptionPlan.SMALL,
        name: 'Small',
        nameIt: 'Piccole',
        description: 'Perfect for small auto repair shops (1-3 employees)',
        monthlyPrice: 100.00,
        yearlyPrice: 1020.00,
        yearlyDiscountPercent: 15,
        stripePriceId: process.env.STRIPE_PRICE_SMALL,
        isCustomPricing: false,
    },
    [client_1.SubscriptionPlan.MEDIUM]: {
        id: client_1.SubscriptionPlan.MEDIUM,
        name: 'Medium',
        nameIt: 'Medie',
        description: 'For growing businesses (4-10 employees, 1-2 locations)',
        monthlyPrice: 390.90,
        yearlyPrice: 3990.00,
        yearlyDiscountPercent: 15,
        stripePriceId: process.env.STRIPE_PRICE_MEDIUM,
        isCustomPricing: false,
    },
    [client_1.SubscriptionPlan.ENTERPRISE]: {
        id: client_1.SubscriptionPlan.ENTERPRISE,
        name: 'Enterprise',
        nameIt: 'Grandi',
        description: 'For large operations (10+ employees, 3+ locations)',
        monthlyPrice: 0,
        yearlyPrice: 0,
        yearlyDiscountPercent: 0,
        stripePriceId: undefined,
        isCustomPricing: true,
    },
    [client_1.SubscriptionPlan.TRIAL]: {
        id: client_1.SubscriptionPlan.TRIAL,
        name: 'Trial',
        nameIt: 'Prova',
        description: '14-day free trial with full access',
        monthlyPrice: 0,
        yearlyPrice: 0,
        yearlyDiscountPercent: 0,
        stripePriceId: undefined,
        isCustomPricing: false,
    },
};
exports.AI_ADDON = {
    name: 'AI Assistant',
    nameIt: 'Assistente AI',
    description: 'AI-powered vehicle inspections and customer insights',
    monthlyPrice: 200.00,
    yearlyPrice: 2040.00,
    stripePriceId: process.env.STRIPE_PRICE_AI_ADDON,
};
exports.PLAN_LIMITS = {
    [client_1.SubscriptionPlan.TRIAL]: {
        maxUsers: 3,
        maxLocations: 1,
        maxApiCallsPerMonth: 1000,
        maxStorageBytes: 5 * 1024 * 1024 * 1024,
        maxCustomers: 100,
        maxInspectionsPerMonth: 50,
    },
    [client_1.SubscriptionPlan.SMALL]: {
        maxUsers: 3,
        maxLocations: 1,
        maxApiCallsPerMonth: 5000,
        maxStorageBytes: 10 * 1024 * 1024 * 1024,
        maxCustomers: 500,
        maxInspectionsPerMonth: 200,
    },
    [client_1.SubscriptionPlan.MEDIUM]: {
        maxUsers: 10,
        maxLocations: 2,
        maxApiCallsPerMonth: 25000,
        maxStorageBytes: 50 * 1024 * 1024 * 1024,
        maxCustomers: 2500,
        maxInspectionsPerMonth: 1000,
    },
    [client_1.SubscriptionPlan.ENTERPRISE]: {
        maxUsers: null,
        maxLocations: null,
        maxApiCallsPerMonth: null,
        maxStorageBytes: null,
        maxCustomers: null,
        maxInspectionsPerMonth: null,
    },
};
exports.PLAN_FEATURES = {
    [client_1.SubscriptionPlan.TRIAL]: [
        client_1.FeatureFlag.AI_INSPECTIONS,
        client_1.FeatureFlag.API_ACCESS,
        client_1.FeatureFlag.ADVANCED_REPORTS,
        client_1.FeatureFlag.OBD_INTEGRATION,
        client_1.FeatureFlag.INVENTORY_MANAGEMENT,
    ],
    [client_1.SubscriptionPlan.SMALL]: [
        client_1.FeatureFlag.OBD_INTEGRATION,
        client_1.FeatureFlag.INVENTORY_MANAGEMENT,
    ],
    [client_1.SubscriptionPlan.MEDIUM]: [
        client_1.FeatureFlag.MULTI_LOCATION,
        client_1.FeatureFlag.API_ACCESS,
        client_1.FeatureFlag.ADVANCED_REPORTS,
        client_1.FeatureFlag.OBD_INTEGRATION,
        client_1.FeatureFlag.INVENTORY_MANAGEMENT,
        client_1.FeatureFlag.CUSTOM_BRANDING,
        client_1.FeatureFlag.PRIORITY_SUPPORT,
    ],
    [client_1.SubscriptionPlan.ENTERPRISE]: [
        client_1.FeatureFlag.AI_INSPECTIONS,
        client_1.FeatureFlag.MULTI_LOCATION,
        client_1.FeatureFlag.API_ACCESS,
        client_1.FeatureFlag.ADVANCED_REPORTS,
        client_1.FeatureFlag.CUSTOM_BRANDING,
        client_1.FeatureFlag.PRIORITY_SUPPORT,
        client_1.FeatureFlag.WHITE_LABEL,
        client_1.FeatureFlag.BLOCKCHAIN_VERIFICATION,
        client_1.FeatureFlag.VOICE_ASSISTANT,
        client_1.FeatureFlag.OBD_INTEGRATION,
        client_1.FeatureFlag.INVENTORY_MANAGEMENT,
        client_1.FeatureFlag.CUSTOM_INTEGRATIONS,
        client_1.FeatureFlag.DEDICATED_MANAGER,
        client_1.FeatureFlag.SLA_GUARANTEE,
    ],
};
exports.AI_ADDON_FEATURES = [
    client_1.FeatureFlag.AI_INSPECTIONS,
    client_1.FeatureFlag.VOICE_ASSISTANT,
];
exports.FEATURE_DETAILS = {
    [client_1.FeatureFlag.AI_INSPECTIONS]: {
        flag: client_1.FeatureFlag.AI_INSPECTIONS,
        name: 'AI Vehicle Inspections',
        description: 'AI-powered damage detection and inspection analysis',
        icon: 'brain',
        requiresAiAddon: true,
    },
    [client_1.FeatureFlag.MULTI_LOCATION]: {
        flag: client_1.FeatureFlag.MULTI_LOCATION,
        name: 'Multi-Location Support',
        description: 'Manage multiple workshop locations',
        icon: 'building-2',
    },
    [client_1.FeatureFlag.API_ACCESS]: {
        flag: client_1.FeatureFlag.API_ACCESS,
        name: 'API Access',
        description: 'Full REST API access for integrations',
        icon: 'code',
    },
    [client_1.FeatureFlag.ADVANCED_REPORTS]: {
        flag: client_1.FeatureFlag.ADVANCED_REPORTS,
        name: 'Advanced Analytics',
        description: 'Detailed reports and business insights',
        icon: 'bar-chart-3',
    },
    [client_1.FeatureFlag.CUSTOM_BRANDING]: {
        flag: client_1.FeatureFlag.CUSTOM_BRANDING,
        name: 'Custom Branding',
        description: 'Add your logo and customize colors',
        icon: 'palette',
    },
    [client_1.FeatureFlag.PRIORITY_SUPPORT]: {
        flag: client_1.FeatureFlag.PRIORITY_SUPPORT,
        name: 'Priority Support',
        description: 'Priority email and chat support',
        icon: 'headphones',
    },
    [client_1.FeatureFlag.WHITE_LABEL]: {
        flag: client_1.FeatureFlag.WHITE_LABEL,
        name: 'White Label',
        description: 'Remove MechMind branding',
        icon: 'eye-off',
    },
    [client_1.FeatureFlag.BLOCKCHAIN_VERIFICATION]: {
        flag: client_1.FeatureFlag.BLOCKCHAIN_VERIFICATION,
        name: 'Blockchain Verification',
        description: 'Tamper-proof inspection certificates',
        icon: 'shield-check',
    },
    [client_1.FeatureFlag.VOICE_ASSISTANT]: {
        flag: client_1.FeatureFlag.VOICE_ASSISTANT,
        name: 'Voice AI Assistant',
        description: 'AI voice assistant for customer calls',
        icon: 'mic',
        requiresAiAddon: true,
    },
    [client_1.FeatureFlag.OBD_INTEGRATION]: {
        flag: client_1.FeatureFlag.OBD_INTEGRATION,
        name: 'OBD Integration',
        description: 'Connect OBD devices for diagnostics',
        icon: 'activity',
    },
    [client_1.FeatureFlag.INVENTORY_MANAGEMENT]: {
        flag: client_1.FeatureFlag.INVENTORY_MANAGEMENT,
        name: 'Inventory Management',
        description: 'Track parts and manage stock',
        icon: 'package',
    },
    [client_1.FeatureFlag.CUSTOM_INTEGRATIONS]: {
        flag: client_1.FeatureFlag.CUSTOM_INTEGRATIONS,
        name: 'Custom Integrations',
        description: 'Custom third-party integrations',
        icon: 'plug',
    },
    [client_1.FeatureFlag.DEDICATED_MANAGER]: {
        flag: client_1.FeatureFlag.DEDICATED_MANAGER,
        name: 'Dedicated Account Manager',
        description: 'Personal account manager',
        icon: 'user-cog',
    },
    [client_1.FeatureFlag.SLA_GUARANTEE]: {
        flag: client_1.FeatureFlag.SLA_GUARANTEE,
        name: 'SLA Guarantee',
        description: '99.9% uptime guarantee with SLA',
        icon: 'clock',
    },
};
exports.USAGE_WARNING_THRESHOLDS = {
    apiCalls: [0.7, 0.85, 0.95],
    storage: [0.7, 0.85, 0.95],
    users: [0.8, 0.9, 1.0],
    locations: [0.8, 0.9, 1.0],
    customers: [0.8, 0.9, 0.95],
    inspections: [0.8, 0.9, 0.95],
};
function getPlanPrice(plan, billingCycle) {
    const pricing = exports.PLAN_PRICING[plan];
    if (pricing.isCustomPricing)
        return 0;
    return billingCycle === 'yearly' ? pricing.yearlyPrice : pricing.monthlyPrice;
}
function getFormattedPrice(plan, billingCycle) {
    const price = getPlanPrice(plan, billingCycle);
    if (exports.PLAN_PRICING[plan].isCustomPricing) {
        return 'Custom';
    }
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
    }).format(billingCycle === 'yearly' ? price / 12 : price);
}
function calculateProratedAmount(oldPlan, newPlan, billingCycle, daysRemaining, daysInPeriod = 30) {
    const oldPrice = getPlanPrice(oldPlan, billingCycle);
    const newPrice = getPlanPrice(newPlan, billingCycle);
    const remainingValue = (oldPrice / daysInPeriod) * daysRemaining;
    const newValue = (newPrice / daysInPeriod) * daysRemaining;
    return Math.round((newValue - remainingValue) * 100) / 100;
}
function getFeaturesForPlan(plan, hasAiAddon) {
    const baseFeatures = [...exports.PLAN_FEATURES[plan]];
    if (hasAiAddon) {
        baseFeatures.push(...exports.AI_ADDON_FEATURES);
    }
    return [...new Set(baseFeatures)];
}
function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}
function getLimitDisplayValue(limit) {
    if (limit === null)
        return 'Unlimited';
    return limit.toLocaleString('it-IT');
}
