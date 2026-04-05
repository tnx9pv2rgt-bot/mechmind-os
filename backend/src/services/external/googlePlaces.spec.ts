/**
 * googlePlaces.spec.ts — Tests for Google Places API service
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
import { BadGatewayException } from '@nestjs/common';
import { GooglePlacesService } from './googlePlaces';

describe('GooglePlacesService', () => {
  let service: GooglePlacesService;

  const createService = (overrides: Record<string, string> = {}): GooglePlacesService => {
    const defaults: Record<string, string> = {
      NODE_ENV: 'development',
      GOOGLE_PLACES_API_KEY: '',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_PASSWORD: '',
      REDIS_DB: '0',
    };
    const values = { ...defaults, ...overrides };

    return new GooglePlacesService({
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

  describe('autocompleteAddress', () => {
    it('should return empty predictions for short input', async () => {
      const result = await service.autocompleteAddress('ab');
      expect(result.predictions).toHaveLength(0);
    });

    it('should return empty predictions for empty input', async () => {
      const result = await service.autocompleteAddress('');
      expect(result.predictions).toHaveLength(0);
    });

    it('should return cached result when available', async () => {
      const cached = [
        {
          placeId: 'p1',
          description: 'Via Roma, Roma',
          mainText: 'Via Roma',
          secondaryText: 'Roma',
          types: ['geocode'],
        },
      ];
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

      const result = await service.autocompleteAddress('Via Roma');

      expect(result.predictions).toHaveLength(1);
      expect(result.predictions[0].placeId).toBe('p1');
    });

    it('should return mock predictions in development without API key', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await service.autocompleteAddress('Via Roma');

      expect(result.predictions.length).toBeGreaterThan(0);
      expect(result.predictions[0].description).toContain('Via Roma');
    });

    it('should call Google API in production', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        GOOGLE_PLACES_API_KEY: 'test-api-key',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OK',
          predictions: [
            {
              place_id: 'ChIJ1',
              description: 'Via Roma 1, Roma, Italia',
              structured_formatting: {
                main_text: 'Via Roma 1',
                secondary_text: 'Roma, Italia',
              },
              types: ['geocode'],
            },
          ],
        }),
      });
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await prodService.autocompleteAddress('Via Roma');

      expect(result.predictions).toHaveLength(1);
      expect(result.predictions[0].placeId).toBe('ChIJ1');

      await prodService.onModuleDestroy();
    });

    it('should handle ZERO_RESULTS status', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        GOOGLE_PLACES_API_KEY: 'test-api-key',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ZERO_RESULTS',
          predictions: [],
        }),
      });
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await prodService.autocompleteAddress('xyznonexistent');

      expect(result.predictions).toHaveLength(0);

      await prodService.onModuleDestroy();
    });

    it('should throw BadGatewayException on API error status', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        GOOGLE_PLACES_API_KEY: 'test-api-key',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'REQUEST_DENIED',
          error_message: 'API key invalid',
        }),
      });

      await expect(prodService.autocompleteAddress('Via Roma')).rejects.toThrow(
        BadGatewayException,
      );

      await prodService.onModuleDestroy();
    });

    it('should throw on HTTP error', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        GOOGLE_PLACES_API_KEY: 'test-api-key',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await expect(prodService.autocompleteAddress('Via Roma')).rejects.toThrow(
        BadGatewayException,
      );

      await prodService.onModuleDestroy();
    });

    it('should pass location and radius options', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        GOOGLE_PLACES_API_KEY: 'test-api-key',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'OK', predictions: [] }),
      });
      mockRedis.setex.mockResolvedValueOnce('OK');

      await prodService.autocompleteAddress('Via Roma', {
        location: { lat: 41.9, lng: 12.5 },
        radius: 5000,
        types: 'address',
      });

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('location=41.9'));

      await prodService.onModuleDestroy();
    });

    it('should fallback to mock in development on fetch error', async () => {
      service = createService({
        NODE_ENV: 'development',
        GOOGLE_PLACES_API_KEY: 'test-key',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.autocompleteAddress('Via Roma');

      expect(result.predictions.length).toBeGreaterThan(0);
    });
  });

  describe('getPlaceDetails', () => {
    it('should return cached details when available', async () => {
      const cached = {
        street: 'Via Roma',
        number: '1',
        city: 'Roma',
        postalCode: '00100',
        province: 'RM',
        country: 'Italia',
        latitude: 41.9,
        longitude: 12.5,
        formattedAddress: 'Via Roma 1, Roma',
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

      const result = await service.getPlaceDetails('ChIJ1');

      expect(result.street).toBe('Via Roma');
    });

    it('should return mock details in development', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await service.getPlaceDetails('ChIJrTLJRciLekgRQtA7-sQq2Qc');

      expect(result.city).toBe('Roma');
      expect(result.province).toBe('RM');
    });

    it('should return default mock for unknown place ID', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await service.getPlaceDetails('unknown-place-id');

      expect(result.street).toBeDefined();
    });

    it('should call Google API in production', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        GOOGLE_PLACES_API_KEY: 'test-api-key',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OK',
          result: {
            address_components: [
              { long_name: 'Via Roma', short_name: 'Via Roma', types: ['route'] },
              { long_name: '1', short_name: '1', types: ['street_number'] },
              { long_name: 'Roma', short_name: 'Roma', types: ['locality'] },
              { long_name: 'RM', short_name: 'RM', types: ['administrative_area_level_1'] },
              { long_name: 'Italia', short_name: 'IT', types: ['country'] },
              { long_name: '00100', short_name: '00100', types: ['postal_code'] },
            ],
            geometry: { location: { lat: 41.9, lng: 12.5 } },
            formatted_address: 'Via Roma 1, 00100 Roma RM, Italia',
          },
        }),
      });
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await prodService.getPlaceDetails('ChIJ1');

      expect(result.street).toBe('Via Roma');
      expect(result.number).toBe('1');
      expect(result.city).toBe('Roma');

      await prodService.onModuleDestroy();
    });

    it('should throw on API error status', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        GOOGLE_PLACES_API_KEY: 'test-api-key',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'NOT_FOUND' }),
      });

      await expect(prodService.getPlaceDetails('bad-id')).rejects.toThrow(BadGatewayException);

      await prodService.onModuleDestroy();
    });
  });

  describe('geocodeAddress', () => {
    it('should return cached geocode result', async () => {
      const cached = [{ latitude: 41.9, longitude: 12.5, formattedAddress: 'Roma', placeId: 'p1' }];
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

      const result = await service.geocodeAddress('Roma, Italia');

      expect(result).toHaveLength(1);
      expect(result[0].latitude).toBe(41.9);
    });

    it('should return mock geocode in development', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await service.geocodeAddress('Roma, Italia');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].latitude).toBeDefined();
    });

    it('should call Google Geocoding API in production', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        GOOGLE_PLACES_API_KEY: 'test-api-key',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [
            {
              geometry: { location: { lat: 41.9, lng: 12.5 } },
              formatted_address: 'Roma, Italia',
              place_id: 'ChIJ1',
            },
          ],
        }),
      });
      mockRedis.setex.mockResolvedValueOnce('OK');

      const result = await prodService.geocodeAddress('Roma, Italia');

      expect(result).toHaveLength(1);

      await prodService.onModuleDestroy();
    });

    it('should throw on API error', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        GOOGLE_PLACES_API_KEY: 'test-api-key',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'OVER_QUERY_LIMIT' }),
      });

      await expect(prodService.geocodeAddress('Roma')).rejects.toThrow(BadGatewayException);

      await prodService.onModuleDestroy();
    });
  });

  describe('reverseGeocode', () => {
    it('should return cached reverse geocode', async () => {
      const cached = [
        {
          street: 'Via Roma',
          number: '1',
          city: 'Roma',
          postalCode: '00100',
          province: 'RM',
          country: 'Italia',
          latitude: 41.9,
          longitude: 12.5,
          formattedAddress: 'Via Roma 1, Roma',
        },
      ];
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

      const result = await service.reverseGeocode(41.9, 12.5);

      expect(result).toHaveLength(1);
    });

    it('should return mock in development', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await service.reverseGeocode(41.9, 12.5);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].latitude).toBe(41.9);
    });

    it('should throw on API error in production', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        GOOGLE_PLACES_API_KEY: 'test-api-key',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await expect(prodService.reverseGeocode(41.9, 12.5)).rejects.toThrow(BadGatewayException);

      await prodService.onModuleDestroy();
    });
  });

  describe('validatePostalCode', () => {
    it('should reject non-5-digit codes', async () => {
      const result = await service.validatePostalCode('123');
      expect(result.valid).toBe(false);
    });

    it('should reject non-numeric codes', async () => {
      const result = await service.validatePostalCode('ABCDE');
      expect(result.valid).toBe(false);
    });

    it('should validate Italian postal code in development', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.validatePostalCode('00186');

      expect(result.valid).toBe(true);
    });

    it('should return invalid when geocode returns no results', async () => {
      const prodService = createService({
        NODE_ENV: 'production',
        GOOGLE_PLACES_API_KEY: 'test-api-key',
      });

      mockRedis.get.mockResolvedValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
      });

      const result = await prodService.validatePostalCode('99999');
      expect(result.valid).toBe(false);

      await prodService.onModuleDestroy();
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
