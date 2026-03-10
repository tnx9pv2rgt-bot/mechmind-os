/**
 * ML Integration Service
 *
 * Bridges the NestJS backend with the Python ML microservice.
 * Provides churn prediction, predictive maintenance estimates,
 * and labor time estimation via HTTP calls to the ML API.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChurnPrediction {
  customerId: string;
  probability: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: string[];
  predictedAt: Date;
}

export interface MaintenancePrediction {
  vehicleId: string;
  component: string;
  predictedFailureDate: Date;
  confidence: number;
  recommendedAction: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface LaborEstimate {
  operationCode: string;
  make: string;
  model: string;
  estimatedMinutes: number;
  confidence: number;
  basedOn: 'MODEL' | 'HISTORICAL' | 'GUIDE';
}

@Injectable()
export class MlIntegrationService {
  private readonly logger = new Logger(MlIntegrationService.name);
  private readonly mlApiUrl: string;
  private readonly mlApiKey: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.mlApiUrl = this.config.get<string>('ML_API_URL', 'http://localhost:8000');
    this.mlApiKey = this.config.get<string>('ML_API_KEY', '');
    this.timeoutMs = this.config.get<number>('ML_API_TIMEOUT_MS', 10000);
  }

  /**
   * Predict customer churn probability
   */
  async predictChurn(
    tenantId: string,
    customerId: string,
    features: {
      daysSinceLastVisit: number;
      totalBookings: number;
      averageSpend: number;
      cancellationRate: number;
    },
  ): Promise<ChurnPrediction> {
    const payload = { tenantId, customerId, features };

    const response = await this.callMlApi<{
      probability: number;
      risk_level: string;
      factors: string[];
    }>('/predict/churn', payload);

    return {
      customerId,
      probability: response.probability,
      riskLevel: response.risk_level as ChurnPrediction['riskLevel'],
      factors: response.factors,
      predictedAt: new Date(),
    };
  }

  /**
   * Predict maintenance needs for a vehicle
   */
  async predictMaintenance(
    tenantId: string,
    vehicleId: string,
    features: {
      mileage: number;
      lastServiceDate: Date;
      obdCodes: string[];
      healthScore: number;
    },
  ): Promise<MaintenancePrediction[]> {
    const payload = { tenantId, vehicleId, features };

    const response = await this.callMlApi<
      Array<{
        component: string;
        predicted_failure_date: string;
        confidence: number;
        recommended_action: string;
        urgency: string;
      }>
    >('/predict/maintenance', payload);

    return response.map(r => ({
      vehicleId,
      component: r.component,
      predictedFailureDate: new Date(r.predicted_failure_date),
      confidence: r.confidence,
      recommendedAction: r.recommended_action,
      urgency: r.urgency as MaintenancePrediction['urgency'],
    }));
  }

  /**
   * Estimate labor time for an operation
   */
  async estimateLabor(
    tenantId: string,
    operationCode: string,
    make: string,
    model: string,
    year?: number,
  ): Promise<LaborEstimate> {
    const payload = { tenantId, operationCode, make, model, year };

    const response = await this.callMlApi<{
      estimated_minutes: number;
      confidence: number;
      based_on: string;
    }>('/predict/labor', payload);

    return {
      operationCode,
      make,
      model,
      estimatedMinutes: response.estimated_minutes,
      confidence: response.confidence,
      basedOn: response.based_on as LaborEstimate['basedOn'],
    };
  }

  /**
   * Health check for the ML API
   */
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.callMlApi<{ status: string }>('/health', undefined, 'GET');
      return { healthy: true, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false, latencyMs: Date.now() - start };
    }
  }

  /**
   * Call the ML API with timeout and error handling
   */
  private async callMlApi<T>(
    path: string,
    body?: unknown,
    method: 'GET' | 'POST' = 'POST',
  ): Promise<T> {
    const url = `${this.mlApiUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.mlApiKey) {
        headers['Authorization'] = `Bearer ${this.mlApiKey}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ML API error ${response.status}: ${errorText}`);
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`ML API call failed [${path}]: ${message}`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
