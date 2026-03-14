import {
  PLAN_PRICING,
  PLAN_LIMITS,
  PLAN_FEATURES,
  AI_ADDON,
  AI_ADDON_FEATURES,
  FEATURE_DETAILS,
  USAGE_WARNING_THRESHOLDS,
  getPlanPrice,
  getFormattedPrice,
  calculateProratedAmount,
  getFeaturesForPlan,
  formatBytes,
  getLimitDisplayValue,
} from './pricing.config';

// Mock Prisma enums
jest.mock('@prisma/client', () => ({
  ...(jest.requireActual('@prisma/client') as Record<string, unknown>),
  SubscriptionPlan: {
    TRIAL: 'TRIAL',
    SMALL: 'SMALL',
    MEDIUM: 'MEDIUM',
    ENTERPRISE: 'ENTERPRISE',
  },
  FeatureFlag: {
    AI_INSPECTIONS: 'AI_INSPECTIONS',
    MULTI_LOCATION: 'MULTI_LOCATION',
    API_ACCESS: 'API_ACCESS',
    ADVANCED_REPORTS: 'ADVANCED_REPORTS',
    CUSTOM_BRANDING: 'CUSTOM_BRANDING',
    PRIORITY_SUPPORT: 'PRIORITY_SUPPORT',
    WHITE_LABEL: 'WHITE_LABEL',
    BLOCKCHAIN_VERIFICATION: 'BLOCKCHAIN_VERIFICATION',
    VOICE_ASSISTANT: 'VOICE_ASSISTANT',
    OBD_INTEGRATION: 'OBD_INTEGRATION',
    INVENTORY_MANAGEMENT: 'INVENTORY_MANAGEMENT',
    CUSTOM_INTEGRATIONS: 'CUSTOM_INTEGRATIONS',
    DEDICATED_MANAGER: 'DEDICATED_MANAGER',
    SLA_GUARANTEE: 'SLA_GUARANTEE',
  },
}));

describe('PricingConfig', () => {
  describe('PLAN_PRICING', () => {
    it('should define pricing for all plans', () => {
      expect(PLAN_PRICING['TRIAL']).toBeDefined();
      expect(PLAN_PRICING['SMALL']).toBeDefined();
      expect(PLAN_PRICING['MEDIUM']).toBeDefined();
      expect(PLAN_PRICING['ENTERPRISE']).toBeDefined();
    });

    it('should have ENTERPRISE as custom pricing', () => {
      expect(PLAN_PRICING['ENTERPRISE'].isCustomPricing).toBe(true);
      expect(PLAN_PRICING['ENTERPRISE'].monthlyPrice).toBe(0);
    });

    it('should have TRIAL as free', () => {
      expect(PLAN_PRICING['TRIAL'].monthlyPrice).toBe(0);
      expect(PLAN_PRICING['TRIAL'].yearlyPrice).toBe(0);
    });

    it('should have SMALL pricing set', () => {
      expect(PLAN_PRICING['SMALL'].monthlyPrice).toBe(100.0);
      expect(PLAN_PRICING['SMALL'].yearlyPrice).toBe(1020.0);
    });
  });

  describe('PLAN_LIMITS', () => {
    it('should define limits for all plans', () => {
      expect(PLAN_LIMITS['TRIAL']).toBeDefined();
      expect(PLAN_LIMITS['SMALL']).toBeDefined();
      expect(PLAN_LIMITS['MEDIUM']).toBeDefined();
      expect(PLAN_LIMITS['ENTERPRISE']).toBeDefined();
    });

    it('should have unlimited limits for ENTERPRISE', () => {
      const enterprise = PLAN_LIMITS['ENTERPRISE'];
      expect(enterprise.maxUsers).toBeNull();
      expect(enterprise.maxLocations).toBeNull();
      expect(enterprise.maxApiCallsPerMonth).toBeNull();
      expect(enterprise.maxStorageBytes).toBeNull();
    });
  });

  describe('PLAN_FEATURES', () => {
    it('should have features for all plans', () => {
      expect(PLAN_FEATURES['TRIAL'].length).toBeGreaterThan(0);
      expect(PLAN_FEATURES['SMALL'].length).toBeGreaterThan(0);
      expect(PLAN_FEATURES['MEDIUM'].length).toBeGreaterThan(0);
      expect(PLAN_FEATURES['ENTERPRISE'].length).toBeGreaterThan(0);
    });

    it('should have ENTERPRISE with the most features', () => {
      expect(PLAN_FEATURES['ENTERPRISE'].length).toBeGreaterThan(PLAN_FEATURES['SMALL'].length);
    });
  });

  describe('AI_ADDON', () => {
    it('should have pricing defined', () => {
      expect(AI_ADDON.monthlyPrice).toBe(200.0);
      expect(AI_ADDON.yearlyPrice).toBe(2040.0);
    });
  });

  describe('AI_ADDON_FEATURES', () => {
    it('should contain AI-specific features', () => {
      expect(AI_ADDON_FEATURES).toContain('AI_INSPECTIONS');
      expect(AI_ADDON_FEATURES).toContain('VOICE_ASSISTANT');
    });
  });

  describe('FEATURE_DETAILS', () => {
    it('should have details for all feature flags', () => {
      expect(Object.keys(FEATURE_DETAILS).length).toBe(14);
    });

    it('should mark AI features as requiring addon', () => {
      expect(FEATURE_DETAILS['AI_INSPECTIONS'].requiresAiAddon).toBe(true);
      expect(FEATURE_DETAILS['VOICE_ASSISTANT'].requiresAiAddon).toBe(true);
    });

    it('should not mark non-AI features as requiring addon', () => {
      expect(FEATURE_DETAILS['API_ACCESS'].requiresAiAddon).toBeUndefined();
    });
  });

  describe('USAGE_WARNING_THRESHOLDS', () => {
    it('should define thresholds for all resource types', () => {
      expect(USAGE_WARNING_THRESHOLDS.apiCalls).toEqual([0.7, 0.85, 0.95]);
      expect(USAGE_WARNING_THRESHOLDS.storage).toEqual([0.7, 0.85, 0.95]);
      expect(USAGE_WARNING_THRESHOLDS.users).toEqual([0.8, 0.9, 1.0]);
    });
  });

  // ==========================================
  // HELPER FUNCTIONS — covers lines 298-360
  // ==========================================

  describe('getPlanPrice', () => {
    it('should return monthly price for non-custom plans', () => {
      expect(getPlanPrice('SMALL' as never, 'monthly')).toBe(100.0);
    });

    it('should return yearly price for non-custom plans', () => {
      expect(getPlanPrice('SMALL' as never, 'yearly')).toBe(1020.0);
    });

    it('should return 0 for ENTERPRISE (custom pricing)', () => {
      expect(getPlanPrice('ENTERPRISE' as never, 'monthly')).toBe(0);
      expect(getPlanPrice('ENTERPRISE' as never, 'yearly')).toBe(0);
    });

    it('should return 0 for TRIAL', () => {
      expect(getPlanPrice('TRIAL' as never, 'monthly')).toBe(0);
    });
  });

  describe('getFormattedPrice', () => {
    it('should return "Custom" for ENTERPRISE plan (lines 308-311)', () => {
      const result = getFormattedPrice('ENTERPRISE' as never, 'monthly');
      expect(result).toBe('Custom');
    });

    it('should return formatted EUR price for monthly SMALL plan (lines 312-315)', () => {
      const result = getFormattedPrice('SMALL' as never, 'monthly');
      // Italian format: €100,00 or 100,00 € depending on locale
      expect(result).toContain('100');
    });

    it('should return formatted EUR price for yearly SMALL plan divided by 12 (line 315)', () => {
      const result = getFormattedPrice('SMALL' as never, 'yearly');
      // 1020 / 12 = 85
      expect(result).toContain('85');
    });

    it('should return "Custom" for ENTERPRISE yearly as well', () => {
      const result = getFormattedPrice('ENTERPRISE' as never, 'yearly');
      expect(result).toBe('Custom');
    });
  });

  describe('calculateProratedAmount', () => {
    it('should calculate prorated upgrade cost', () => {
      const result = calculateProratedAmount(
        'SMALL' as never,
        'MEDIUM' as never,
        'monthly',
        15,
        30,
      );
      // oldPrice=100, newPrice=390.9
      // remainingValue = (100/30)*15 = 50
      // newValue = (390.9/30)*15 = 195.45
      // diff = 145.45
      expect(result).toBeCloseTo(145.45, 1);
    });

    it('should return negative value for downgrade', () => {
      const result = calculateProratedAmount(
        'MEDIUM' as never,
        'SMALL' as never,
        'monthly',
        15,
        30,
      );
      expect(result).toBeLessThan(0);
    });

    it('should return 0 when same plan', () => {
      const result = calculateProratedAmount('SMALL' as never, 'SMALL' as never, 'monthly', 15, 30);
      expect(result).toBe(0);
    });

    it('should use default daysInPeriod of 30', () => {
      const result = calculateProratedAmount('SMALL' as never, 'MEDIUM' as never, 'monthly', 15);
      expect(result).toBeCloseTo(145.45, 1);
    });
  });

  describe('getFeaturesForPlan', () => {
    it('should return base features without AI addon (lines 334-341)', () => {
      const features = getFeaturesForPlan('SMALL' as never, false);
      expect(features).toEqual(PLAN_FEATURES['SMALL']);
      expect(features).not.toContain('AI_INSPECTIONS');
    });

    it('should include AI addon features when hasAiAddon is true (lines 337-339)', () => {
      const features = getFeaturesForPlan('SMALL' as never, true);
      expect(features).toContain('AI_INSPECTIONS');
      expect(features).toContain('VOICE_ASSISTANT');
      expect(features).toContain('OBD_INTEGRATION');
    });

    it('should deduplicate features when AI addon overlaps base plan (line 341)', () => {
      // ENTERPRISE already has AI_INSPECTIONS in base features
      const features = getFeaturesForPlan('ENTERPRISE' as never, true);
      const aiInspectionCount = features.filter(f => f === 'AI_INSPECTIONS').length;
      expect(aiInspectionCount).toBe(1);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly (lines 344-355)', () => {
      expect(formatBytes(0)).toBe('0.00 B');
      expect(formatBytes(500)).toBe('500.00 B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(2048)).toBe('2.00 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('should format terabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB');
    });

    it('should stop at TB even for larger values (line 349 boundary)', () => {
      const petabyte = 1024 * 1024 * 1024 * 1024 * 1024;
      const result = formatBytes(petabyte);
      expect(result).toBe('1024.00 TB');
    });
  });

  describe('getLimitDisplayValue', () => {
    it('should return "Unlimited" for null (lines 357-358)', () => {
      expect(getLimitDisplayValue(null)).toBe('Unlimited');
    });

    it('should return formatted number for non-null (line 359)', () => {
      const result = getLimitDisplayValue(1000);
      // Italian locale uses dot as thousands separator
      expect(result).toMatch(/1[.\s]?000/);
    });

    it('should return "0" for zero', () => {
      expect(getLimitDisplayValue(0)).toBe('0');
    });
  });
});
