"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MlIntegrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MlIntegrationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let MlIntegrationService = MlIntegrationService_1 = class MlIntegrationService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(MlIntegrationService_1.name);
        this.mlApiUrl = this.config.get('ML_API_URL', 'http://localhost:8000');
        this.mlApiKey = this.config.get('ML_API_KEY', '');
        this.timeoutMs = this.config.get('ML_API_TIMEOUT_MS', 10000);
    }
    async predictChurn(tenantId, customerId, features) {
        const payload = { tenantId, customerId, features };
        const response = await this.callMlApi('/predict/churn', payload);
        return {
            customerId,
            probability: response.probability,
            riskLevel: response.risk_level,
            factors: response.factors,
            predictedAt: new Date(),
        };
    }
    async predictMaintenance(tenantId, vehicleId, features) {
        const payload = { tenantId, vehicleId, features };
        const response = await this.callMlApi('/predict/maintenance', payload);
        return response.map(r => ({
            vehicleId,
            component: r.component,
            predictedFailureDate: new Date(r.predicted_failure_date),
            confidence: r.confidence,
            recommendedAction: r.recommended_action,
            urgency: r.urgency,
        }));
    }
    async estimateLabor(tenantId, operationCode, make, model, year) {
        const payload = { tenantId, operationCode, make, model, year };
        const response = await this.callMlApi('/predict/labor', payload);
        return {
            operationCode,
            make,
            model,
            estimatedMinutes: response.estimated_minutes,
            confidence: response.confidence,
            basedOn: response.based_on,
        };
    }
    async healthCheck() {
        const start = Date.now();
        try {
            await this.callMlApi('/health', undefined, 'GET');
            return { healthy: true, latencyMs: Date.now() - start };
        }
        catch {
            return { healthy: false, latencyMs: Date.now() - start };
        }
    }
    async callMlApi(path, body, method = 'POST') {
        const url = `${this.mlApiUrl}${path}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const headers = {
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
            return (await response.json());
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`ML API call failed [${path}]: ${message}`);
            throw error;
        }
        finally {
            clearTimeout(timeout);
        }
    }
};
exports.MlIntegrationService = MlIntegrationService;
exports.MlIntegrationService = MlIntegrationService = MlIntegrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MlIntegrationService);
