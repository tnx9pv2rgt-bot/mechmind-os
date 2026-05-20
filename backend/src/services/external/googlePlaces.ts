/**
 * Google Places API Service
 * Autocomplete indirizzi, geocoding e reverse geocoding
 */

import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface AddressPrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface AddressDetails {
  street: string;
  number: string;
  city: string;
  postalCode: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeId?: string;
}

interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);
  private readonly redis: Redis;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api';
  private readonly cacheTtlSeconds = 7 * 24 * 60 * 60; // 7 giorni
  private readonly isDevelopment: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
    this.apiKey = this.configService.get('GOOGLE_PLACES_API_KEY') || '';

    // eslint-disable-next-line sonarjs/no-duplicate-string
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
   * Autocomplete indirizzi (ottimizzato per Italia)
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async autocompleteAddress(
    input: string,
    options?: {
      language?: string;
      components?: string;
      types?: string;
      location?: { lat: number; lng: number };
      radius?: number;
    },
  ): Promise<{ predictions: AddressPrediction[] }> {
    if (!input || input.length < 3) {
      return { predictions: [] };
    }

    // Check cache
    const cacheKey = `places:autocomplete:${Buffer.from(input).toString('base64')}`;
    const cached = await this.getCached<AddressPrediction[]>(cacheKey);
    if (cached) {
      return { predictions: cached };
    }

    if (this.isDevelopment && !this.apiKey) {
      return this.getMockPredictions(input);
    }

    try {
      const params = new URLSearchParams({
        input,
        key: this.apiKey,
        language: options?.language || 'it',
        components: options?.components || 'country:it',
      });

      if (options?.types) {
        params.append('types', options.types);
      }

      if (options?.location) {
        params.append('location', `${options.location.lat},${options.location.lng}`);
        if (options?.radius) {
          params.append('radius', options.radius.toString());
        }
      }

      const response = await fetch(`${this.baseUrl}/place/autocomplete/json?${params.toString()}`);

      if (!response.ok) {
        throw new BadGatewayException(`Places API HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new BadGatewayException(
          `Places API error: ${data.status} - ${data.error_message || ''}`,
        );
      }

      const predictions: AddressPrediction[] = (data.predictions || []).map(
        (p: Record<string, unknown>) => ({
          placeId: p.place_id as string,
          description: p.description as string,
          mainText:
            ((p.structured_formatting as Record<string, unknown>)?.main_text as string) ||
            (p.description as string),
          secondaryText:
            ((p.structured_formatting as Record<string, unknown>)?.secondary_text as string) || '',
          types: (p.types as string[]) || [],
        }),
      );

      // Cache results
      await this.setCached(cacheKey, predictions, 24 * 60 * 60); // 1 giorno per autocomplete

      return { predictions };
    } catch (error) {
      this.logger.error(
        'Autocomplete error:',
        // eslint-disable-next-line sonarjs/no-duplicate-string
        error instanceof Error ? error.message : 'Unknown error',
      );

      if (this.isDevelopment) {
        return this.getMockPredictions(input);
      }

      throw error;
    }
  }

  /**
   * Recupera dettagli completi di un place
   */
  async getPlaceDetails(placeId: string): Promise<AddressDetails> {
    const cacheKey = `places:details:${placeId}`;
    const cached = await this.getCached<AddressDetails>(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.isDevelopment && !this.apiKey) {
      return this.getMockPlaceDetails(placeId);
    }

    try {
      const params = new URLSearchParams({
        place_id: placeId,
        key: this.apiKey,
        language: 'it',
        fields: 'address_component,geometry,formatted_address',
      });

      const response = await fetch(`${this.baseUrl}/place/details/json?${params.toString()}`);

      if (!response.ok) {
        throw new BadGatewayException(`Place Details API HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'OK') {
        throw new BadGatewayException(`Place Details API error: ${data.status}`);
      }

      const result = data.result as Record<string, unknown>;
      const details = this.parseAddressComponents(
        result.address_components as GoogleAddressComponent[],
        (result.geometry as Record<string, unknown>)?.location as { lat: number; lng: number },
        result.formatted_address as string,
      );

      await this.setCached(cacheKey, details);

      return details;
    } catch (error) {
      this.logger.error(
        'Place details error:',
        error instanceof Error ? error.message : 'Unknown error',
      );

      if (this.isDevelopment) {
        return this.getMockPlaceDetails(placeId);
      }

      throw error;
    }
  }

  /**
   * Geocoding: indirizzo -> coordinate
   */
  async geocodeAddress(address: string): Promise<GeocodeResult[]> {
    const cacheKey = `places:geocode:${Buffer.from(address).toString('base64')}`;
    const cached = await this.getCached<GeocodeResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.isDevelopment && !this.apiKey) {
      return this.getMockGeocode(address);
    }

    try {
      const params = new URLSearchParams({
        address,
        key: this.apiKey,
        language: 'it',
        region: 'it',
      });

      const response = await fetch(`${this.baseUrl}/geocode/json?${params.toString()}`);

      if (!response.ok) {
        throw new BadGatewayException(`Geocoding API HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new BadGatewayException(`Geocoding API error: ${data.status}`);
      }

      const results: GeocodeResult[] = (data.results || []).map((r: Record<string, unknown>) => ({
        latitude: ((r.geometry as Record<string, unknown>)?.location as Record<string, number>)
          ?.lat,
        longitude: ((r.geometry as Record<string, unknown>)?.location as Record<string, number>)
          ?.lng,
        formattedAddress: r.formatted_address as string,
        placeId: r.place_id as string,
      }));

      await this.setCached(cacheKey, results);

      return results;
    } catch (error) {
      this.logger.error(
        'Geocoding error:',
        error instanceof Error ? error.message : 'Unknown error',
      );

      if (this.isDevelopment) {
        return this.getMockGeocode(address);
      }

      throw error;
    }
  }

  /**
   * Reverse Geocoding: coordinate -> indirizzo
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<AddressDetails[]> {
    const cacheKey = `places:reverse:${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    const cached = await this.getCached<AddressDetails[]>(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.isDevelopment && !this.apiKey) {
      return [this.getMockReverseGeocode(latitude, longitude)];
    }

    try {
      const params = new URLSearchParams({
        latlng: `${latitude},${longitude}`,
        key: this.apiKey,
        language: 'it',
      });

      const response = await fetch(`${this.baseUrl}/geocode/json?${params.toString()}`);

      if (!response.ok) {
        throw new BadGatewayException(`Reverse Geocoding API HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new BadGatewayException(`Reverse Geocoding API error: ${data.status}`);
      }

      const results: AddressDetails[] = (data.results || []).map((r: Record<string, unknown>) =>
        this.parseAddressComponents(
          r.address_components as GoogleAddressComponent[],
          (r.geometry as Record<string, unknown>)?.location as { lat: number; lng: number },
          r.formatted_address as string,
        ),
      );

      await this.setCached(cacheKey, results);

      return results;
    } catch (error) {
      this.logger.error(
        'Reverse geocoding error:',
        error instanceof Error ? error.message : 'Unknown error',
      );

      if (this.isDevelopment) {
        return [this.getMockReverseGeocode(latitude, longitude)];
      }

      throw error;
    }
  }

  /**
   * Valida e completa un CAP
   */
  async validatePostalCode(postalCode: string): Promise<{
    valid: boolean;
    city?: string;
    province?: string;
    region?: string;
  }> {
    if (!/^\d{5}$/.test(postalCode)) {
      return { valid: false };
    }

    try {
      const results = await this.geocodeAddress(`${postalCode}, Italia`);

      if (results.length === 0) {
        return { valid: false };
      }

      const details = await this.reverseGeocode(results[0].latitude, results[0].longitude);

      if (details.length === 0) {
        return { valid: false };
      }

      const first = details[0];
      return {
        valid: true,
        city: first.city,
        province: first.province,
      };
    } catch (error) {
      this.logger.error(
        'Postal code validation error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return { valid: false };
    }
  }

  /**
   * Parsa i componenti dell'indirizzo
   */
  private parseAddressComponents(
    components: GoogleAddressComponent[],
    geometry: { lat: number; lng: number },
    formattedAddress: string,
  ): AddressDetails {
    const getComponent = (type: string, useShort = false): string => {
      const component = components.find((c: GoogleAddressComponent) => c.types.includes(type));
      return component ? (useShort ? component.short_name : component.long_name) : '';
    };

    const streetNumber = getComponent('street_number');
    const route = getComponent('route');
    const locality = getComponent('locality');
    const adminArea2 = getComponent('administrative_area_level_2');
    const adminArea1 = getComponent('administrative_area_level_1', true);
    const country = getComponent('country');
    const postalCode = getComponent('postal_code');

    return {
      street: route,
      number: streetNumber,
      city: locality || adminArea2,
      postalCode,
      province: adminArea1,
      country,
      latitude: geometry?.lat || 0,
      longitude: geometry?.lng || 0,
      formattedAddress,
    };
  }

  // ==================== CACHE HELPERS ====================

  private async getCached<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      return cached ? (JSON.parse(cached) as T) : null;
    } catch (error) {
      this.logger.warn(
        'Cache get error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return null;
    }
  }

  private async setCached<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const seconds = ttl || this.cacheTtlSeconds;
      await this.redis.setex(key, seconds, JSON.stringify(value));
    } catch (error) {
      this.logger.warn(
        'Cache set error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  // ==================== MOCK DATA (Development) ====================

  private getMockPredictions(input: string): { predictions: AddressPrediction[] } {
    return {
      predictions: [
        {
          placeId: 'ChIJrTLJRciLekgRQtA7-sQq2Qc',
          description: `${input}, Roma, Italia`,
          mainText: input,
          secondaryText: 'Roma, Italia',
          types: ['geocode', 'establishment'],
        },
        {
          placeId: 'ChIJt2CZLXWIekgRWJmKRK3U_zA',
          description: `${input}, Milano, Italia`,
          mainText: input,
          secondaryText: 'Milano, Italia',
          types: ['geocode', 'establishment'],
        },
        {
          placeId: 'ChIJZ3VuJH9yfxMRJHH6B7DkgU0',
          description: `${input}, Napoli, Italia`,
          mainText: input,
          secondaryText: 'Napoli, Italia',
          types: ['geocode', 'establishment'],
        },
      ],
    };
  }

  private getMockPlaceDetails(placeId: string): AddressDetails {
    const mocks: Record<string, AddressDetails> = {
      'ChIJrTLJRciLekgRQtA7-sQq2Qc': {
        street: 'Via del Corso',
        number: '1',
        city: 'Roma',
        postalCode: '00186',
        province: 'RM',
        country: 'Italia',
        latitude: 41.9028,
        longitude: 12.4964,
        formattedAddress: 'Via del Corso, 1, 00186 Roma RM, Italia',
      },
      ChIJt2CZLXWIekgRWJmKRK3U_zA: {
        street: 'Via Montenapoleone',
        number: '1',
        city: 'Milano',
        postalCode: '20121',
        province: 'MI',
        country: 'Italia',
        latitude: 45.4654,
        longitude: 9.1859,
        formattedAddress: 'Via Montenapoleone, 1, 20121 Milano MI, Italia',
      },
    };

    return (
      // eslint-disable-next-line security/detect-object-injection
      mocks[placeId] || {
        street: 'Via Example',
        number: '1',
        city: 'Roma',
        postalCode: '00100',
        province: 'RM',
        country: 'Italia',
        latitude: 41.9,
        longitude: 12.5,
        formattedAddress: 'Via Example, 1, 00100 Roma RM, Italia',
      }
    );
  }

  private getMockGeocode(address: string): GeocodeResult[] {
    return [
      {
        latitude: 41.9028,
        longitude: 12.4964,
        formattedAddress: address,
        placeId: 'ChIJrTLJRciLekgRQtA7-sQq2Qc',
      },
    ];
  }

  private getMockReverseGeocode(lat: number, lng: number): AddressDetails {
    return {
      street: 'Via del Corso',
      number: '1',
      city: 'Roma',
      postalCode: '00186',
      province: 'RM',
      country: 'Italia',
      latitude: lat,
      longitude: lng,
      formattedAddress: 'Via del Corso, 1, 00186 Roma RM, Italia',
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}

// Standalone functions
export async function autocompleteAddress(
  input: string,
  apiKey?: string,
): Promise<{ predictions: AddressPrediction[] }> {
  const service = new GooglePlacesService({
    get: (key: string) => {
      const configs: Record<string, string> = {
        GOOGLE_PLACES_API_KEY: apiKey || '',
        NODE_ENV: apiKey ? 'production' : 'development',
        REDIS_URL: 'redis://localhost:6379',
      };
      // eslint-disable-next-line security/detect-object-injection
      return configs[key];
    },
  } as ConfigService);

  try {
    return await service.autocompleteAddress(input);
  } finally {
    await service.onModuleDestroy();
  }
}

export async function getPlaceDetails(placeId: string, apiKey?: string): Promise<AddressDetails> {
  const service = new GooglePlacesService({
    get: (key: string) => {
      const configs: Record<string, string> = {
        GOOGLE_PLACES_API_KEY: apiKey || '',
        NODE_ENV: apiKey ? 'production' : 'development',
        REDIS_URL: 'redis://localhost:6379',
      };
      // eslint-disable-next-line security/detect-object-injection
      return configs[key];
    },
  } as ConfigService);

  try {
    return await service.getPlaceDetails(placeId);
  } finally {
    await service.onModuleDestroy();
  }
}
