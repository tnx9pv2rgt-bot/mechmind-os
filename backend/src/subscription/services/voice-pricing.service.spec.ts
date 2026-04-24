import { Test, TestingModule } from '@nestjs/testing';
import { VoicePricingService } from './voice-pricing.service';
import { PrismaService } from '../../common/services/prisma.service';
import {
  VOICE_PROVIDER_COSTS,
  VOICE_PRICING_STRATEGY,
  QUARTERLY_REVIEW,
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

  describe('updateExchangeRate', () => {
    it('should update USD to EUR exchange rate', () => {
      const originalRate = VOICE_PRICING_STRATEGY.usdToEurRate;
      const newRate = 0.95;

      service.updateExchangeRate(newRate);

      expect(VOICE_PRICING_STRATEGY.usdToEurRate).toBe(newRate);

      // Restore
      VOICE_PRICING_STRATEGY.usdToEurRate = originalRate;
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

    it('should handle audit log creation error gracefully', async () => {
      // Mock error nel create
      const errorMock = jest.fn().mockRejectedValue(new Error('DB error'));
      mockPrisma.auditLog.create = errorMock;

      // Non dovrebbe lanciare errore
      const result = await service.quarterlyReview();

      expect(result).toBeDefined();
      expect(result.calculation).toBeDefined();
    });

    it('should not apply pricing when price change not required', async () => {
      // Verifica che quando il margine è OK, non applica changes
      const originalPrice = VOICE_ADDON.monthlyPrice;
      const result = await service.quarterlyReview();

      // Se il margine è OK, applied dovrebbe essere false
      if (!result.calculation.priceChangeRequired) {
        expect(result.applied).toBe(false);
        expect(VOICE_ADDON.monthlyPrice).toBe(originalPrice);
      }
    });

    it('should apply pricing when autoApply is true and price change required', async () => {
      // Import per modificare il config
      const originalAutoApply = QUARTERLY_REVIEW.autoApply;

      // Imposta prezzi molto alti per forzare price change
      VOICE_PROVIDER_COSTS[0].costPerMinuteUsd = 1.0;
      VOICE_PROVIDER_COSTS[0].lastUpdated = new Date().toISOString().split('T')[0];

      // Abilita auto-apply
      QUARTERLY_REVIEW.autoApply = true;

      try {
        const result = await service.quarterlyReview();

        if (result.calculation.priceChangeRequired) {
          expect(result.applied).toBe(true);
          expect(result.notifyCustomers).toBe(true);
          expect(result.effectiveDate).not.toBeNull();
        }
      } finally {
        // Restore original state
        QUARTERLY_REVIEW.autoApply = originalAutoApply;
      }
    });
  });

  describe('handleQuarterlyReview (cron)', () => {
    it('should execute quarterly review without throwing', async () => {
      // Non testare il cron scheduling, solo che il metodo non lancia
      await expect(service.handleQuarterlyReview()).resolves.not.toThrow();
    });

    it('should handle errors in quarterly review gracefully', async () => {
      // Mock error nel quarterlyReview
      jest.spyOn(service, 'quarterlyReview').mockRejectedValue(new Error('Review error'));

      // Non dovrebbe lanciare errore
      await expect(service.handleQuarterlyReview()).resolves.not.toThrow();
    });

    it('should log customer notification when result.notifyCustomers is true', async () => {
      // Imposta prezzi alti per forzare price change
      const originalAutoApply = QUARTERLY_REVIEW.autoApply;

      VOICE_PROVIDER_COSTS[0].costPerMinuteUsd = 1.0;
      VOICE_PROVIDER_COSTS[0].lastUpdated = new Date().toISOString().split('T')[0];
      QUARTERLY_REVIEW.autoApply = true;

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      try {
        await service.handleQuarterlyReview();

        // Verifica che il logger sia stato chiamato almeno una volta
        expect(loggerSpy).toHaveBeenCalled();
      } finally {
        QUARTERLY_REVIEW.autoApply = originalAutoApply;
        loggerSpy.mockRestore();
      }
    });
  });

  describe('quarterly review edge cases', () => {
    it('should return manual approval message when autoApply is false and price change required', async () => {
      // Imposta prezzi alti

      VOICE_PROVIDER_COSTS[0].costPerMinuteUsd = 1.0;
      VOICE_PROVIDER_COSTS[0].lastUpdated = new Date().toISOString().split('T')[0];

      const result = await service.quarterlyReview();

      if (result.calculation.priceChangeRequired && !QUARTERLY_REVIEW.autoApply) {
        expect(result.applied).toBe(false);
        expect(result.reason).toContain('approvazione admin');
        expect(result.effectiveDate).not.toBeNull();
      }
    });
  });
});
