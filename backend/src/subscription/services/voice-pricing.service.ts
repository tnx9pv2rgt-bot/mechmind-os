import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/services/prisma.service';
import {
  VOICE_PROVIDER_COSTS,
  VOICE_PRICING_STRATEGY,
  QUARTERLY_REVIEW,
  calculateTotalCostPerMinuteEur,
  areCostsStale,
  type ProviderCost,
} from '../config/voice-provider-costs.config';
import { VOICE_ADDON, updateVoiceAddonPricing } from '../config/pricing.config';

export interface PricingCalculation {
  costPerMinuteUsd: number;
  costPerMinuteEur: number;
  recommendedMonthlyPrice: number;
  recommendedExtraMinutePrice: number;
  currentMonthlyPrice: number;
  currentExtraMinutePrice: number;
  currentMarginPercent: number;
  recommendedMarginPercent: number;
  priceChangeRequired: boolean;
  priceChangeDirection: 'up' | 'down' | 'none';
  priceChangeDelta: number;
  providerBreakdown: ProviderCost[];
  costsStale: boolean;
  calculatedAt: string;
}

export interface PricingReviewResult {
  calculation: PricingCalculation;
  applied: boolean;
  reason: string;
  notifyCustomers: boolean;
  effectiveDate: string | null;
}

@Injectable()
export class VoicePricingService {
  private readonly logger = new Logger(VoicePricingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcola il pricing ottimale basato sui costi reali dei provider.
   * NON applica modifiche — solo calcolo.
   */
  calculateOptimalPricing(): PricingCalculation {
    const costPerMinuteUsd = VOICE_PROVIDER_COSTS.reduce((sum, p) => sum + p.costPerMinuteUsd, 0);
    const costPerMinuteEur = costPerMinuteUsd * VOICE_PRICING_STRATEGY.usdToEurRate;

    const { targetMarginPercent, includedMinutes, extraMinuteMarkup } = VOICE_PRICING_STRATEGY;

    // Prezzo mensile = (costo 100 min) / (1 - margine_target)
    const totalCostForIncluded = costPerMinuteEur * includedMinutes;
    let recommendedMonthly = totalCostForIncluded / (1 - targetMarginPercent);

    // Arrotonda
    const step = VOICE_PRICING_STRATEGY.priceRoundingStep;
    recommendedMonthly = Math.ceil(recommendedMonthly / step) * step;

    // Applica floor/ceiling
    recommendedMonthly = Math.max(
      VOICE_PRICING_STRATEGY.minimumMonthlyPrice,
      Math.min(VOICE_PRICING_STRATEGY.maximumMonthlyPrice, recommendedMonthly),
    );

    // Prezzo extra minuto = costo * markup, arrotondato a 0.05
    let recommendedExtra = costPerMinuteEur * extraMinuteMarkup;
    recommendedExtra = Math.ceil(recommendedExtra * 20) / 20; // arrotonda a 0.05

    // Margine attuale
    const currentCostForIncluded = costPerMinuteEur * includedMinutes;
    const currentMargin =
      (VOICE_ADDON.monthlyPrice - currentCostForIncluded) / VOICE_ADDON.monthlyPrice;

    // Margine raccomandato
    const recommendedMargin = (recommendedMonthly - totalCostForIncluded) / recommendedMonthly;

    // Serve un cambio prezzo?
    const priceChangeRequired =
      currentMargin < VOICE_PRICING_STRATEGY.minimumMarginPercent ||
      currentMargin > VOICE_PRICING_STRATEGY.maximumMarginPercent;

    const priceDelta = recommendedMonthly - VOICE_ADDON.monthlyPrice;

    return {
      costPerMinuteUsd,
      costPerMinuteEur: Math.round(costPerMinuteEur * 1000) / 1000,
      recommendedMonthlyPrice: recommendedMonthly,
      recommendedExtraMinutePrice: recommendedExtra,
      currentMonthlyPrice: VOICE_ADDON.monthlyPrice,
      currentExtraMinutePrice: VOICE_ADDON.extraMinutePrice,
      currentMarginPercent: Math.round(currentMargin * 100) / 100,
      recommendedMarginPercent: Math.round(recommendedMargin * 100) / 100,
      priceChangeRequired,
      priceChangeDirection: priceDelta > 0 ? 'up' : priceDelta < 0 ? 'down' : 'none',
      priceChangeDelta: Math.round(priceDelta * 100) / 100,
      providerBreakdown: [...VOICE_PROVIDER_COSTS],
      costsStale: areCostsStale(),
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Aggiorna i costi di un provider specifico.
   * Chiamato manualmente dall'admin o da un webhook di monitoraggio.
   */
  updateProviderCost(providerName: string, newCostPerMinuteUsd: number): ProviderCost | null {
    const provider = VOICE_PROVIDER_COSTS.find(
      p => p.name.toLowerCase() === providerName.toLowerCase(),
    );

    if (!provider) {
      this.logger.warn(`Provider "${providerName}" non trovato`);
      return null;
    }

    const oldCost = provider.costPerMinuteUsd;
    provider.costPerMinuteUsd = newCostPerMinuteUsd;
    provider.lastUpdated = new Date().toISOString().split('T')[0];

    this.logger.log(
      `Costo ${providerName} aggiornato: $${oldCost}/min → $${newCostPerMinuteUsd}/min`,
    );

    return { ...provider };
  }

  /**
   * Aggiorna il tasso di cambio USD/EUR.
   */
  updateExchangeRate(newRate: number): void {
    const oldRate = VOICE_PRICING_STRATEGY.usdToEurRate;
    VOICE_PRICING_STRATEGY.usdToEurRate = newRate;
    this.logger.log(`Tasso cambio aggiornato: ${oldRate} → ${newRate} USD/EUR`);
  }

  /**
   * Revisione trimestrale completa.
   * Calcola, logga, e opzionalmente applica il nuovo pricing.
   */
  async quarterlyReview(): Promise<PricingReviewResult> {
    this.logger.log('=== REVISIONE TRIMESTRALE PRICING VOICE AI ===');

    const calculation = this.calculateOptimalPricing();

    this.logger.log(
      // eslint-disable-next-line sonarjs/no-nested-template-literals
      `Costo reale: €${calculation.costPerMinuteEur}/min (${calculation.providerBreakdown.map(p => `${p.name}: $${p.costPerMinuteUsd}`).join(', ')})`,
    );
    this.logger.log(
      `Margine attuale: ${(calculation.currentMarginPercent * 100).toFixed(1)}% | Target: ${(VOICE_PRICING_STRATEGY.targetMarginPercent * 100).toFixed(1)}%`,
    );
    this.logger.log(
      `Prezzo attuale: €${calculation.currentMonthlyPrice}/mese | Raccomandato: €${calculation.recommendedMonthlyPrice}/mese`,
    );

    // Logga nel DB per audit trail
    await this.logPricingReview(calculation);

    // Se i costi sono stale, non applicare automaticamente
    if (calculation.costsStale) {
      this.logger.warn(
        'Costi provider non aggiornati da >90 giorni. Aggiorna manualmente prima di applicare.',
      );
      return {
        calculation,
        applied: false,
        reason: 'Costi provider stale (>90 giorni). Richiede aggiornamento manuale.',
        notifyCustomers: false,
        effectiveDate: null,
      };
    }

    // Se non serve cambio, logga e esci
    if (!calculation.priceChangeRequired) {
      this.logger.log(
        `Margine OK (${(calculation.currentMarginPercent * 100).toFixed(1)}%). Nessun cambio necessario.`,
      );
      return {
        calculation,
        applied: false,
        reason: `Margine ${(calculation.currentMarginPercent * 100).toFixed(1)}% nel range accettabile [${VOICE_PRICING_STRATEGY.minimumMarginPercent * 100}%-${VOICE_PRICING_STRATEGY.maximumMarginPercent * 100}%]`,
        notifyCustomers: false,
        effectiveDate: null,
      };
    }

    // Cambio necessario
    this.logger.warn(
      `CAMBIO PREZZO NECESSARIO: €${calculation.currentMonthlyPrice} → €${calculation.recommendedMonthlyPrice} (${calculation.priceChangeDirection})`,
    );

    // Calcola data effettiva (30 giorni di preavviso)
    const effectiveDate = new Date();
    effectiveDate.setDate(effectiveDate.getDate() + QUARTERLY_REVIEW.customerNoticeDays);
    const effectiveDateStr = effectiveDate.toISOString().split('T')[0];

    if (QUARTERLY_REVIEW.autoApply) {
      // Applica automaticamente
      updateVoiceAddonPricing({
        monthlyPrice: calculation.recommendedMonthlyPrice,
        yearlyPrice: Math.round(calculation.recommendedMonthlyPrice * 12 * 0.85 * 100) / 100,
        extraMinutePrice: calculation.recommendedExtraMinutePrice,
        costPerMinute: calculation.costPerMinuteEur,
      });

      this.logger.log(
        `Nuovo pricing applicato. Effettivo dal ${effectiveDateStr} (${QUARTERLY_REVIEW.customerNoticeDays}gg preavviso)`,
      );

      return {
        calculation,
        applied: true,
        reason: `Margine ${(calculation.currentMarginPercent * 100).toFixed(1)}% fuori range. Auto-applicato: €${calculation.recommendedMonthlyPrice}/mese`,
        notifyCustomers: true,
        effectiveDate: effectiveDateStr,
      };
    }

    // Auto-apply disabilitato: logga per approvazione manuale
    this.logger.warn("Auto-apply disabilitato. Richiede approvazione manuale dall'admin.");
    return {
      calculation,
      applied: false,
      reason: `Cambio prezzo raccomandato: €${calculation.currentMonthlyPrice} → €${calculation.recommendedMonthlyPrice}. Richiede approvazione admin.`,
      notifyCustomers: false,
      effectiveDate: effectiveDateStr,
    };
  }

  /**
   * Applica manualmente un nuovo pricing (chiamato dall'admin dopo approvazione).
   */
  applyPricing(monthlyPrice: number, extraMinutePrice: number): typeof VOICE_ADDON {
    updateVoiceAddonPricing({
      monthlyPrice,
      yearlyPrice: Math.round(monthlyPrice * 12 * 0.85 * 100) / 100,
      extraMinutePrice,
      costPerMinute: calculateTotalCostPerMinuteEur(),
    });

    this.logger.log(
      `Pricing applicato manualmente: €${monthlyPrice}/mese, €${extraMinutePrice}/min extra`,
    );

    return { ...VOICE_ADDON };
  }

  /**
   * Cron job: esegue revisione trimestrale il 1 di Gen, Apr, Lug, Ott alle 03:00.
   */
  @Cron(QUARTERLY_REVIEW.cronExpression)
  async handleQuarterlyReview(): Promise<void> {
    this.logger.log('Cron job trimestrale avviato');
    try {
      const result = await this.quarterlyReview();

      if (result.notifyCustomers) {
        this.logger.log(
          `TODO: Inviare notifica ai clienti Voice AI. Nuovo prezzo effettivo dal ${result.effectiveDate}`,
        );
        // TODO: integrare con NotificationService per email ai clienti
      }
    } catch (error) {
      this.logger.error('Errore durante revisione trimestrale', error);
    }
  }

  /**
   * Logga la revisione nel database per audit trail.
   */
  private async logPricingReview(calculation: PricingCalculation): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'VOICE_PRICING_REVIEW',
          tableName: 'voice_pricing',
          recordId: 'voice-addon',
          tenantId: 'system',
          performedBy: 'system',
          oldValues: JSON.stringify({
            monthlyPrice: calculation.currentMonthlyPrice,
            extraMinutePrice: calculation.currentExtraMinutePrice,
            marginPercent: calculation.currentMarginPercent,
          }),
          newValues: JSON.stringify({
            monthlyPrice: calculation.recommendedMonthlyPrice,
            extraMinutePrice: calculation.recommendedExtraMinutePrice,
            marginPercent: calculation.recommendedMarginPercent,
            costPerMinuteEur: calculation.costPerMinuteEur,
            providerCosts: calculation.providerBreakdown.map(p => ({
              name: p.name,
              costPerMinuteUsd: p.costPerMinuteUsd,
            })),
          }),
          ipAddress: '0.0.0.0',
        },
      });
    } catch (error) {
      this.logger.warn('Impossibile loggare pricing review nel DB', error);
    }
  }
}
