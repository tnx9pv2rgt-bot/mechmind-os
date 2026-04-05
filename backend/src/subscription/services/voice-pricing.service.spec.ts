import { Test, TestingModule } from '@nestjs/testing';
import { VoicePricingService } from './voice-pricing.service';
import { PrismaService } from '../../common/services/prisma.service';
import {
  VOICE_PROVIDER_COSTS,
  VOICE_PRICING_STRATEGY,
} from '../config/voice-provider-costs.config';
import { VOICE_ADDON, updateVoiceAddonPricing } from '../config/pricing.config';

describe('VoicePricingService', () => {
  let service: VoicePricingService;

  const mockPrisma = {
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'test-log' }),
    },
  };

  // Save originals to restore after tests
  const originalMonthlyPrice = VOICE_ADDON.monthlyPrice;
  const originalExtraPrice = VOICE_ADDON.extraMinutePrice;
  const originalCosts = VOICE_PROVIDER_COSTS.map(p => ({
    ...p,
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoicePricingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<VoicePricingService>(VoicePricingService);

    // Reset to original values
    updateVoiceAddonPricing({
      monthlyPrice: originalMonthlyPrice,
      extraMinutePrice: originalExtraPrice,
    });
    VOICE_PROVIDER_COSTS.forEach((p, i) => {
      p.costPerMinuteUsd = originalCosts[i].costPerMinuteUsd;
      p.lastUpdated = originalCosts[i].lastUpdated;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateOptimalPricing', () => {
    it('should calculate total cost per minute from all providers', () => {
      const result = service.calculateOptimalPricing();

      const expectedTotalUsd = VOICE_PROVIDER_COSTS.reduce((sum, p) => sum + p.costPerMinuteUsd, 0);

      expect(result.costPerMinuteUsd).toBeCloseTo(expectedTotalUsd, 3);
      expect(result.costPerMinuteEur).toBeLessThan(result.costPerMinuteUsd);
    });

    it('should return current margin percent', () => {
      const result = service.calculateOptimalPricing();

      expect(result.currentMarginPercent).toBeGreaterThan(0);
      expect(result.currentMarginPercent).toBeLessThan(1);
    });

    it('should recommend price within floor/ceiling', () => {
      const result = service.calculateOptimalPricing();

      expect(result.recommendedMonthlyPrice).toBeGreaterThanOrEqual(
        VOICE_PRICING_STRATEGY.minimumMonthlyPrice,
      );
      expect(result.recommendedMonthlyPrice).toBeLessThanOrEqual(
        VOICE_PRICING_STRATEGY.maximumMonthlyPrice,
      );
    });

    it('should flag price change when margin is below minimum', () => {
      // Simulare costi altissimi
      VOICE_PROVIDER_COSTS[0].costPerMinuteUsd = 1.0; // Vapi a $1/min
      VOICE_PROVIDER_COSTS[0].lastUpdated = new Date().toISOString().split('T')[0];

      const result = service.calculateOptimalPricing();

      expect(result.priceChangeRequired).toBe(true);
      expect(result.priceChangeDirection).toBe('up');
    });

    it('should flag price change when margin is above maximum', () => {
      // Simulare costi bassissimi
      VOICE_PROVIDER_COSTS.forEach(p => {
        p.costPerMinuteUsd = 0.001;
        p.lastUpdated = new Date().toISOString().split('T')[0];
      });

      const result = service.calculateOptimalPricing();

      expect(result.currentMarginPercent).toBeGreaterThan(
        VOICE_PRICING_STRATEGY.maximumMarginPercent,
      );
      expect(result.priceChangeRequired).toBe(true);
    });

    it('should not flag price change when margin is in acceptable range', () => {
      const result = service.calculateOptimalPricing();

      // Con i costi attuali, il margine dovrebbe essere OK
      if (
        result.currentMarginPercent >= VOICE_PRICING_STRATEGY.minimumMarginPercent &&
        result.currentMarginPercent <= VOICE_PRICING_STRATEGY.maximumMarginPercent
      ) {
        expect(result.priceChangeRequired).toBe(false);
      }
    });
  });

  describe('updateProviderCost', () => {
    it('should update an existing provider cost', () => {
      const result = service.updateProviderCost('Vapi', 0.08);

      expect(result).not.toBeNull();
      expect(result!.costPerMinuteUsd).toBe(0.08);
    });

    it('should return null for unknown provider', () => {
      const result = service.updateProviderCost('UnknownProvider', 0.1);

      expect(result).toBeNull();
    });

    it('should update lastUpdated date', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = service.updateProviderCost('Deepgram', 0.01);

      expect(result!.lastUpdated).toBe(today);
    });
  });

  describe('applyPricing', () => {
    it('should update VOICE_ADDON with new prices', () => {
      const result = service.applyPricing(59, 0.45);

      expect(result.monthlyPrice).toBe(59);
      expect(result.extraMinutePrice).toBe(0.45);
      expect(result.yearlyPrice).toBeCloseTo(59 * 12 * 0.85, 0);
    });
  });

  describe('quarterlyReview', () => {
    it('should log pricing review in audit log', async () => {
      await service.quarterlyReview();

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'VOICE_PRICING_REVIEW',
            tableName: 'voice_pricing',
            recordId: 'voice-addon',
            tenantId: 'system',
            performedBy: 'system',
          }),
        }),
      );
    });

    it('should not apply changes when autoApply is false', async () => {
      const originalPrice = VOICE_ADDON.monthlyPrice;
      const result = await service.quarterlyReview();

      expect(result.applied).toBe(false);
      expect(VOICE_ADDON.monthlyPrice).toBe(originalPrice);
    });

    it('should warn when costs are stale', async () => {
      // Imposta date vecchie
      VOICE_PROVIDER_COSTS.forEach(p => {
        p.lastUpdated = '2025-01-01';
      });

      const result = await service.quarterlyReview();

      expect(result.calculation.costsStale).toBe(true);
      expect(result.applied).toBe(false);
      expect(result.reason).toContain('stale');
    });
  });
});
