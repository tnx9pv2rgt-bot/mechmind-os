/**
 * VIES API Service - VAT Information Exchange System
 * Verifica partite IVA europee con cache Redis
 */

import { Injectable, Logger, BadGatewayException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
// Simple XML parser for VIES SOAP responses (no external dependency)

export interface ViesVerificationResult {
  valid: boolean;
  companyName?: string;
  address?: string;
  requestDate: Date;
  countryCode?: string;
  vatNumber?: string;
  consultationId?: string;
}

export interface ViesError {
  code: string;
  message: string;
}

@Injectable()
export class ViesApiService {
  private readonly logger = new Logger(ViesApiService.name);
  private readonly redis: Redis;
  private readonly viesEndpoint =
    'https://ec.europa.eu/taxation_customs/vies/services/checkVatService';
  private readonly cacheTtlSeconds = 30 * 24 * 60 * 60; // 30 giorni
  private readonly isDevelopment: boolean;
  private requestTimestamps: number[] = [];
  private readonly rateLimitWindow = 60000; // 1 minuto
  private readonly rateLimitMax = 10; // 10 richieste/minuto

  constructor(private readonly configService: ConfigService) {
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';

    // Initialize Redis connection
    const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      db: parseInt(this.configService.get('REDIS_DB') || '0'),
      retryStrategy: times => Math.min(times * 50, 2000),
    });

    this.redis.on('error', err => {
      this.logger.error('Redis connection error:', err.message);
    });
  }

  /**
   * Verifica una partita IVA europea
   * @param vatNumber - Numero IVA completo (es: "IT12345678901")
   */
  async verifyVatNumber(vatNumber: string): Promise<ViesVerificationResult> {
    const cleanVat = this.normalizeVatNumber(vatNumber);

    if (!this.isValidVatFormat(cleanVat)) {
      return {
        valid: false,
        requestDate: new Date(),
      };
    }

    const { countryCode, number } = this.extractCountryAndNumber(cleanVat);

    // Check cache first
    const cachedResult = await this.getCachedResult(cleanVat);
    if (cachedResult) {
      this.logger.debug(`Cache hit for VAT: ${cleanVat}`);
      return cachedResult;
    }

    // Rate limiting check
    if (!this.checkRateLimit()) {
      this.logger.warn('VIES rate limit exceeded');
      if (this.isDevelopment) {
        return this.getMockResult(countryCode, number);
      }
      throw new HttpException('Rate limit exceeded. Please try again later.', 429);
    }

    try {
      const result = await this.callViesApi(countryCode, number);

      // Cache successful results
      if (result.valid) {
        await this.cacheResult(cleanVat, result);
      }

      return result;
    } catch (error) {
      this.logger.error(`VIES API error for ${cleanVat}:`, error.message);

      // Fallback to mock in development
      if (this.isDevelopment) {
        return this.getMockResult(countryCode, number);
      }

      throw error;
    }
  }

  /**
   * Verifica multipla partite IVA
   */
  async verifyMultipleVatNumbers(
    vatNumbers: string[],
  ): Promise<Map<string, ViesVerificationResult>> {
    const results = new Map<string, ViesVerificationResult>();

    // Process in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < vatNumbers.length; i += batchSize) {
      const batch = vatNumbers.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch.map(vat => this.verifyVatNumber(vat)));

      batch.forEach((vat, index) => {
        // eslint-disable-next-line security/detect-object-injection
        const result = batchResults[index];
        if (result.status === 'fulfilled') {
          results.set(vat, result.value);
        } else {
          results.set(vat, {
            valid: false,
            requestDate: new Date(),
          });
        }
      });

      // Small delay between batches
      if (i + batchSize < vatNumbers.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  /**
   * Chiama l'API VIES via SOAP
   */
  private async callViesApi(
    countryCode: string,
    vatNumber: string,
  ): Promise<ViesVerificationResult> {
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
      throw new BadGatewayException(`VIES HTTP error: ${response.status}`);
    }

    const xmlResponse = await response.text();
    return this.parseSoapResponse(xmlResponse);
  }

  /**
   * Costruisce la richiesta SOAP
   */
  private buildSoapRequest(countryCode: string, vatNumber: string): string {
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

  /**
   * Parsa la risposta SOAP
   */
  private parseSoapResponse(xmlResponse: string): ViesVerificationResult {
    // Simple XML parsing using regex (sufficient for VIES responses)
    const getTagValue = (xml: string, tagName: string): string | undefined => {
      // eslint-disable-next-line security/detect-non-literal-regexp
      const regex = new RegExp(`<(?:ns2:)?${tagName}>([^<]*)</(?:ns2:)?${tagName}>`, 'i');
      // eslint-disable-next-line sonarjs/prefer-regexp-exec
      const match = xml.match(regex);
      return match?.[1] || undefined;
    };

    // Check for SOAP Fault
    if (xmlResponse.includes('soapenv:Fault') || xmlResponse.includes('<faultstring>')) {
      const faultString = getTagValue(xmlResponse, 'faultstring') || 'Unknown SOAP fault';
      throw new BadGatewayException(`VIES SOAP Fault: ${faultString}`);
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

  /**
   * Recupera risultato dalla cache
   */
  private async getCachedResult(vatNumber: string): Promise<ViesVerificationResult | null> {
    try {
      const cached = await this.redis.get(`vat:verification:${vatNumber}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          requestDate: new Date(parsed.requestDate),
        };
      }
    } catch (error) {
      this.logger.warn('Cache retrieval error:', error.message);
    }
    return null;
  }

  /**
   * Salva risultato in cache
   */
  private async cacheResult(vatNumber: string, result: ViesVerificationResult): Promise<void> {
    try {
      await this.redis.setex(
        `vat:verification:${vatNumber}`,
        this.cacheTtlSeconds,
        JSON.stringify(result),
      );
    } catch (error) {
      this.logger.warn('Cache storage error:', error.message);
    }
  }

  /**
   * Rate limiting in-memory (per istanza)
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.rateLimitWindow,
    );

    if (this.requestTimestamps.length >= this.rateLimitMax) {
      return false;
    }

    this.requestTimestamps.push(now);
    return true;
  }

  /**
   * Mock per sviluppo
   */
  private getMockResult(countryCode: string, vatNumber: string): ViesVerificationResult {
    this.logger.debug(`Using mock VIES result for ${countryCode}${vatNumber}`);

    const mockCompanies: Record<string, { name: string; address: string }> = {
      IT: { name: 'AZIENDA DEMO SRL', address: 'Via Roma 1, 00100 Roma (RM)' },
      DE: { name: 'Muster GmbH', address: 'Musterstraße 1, 10115 Berlin' },
      FR: { name: 'SARL Exemple', address: '1 Rue de la Paix, 75001 Paris' },
      ES: { name: 'Ejemplo SL', address: 'Calle Mayor 1, 28013 Madrid' },
      GB: { name: 'Example Ltd', address: '1 High Street, London SW1A 1AA' },
    };

    // eslint-disable-next-line security/detect-object-injection
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

  /**
   * Normalizza il numero IVA
   */
  private normalizeVatNumber(vatNumber: string): string {
    return vatNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  /**
   * Validazione formato base
   */
  private isValidVatFormat(vatNumber: string): boolean {
    // Minimo 3 caratteri (2 per country code + 1 per numero)
    if (vatNumber.length < 3) return false;

    const countryCode = vatNumber.substring(0, 2);
    const number = vatNumber.substring(2);

    // Country code deve essere alfabetico
    if (!/^[A-Z]{2}$/.test(countryCode)) return false;

    // Numero deve contenere solo numeri e lettere
    if (!/^[A-Z0-9]+$/.test(number)) return false;

    return true;
  }

  /**
   * Estrae country code e numero
   */
  private extractCountryAndNumber(vatNumber: string): { countryCode: string; number: string } {
    return {
      countryCode: vatNumber.substring(0, 2),
      number: vatNumber.substring(2),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}

// Standalone function for non-NestJS usage
export async function verifyVatNumber(
  vatNumber: string,
  config?: { redisUrl?: string; isDevelopment?: boolean },
): Promise<ViesVerificationResult> {
  const service = new ViesApiService({
    get: (key: string) => {
      const configs: Record<string, string> = {
        REDIS_URL: config?.redisUrl || 'redis://localhost:6379',
        NODE_ENV: config?.isDevelopment ? 'development' : 'production',
      };
      // eslint-disable-next-line security/detect-object-injection
      return configs[key];
    },
  } as ConfigService);

  try {
    return await service.verifyVatNumber(vatNumber);
  } finally {
    await service.onModuleDestroy();
  }
}
