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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ViesApiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViesApiService = void 0;
exports.verifyVatNumber = verifyVatNumber;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
let ViesApiService = ViesApiService_1 = class ViesApiService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(ViesApiService_1.name);
        this.viesEndpoint = 'https://ec.europa.eu/taxation_customs/vies/services/checkVatService';
        this.cacheTtlSeconds = 30 * 24 * 60 * 60;
        this.requestTimestamps = [];
        this.rateLimitWindow = 60000;
        this.rateLimitMax = 10;
        this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
        const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
        this.redis = new ioredis_1.default(redisUrl, {
            password: this.configService.get('REDIS_PASSWORD') || undefined,
            db: parseInt(this.configService.get('REDIS_DB') || '0'),
            retryStrategy: times => Math.min(times * 50, 2000),
        });
        this.redis.on('error', err => {
            this.logger.error('Redis connection error:', err.message);
        });
    }
    async verifyVatNumber(vatNumber) {
        const cleanVat = this.normalizeVatNumber(vatNumber);
        if (!this.isValidVatFormat(cleanVat)) {
            return {
                valid: false,
                requestDate: new Date(),
            };
        }
        const { countryCode, number } = this.extractCountryAndNumber(cleanVat);
        const cachedResult = await this.getCachedResult(cleanVat);
        if (cachedResult) {
            this.logger.debug(`Cache hit for VAT: ${cleanVat}`);
            return cachedResult;
        }
        if (!this.checkRateLimit()) {
            this.logger.warn('VIES rate limit exceeded');
            if (this.isDevelopment) {
                return this.getMockResult(countryCode, number);
            }
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        try {
            const result = await this.callViesApi(countryCode, number);
            if (result.valid) {
                await this.cacheResult(cleanVat, result);
            }
            return result;
        }
        catch (error) {
            this.logger.error(`VIES API error for ${cleanVat}:`, error.message);
            if (this.isDevelopment) {
                return this.getMockResult(countryCode, number);
            }
            throw error;
        }
    }
    async verifyMultipleVatNumbers(vatNumbers) {
        const results = new Map();
        const batchSize = 5;
        for (let i = 0; i < vatNumbers.length; i += batchSize) {
            const batch = vatNumbers.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(batch.map(vat => this.verifyVatNumber(vat)));
            batch.forEach((vat, index) => {
                const result = batchResults[index];
                if (result.status === 'fulfilled') {
                    results.set(vat, result.value);
                }
                else {
                    results.set(vat, {
                        valid: false,
                        requestDate: new Date(),
                    });
                }
            });
            if (i + batchSize < vatNumbers.length) {
                await this.delay(1000);
            }
        }
        return results;
    }
    async callViesApi(countryCode, vatNumber) {
        const soapEnvelope = this.buildSoapRequest(countryCode, vatNumber);
        const response = await fetch(this.viesEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml;charset=UTF-8',
                SOAPAction: '',
            },
            body: soapEnvelope,
        });
        if (!response.ok) {
            throw new Error(`VIES HTTP error: ${response.status}`);
        }
        const xmlResponse = await response.text();
        return this.parseSoapResponse(xmlResponse);
    }
    buildSoapRequest(countryCode, vatNumber) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
   <soapenv:Header/>
   <soapenv:Body>
      <urn:checkVat>
         <urn:countryCode>${countryCode}</urn:countryCode>
         <urn:vatNumber>${vatNumber}</urn:vatNumber>
      </urn:checkVat>
   </soapenv:Body>
</soapenv:Envelope>`;
    }
    parseSoapResponse(xmlResponse) {
        const getTagValue = (xml, tagName) => {
            const regex = new RegExp(`<(?:ns2:)?${tagName}>([^<]*)</(?:ns2:)?${tagName}>`, 'i');
            const match = xml.match(regex);
            return match?.[1] || undefined;
        };
        if (xmlResponse.includes('soapenv:Fault') || xmlResponse.includes('<faultstring>')) {
            const faultString = getTagValue(xmlResponse, 'faultstring') || 'Unknown SOAP fault';
            throw new Error(`VIES SOAP Fault: ${faultString}`);
        }
        const valid = getTagValue(xmlResponse, 'valid');
        const name = getTagValue(xmlResponse, 'name');
        const address = getTagValue(xmlResponse, 'address');
        const countryCode = getTagValue(xmlResponse, 'countryCode');
        const vatNumber = getTagValue(xmlResponse, 'vatNumber');
        const requestIdentifier = getTagValue(xmlResponse, 'requestIdentifier');
        return {
            valid: valid === 'true',
            companyName: name,
            address: address,
            requestDate: new Date(),
            countryCode,
            vatNumber,
            consultationId: requestIdentifier,
        };
    }
    async getCachedResult(vatNumber) {
        try {
            const cached = await this.redis.get(`vat:verification:${vatNumber}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                return {
                    ...parsed,
                    requestDate: new Date(parsed.requestDate),
                };
            }
        }
        catch (error) {
            this.logger.warn('Cache retrieval error:', error.message);
        }
        return null;
    }
    async cacheResult(vatNumber, result) {
        try {
            await this.redis.setex(`vat:verification:${vatNumber}`, this.cacheTtlSeconds, JSON.stringify(result));
        }
        catch (error) {
            this.logger.warn('Cache storage error:', error.message);
        }
    }
    checkRateLimit() {
        const now = Date.now();
        this.requestTimestamps = this.requestTimestamps.filter(timestamp => now - timestamp < this.rateLimitWindow);
        if (this.requestTimestamps.length >= this.rateLimitMax) {
            return false;
        }
        this.requestTimestamps.push(now);
        return true;
    }
    getMockResult(countryCode, vatNumber) {
        this.logger.debug(`Using mock VIES result for ${countryCode}${vatNumber}`);
        const mockCompanies = {
            IT: { name: 'AZIENDA DEMO SRL', address: 'Via Roma 1, 00100 Roma (RM)' },
            DE: { name: 'Muster GmbH', address: 'Musterstraße 1, 10115 Berlin' },
            FR: { name: 'SARL Exemple', address: '1 Rue de la Paix, 75001 Paris' },
            ES: { name: 'Ejemplo SL', address: 'Calle Mayor 1, 28013 Madrid' },
            GB: { name: 'Example Ltd', address: '1 High Street, London SW1A 1AA' },
        };
        const mock = mockCompanies[countryCode] || { name: 'Test Company', address: 'Test Address' };
        return {
            valid: true,
            companyName: mock.name,
            address: mock.address,
            requestDate: new Date(),
            countryCode,
            vatNumber,
            consultationId: `MOCK-${Date.now()}`,
        };
    }
    normalizeVatNumber(vatNumber) {
        return vatNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    }
    isValidVatFormat(vatNumber) {
        if (vatNumber.length < 3)
            return false;
        const countryCode = vatNumber.substring(0, 2);
        const number = vatNumber.substring(2);
        if (!/^[A-Z]{2}$/.test(countryCode))
            return false;
        if (!/^[A-Z0-9]+$/.test(number))
            return false;
        return true;
    }
    extractCountryAndNumber(vatNumber) {
        return {
            countryCode: vatNumber.substring(0, 2),
            number: vatNumber.substring(2),
        };
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async onModuleDestroy() {
        await this.redis.quit();
    }
};
exports.ViesApiService = ViesApiService;
exports.ViesApiService = ViesApiService = ViesApiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ViesApiService);
async function verifyVatNumber(vatNumber, config) {
    const service = new ViesApiService({
        get: (key) => {
            const configs = {
                REDIS_URL: config?.redisUrl || 'redis://localhost:6379',
                NODE_ENV: config?.isDevelopment ? 'development' : 'production',
            };
            return configs[key];
        },
    });
    try {
        return await service.verifyVatNumber(vatNumber);
    }
    finally {
        await service.onModuleDestroy();
    }
}
