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
var GooglePlacesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GooglePlacesService = void 0;
exports.autocompleteAddress = autocompleteAddress;
exports.getPlaceDetails = getPlaceDetails;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
let GooglePlacesService = GooglePlacesService_1 = class GooglePlacesService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(GooglePlacesService_1.name);
        this.baseUrl = 'https://maps.googleapis.com/maps/api';
        this.cacheTtlSeconds = 7 * 24 * 60 * 60;
        this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
        this.apiKey = this.configService.get('GOOGLE_PLACES_API_KEY') || '';
        const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
        this.redis = new ioredis_1.default(redisUrl, {
            password: this.configService.get('REDIS_PASSWORD') || undefined,
            db: parseInt(this.configService.get('REDIS_DB') || '0'),
            retryStrategy: (times) => Math.min(times * 50, 2000),
        });
        this.redis.on('error', (err) => {
            this.logger.error('Redis connection error:', err.message);
        });
    }
    async autocompleteAddress(input, options) {
        if (!input || input.length < 3) {
            return { predictions: [] };
        }
        const cacheKey = `places:autocomplete:${Buffer.from(input).toString('base64')}`;
        const cached = await this.getCached(cacheKey);
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
                throw new Error(`Places API HTTP error: ${response.status}`);
            }
            const data = await response.json();
            if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                throw new Error(`Places API error: ${data.status} - ${data.error_message || ''}`);
            }
            const predictions = (data.predictions || []).map((p) => ({
                placeId: p.place_id,
                description: p.description,
                mainText: p.structured_formatting?.main_text || p.description,
                secondaryText: p.structured_formatting?.secondary_text || '',
                types: p.types || [],
            }));
            await this.setCached(cacheKey, predictions, 24 * 60 * 60);
            return { predictions };
        }
        catch (error) {
            this.logger.error('Autocomplete error:', error.message);
            if (this.isDevelopment) {
                return this.getMockPredictions(input);
            }
            throw error;
        }
    }
    async getPlaceDetails(placeId) {
        const cacheKey = `places:details:${placeId}`;
        const cached = await this.getCached(cacheKey);
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
                throw new Error(`Place Details API HTTP error: ${response.status}`);
            }
            const data = await response.json();
            if (data.status !== 'OK') {
                throw new Error(`Place Details API error: ${data.status}`);
            }
            const result = data.result;
            const details = this.parseAddressComponents(result.address_components, result.geometry?.location, result.formatted_address);
            await this.setCached(cacheKey, details);
            return details;
        }
        catch (error) {
            this.logger.error('Place details error:', error.message);
            if (this.isDevelopment) {
                return this.getMockPlaceDetails(placeId);
            }
            throw error;
        }
    }
    async geocodeAddress(address) {
        const cacheKey = `places:geocode:${Buffer.from(address).toString('base64')}`;
        const cached = await this.getCached(cacheKey);
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
                throw new Error(`Geocoding API HTTP error: ${response.status}`);
            }
            const data = await response.json();
            if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                throw new Error(`Geocoding API error: ${data.status}`);
            }
            const results = (data.results || []).map((r) => ({
                latitude: r.geometry.location.lat,
                longitude: r.geometry.location.lng,
                formattedAddress: r.formatted_address,
                placeId: r.place_id,
            }));
            await this.setCached(cacheKey, results);
            return results;
        }
        catch (error) {
            this.logger.error('Geocoding error:', error.message);
            if (this.isDevelopment) {
                return this.getMockGeocode(address);
            }
            throw error;
        }
    }
    async reverseGeocode(latitude, longitude) {
        const cacheKey = `places:reverse:${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        const cached = await this.getCached(cacheKey);
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
                throw new Error(`Reverse Geocoding API HTTP error: ${response.status}`);
            }
            const data = await response.json();
            if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                throw new Error(`Reverse Geocoding API error: ${data.status}`);
            }
            const results = (data.results || []).map((r) => this.parseAddressComponents(r.address_components, r.geometry?.location, r.formatted_address));
            await this.setCached(cacheKey, results);
            return results;
        }
        catch (error) {
            this.logger.error('Reverse geocoding error:', error.message);
            if (this.isDevelopment) {
                return [this.getMockReverseGeocode(latitude, longitude)];
            }
            throw error;
        }
    }
    async validatePostalCode(postalCode) {
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
        }
        catch (error) {
            this.logger.error('Postal code validation error:', error.message);
            return { valid: false };
        }
    }
    parseAddressComponents(components, geometry, formattedAddress) {
        const getComponent = (type, useShort = false) => {
            const component = components.find((c) => c.types.includes(type));
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
    async getCached(key) {
        try {
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        }
        catch (error) {
            this.logger.warn('Cache get error:', error.message);
            return null;
        }
    }
    async setCached(key, value, ttl) {
        try {
            const seconds = ttl || this.cacheTtlSeconds;
            await this.redis.setex(key, seconds, JSON.stringify(value));
        }
        catch (error) {
            this.logger.warn('Cache set error:', error.message);
        }
    }
    getMockPredictions(input) {
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
    getMockPlaceDetails(placeId) {
        const mocks = {
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
            'ChIJt2CZLXWIekgRWJmKRK3U_zA': {
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
        return mocks[placeId] || {
            street: 'Via Example',
            number: '1',
            city: 'Roma',
            postalCode: '00100',
            province: 'RM',
            country: 'Italia',
            latitude: 41.9,
            longitude: 12.5,
            formattedAddress: 'Via Example, 1, 00100 Roma RM, Italia',
        };
    }
    getMockGeocode(address) {
        return [{
                latitude: 41.9028,
                longitude: 12.4964,
                formattedAddress: address,
                placeId: 'ChIJrTLJRciLekgRQtA7-sQq2Qc',
            }];
    }
    getMockReverseGeocode(lat, lng) {
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
    async onModuleDestroy() {
        await this.redis.quit();
    }
};
exports.GooglePlacesService = GooglePlacesService;
exports.GooglePlacesService = GooglePlacesService = GooglePlacesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GooglePlacesService);
async function autocompleteAddress(input, apiKey) {
    const service = new GooglePlacesService({
        get: (key) => {
            const configs = {
                GOOGLE_PLACES_API_KEY: apiKey || '',
                NODE_ENV: apiKey ? 'production' : 'development',
                REDIS_URL: 'redis://localhost:6379',
            };
            return configs[key];
        },
    });
    try {
        return await service.autocompleteAddress(input);
    }
    finally {
        await service.onModuleDestroy();
    }
}
async function getPlaceDetails(placeId, apiKey) {
    const service = new GooglePlacesService({
        get: (key) => {
            const configs = {
                GOOGLE_PLACES_API_KEY: apiKey || '',
                NODE_ENV: apiKey ? 'production' : 'development',
                REDIS_URL: 'redis://localhost:6379',
            };
            return configs[key];
        },
    });
    try {
        return await service.getPlaceDetails(placeId);
    }
    finally {
        await service.onModuleDestroy();
    }
}
