/**
 * viesApi.spec.ts — Tests for VIES VAT verification API service
 */

// Mock ioredis
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => mockRedis),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { ConfigService } from '@nestjs/config';
import { BadGatewayException, HttpException } from '@nestjs/common';
import { ViesApiService } from './viesApi';

describe('ViesApiService', () => {
  let service: ViesApiService;

  const createService = (overrides: Record<string, string> = {}): ViesApiService => {
    const defaults: Record<string, string> = {
      NODE_ENV: 'development',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_PASSWORD: '',
      REDIS_DB: '0',
    };
    const values = { ...defaults, ...overrides };

    return new ViesApiService({
      get: (key: string) => values[key],
    } as ConfigService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService();
  });

  afterEach(async () => {
    mockRedis.quit.mockResolvedValue('OK');
    await service.onModuleDestroy();
  });

  describe('verifyVatNumber', () => {
    it('should reject VAT numbers shorter than 3 chars', async () => {
      const result = await service.verifyVatNumber('IT');
      expect(result.valid).toBe(false);
    });

    it('should reject VAT numbers with non-alpha country code', async () => {
      const result = await service.verifyVatNumber('12345678901');
      expect(result.valid).toBe(false);
    });

    it('should reject VAT numbers with invalid number part', async () => {
      const result = await service.verifyVatNumber('IT@#$');
      expect(result.valid).toBe(false);
    });

    it('should return cached result when available', async () => {
      const cached = {
        valid: true,
        companyName: 'Test SRL',
        address: 'Via Roma 1',
        requestDate: new Date().toISOString(),
        countryCode: 'IT',
        vatNumber: '12345678901',
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

      const result = await service.verifyVatNumber('IT12345678901');

      expect(result.valid).toBe(true);
      expect(result.companyName).toBe('Test SRL');
      expect(result.requestDate).toBeInstanceOf(Date);
    });

    it('should return mock result in development', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await service.verifyVatNumber('IT12345678901');

      expect(result.valid).toBe(true);
      expect(result.companyName).toBe('AZIENDA DEMO SRL');
      expect(result.countryCode).toBe('IT');
    });

    it('should return mock for different country codes', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await service.verifyVatNumber('DE123456789');

      expect(result.valid).toBe(true);
      expect(result.companyName).toBe('Muster GmbH');
    });

    it('should return generic mock for unknown country codes', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await service.verifyVatNumber('PL1234567890');

      expect(result.valid).toBe(true);
      expect(result.companyName).toBe('Test Company');
    });

    it('should call VIES SOAP API in production', async () => {
      const prodService = createService({ NODE_ENV: 'production' });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <ns2:checkVatResponse xmlns:ns2="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
                <ns2:valid>true</ns2:valid>
                <ns2:name>REAL COMPANY SRL</ns2:name>
                <ns2:address>Via Test 1, 00100 Roma</ns2:address>
                <ns2:countryCode>IT</ns2:countryCode>
                <ns2:vatNumber>12345678901</ns2:vatNumber>
              </ns2:checkVatResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `,
      });
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await prodService.verifyVatNumber('IT12345678901');

      expect(result.valid).toBe(true);
      expect(result.companyName).toBe('REAL COMPANY SRL');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('checkVatService'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'text/xml;charset=UTF-8',
          }),
        }),
      );

      await prodService.onModuleDestroy();
    });

    it('should handle SOAP fault response', async () => {
      const prodService = createService({ NODE_ENV: 'production' });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <soapenv:Fault>
                <faultstring>MS_UNAVAILABLE</faultstring>
              </soapenv:Fault>
            </soapenv:Body>
          </soapenv:Envelope>
        `,
      });

      await expect(prodService.verifyVatNumber('IT12345678901')).rejects.toThrow(
        BadGatewayException,
      );

      await prodService.onModuleDestroy();
    });

    it('should throw BadGatewayException on HTTP error', async () => {
      const prodService = createService({ NODE_ENV: 'production' });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

      await expect(prodService.verifyVatNumber('IT12345678901')).rejects.toThrow(
        BadGatewayException,
      );

      await prodService.onModuleDestroy();
    });

    it('should not cache invalid results', async () => {
      const prodService = createService({ NODE_ENV: 'production' });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <ns2:checkVatResponse xmlns:ns2="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
                <ns2:valid>false</ns2:valid>
              </ns2:checkVatResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `,
      });

      await prodService.verifyVatNumber('IT00000000000');

      expect(mockRedis.setex).not.toHaveBeenCalled();

      await prodService.onModuleDestroy();
    });

    it('should handle rate limit exceeded in production', async () => {
      const prodService = createService({ NODE_ENV: 'production' });

      // Fill up rate limit (10 requests)
      for (let i = 0; i < 10; i++) {
        mockRedis.get.mockResolvedValueOnce(null);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: async () => `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
              <soapenv:Body>
                <ns2:checkVatResponse xmlns:ns2="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
                  <ns2:valid>true</ns2:valid>
                  <ns2:name>Test</ns2:name>
                </ns2:checkVatResponse>
              </soapenv:Body>
            </soapenv:Envelope>
          `,
        });
        mockRedis.setex.mockResolvedValueOnce('OK');
        await prodService.verifyVatNumber(`IT1234567890${i}`);
      }

      // 11th should be rate limited
      mockRedis.get.mockResolvedValueOnce(null);

      await expect(prodService.verifyVatNumber('IT99999999999')).rejects.toThrow(HttpException);

      await prodService.onModuleDestroy();
    });

    it('should return mock on rate limit in development', async () => {
      // Fill up rate limit
      for (let i = 0; i < 10; i++) {
        mockRedis.get.mockResolvedValueOnce(null);
        await service.verifyVatNumber(`IT1234567890${i}`);
      }

      mockRedis.get.mockResolvedValueOnce(null);
      const result = await service.verifyVatNumber('IT99999999999');

      // In dev, should fallback to mock
      expect(result.valid).toBe(true);
    });

    it('should handle Redis cache errors gracefully', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis down'));

      const result = await service.verifyVatNumber('IT12345678901');

      expect(result.valid).toBe(true); // Falls through to mock
    });

    it('should handle cache storage errors gracefully', async () => {
      const prodService = createService({ NODE_ENV: 'production' });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <ns2:checkVatResponse xmlns:ns2="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
                <ns2:valid>true</ns2:valid>
                <ns2:name>Test</ns2:name>
              </ns2:checkVatResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `,
      });
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis full'));

      // Should not throw even if caching fails
      const result = await prodService.verifyVatNumber('IT12345678901');
      expect(result.valid).toBe(true);

      await prodService.onModuleDestroy();
    });
  });

  describe('verifyMultipleVatNumbers', () => {
    it('should verify multiple VAT numbers', async () => {
      mockRedis.get.mockResolvedValue(null);

      const results = await service.verifyMultipleVatNumbers(['IT12345678901', 'DE123456789']);

      expect(results.size).toBe(2);
      expect(results.get('IT12345678901')!.valid).toBe(true);
      expect(results.get('DE123456789')!.valid).toBe(true);
    });

    it('should handle failures gracefully', async () => {
      mockRedis.get.mockResolvedValue(null);

      const results = await service.verifyMultipleVatNumbers([
        'IT12345678901',
        'XX', // Invalid format
      ]);

      expect(results.size).toBe(2);
      expect(results.get('XX')!.valid).toBe(false);
    });
  });

  describe('normalizeVatNumber', () => {
    it('should uppercase and remove special chars', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      // Test through verifyVatNumber which calls normalizeVatNumber
      const result = await service.verifyVatNumber('it-12345678901');

      expect(result.countryCode).toBe('IT');
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit Redis', async () => {
      mockRedis.quit.mockResolvedValueOnce('OK');
      await service.onModuleDestroy();
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});
