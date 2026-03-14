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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ValidationController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const zerobounce_1 = require("./zerobounce");
const viesApi_1 = require("./viesApi");
const googlePlaces_1 = require("./googlePlaces");
let ValidationController = ValidationController_1 = class ValidationController {
    constructor(configService, zeroBounceService, viesApiService, googlePlacesService) {
        this.configService = configService;
        this.zeroBounceService = zeroBounceService;
        this.viesApiService = viesApiService;
        this.googlePlacesService = googlePlacesService;
        this.logger = new common_1.Logger(ValidationController_1.name);
        this.rateLimits = new Map();
        this.RATE_LIMIT_WINDOW = 60 * 1000;
        this.RATE_LIMIT_MAX_REQUESTS = 10;
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
    async validateEmail(email, forwardedFor, realIp) {
        const clientIp = this.getClientIp(forwardedFor, realIp);
        if (!this.checkRateLimit(clientIp)) {
            throw new common_1.HttpException('Rate limit exceeded. Maximum 10 requests per minute.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        if (!email || typeof email !== 'string') {
            throw new common_1.HttpException('Email parameter is required', common_1.HttpStatus.BAD_REQUEST);
        }
        const normalizedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return {
                email: normalizedEmail,
                status: 'invalid',
                isValid: false,
                isDeliverable: false,
                isSyntaxValid: false,
                isDomainValid: false,
                isDisposable: false,
                isRoleBased: false,
                isCatchAll: false,
                isFree: false,
                score: 0,
                processedAt: new Date(),
                suggestion: this.getTypoSuggestion(normalizedEmail),
            };
        }
        const cacheKey = `validation:email:${Buffer.from(normalizedEmail).toString('base64')}`;
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                this.logger.debug(`Cache hit for email validation: ${normalizedEmail}`);
                return JSON.parse(cached);
            }
        }
        catch (error) {
            this.logger.warn('Cache read error:', error instanceof Error ? error.message : 'Unknown error');
        }
        try {
            const result = await this.zeroBounceService.verifyEmail(normalizedEmail);
            const suggestion = this.getTypoSuggestion(normalizedEmail);
            const resultWithSuggestion = {
                ...result,
                suggestion: suggestion !== normalizedEmail ? suggestion : undefined,
                typoCorrected: suggestion !== normalizedEmail ? suggestion : undefined,
            };
            try {
                await this.redis.setex(cacheKey, 3600, JSON.stringify(resultWithSuggestion));
            }
            catch (error) {
                this.logger.warn('Cache write error:', error instanceof Error ? error.message : 'Unknown error');
            }
            return resultWithSuggestion;
        }
        catch (error) {
            this.logger.error(`Email validation error for ${normalizedEmail}:`, error instanceof Error ? error.message : 'Unknown error');
            return {
                email: normalizedEmail,
                status: 'unknown',
                isValid: true,
                isDeliverable: true,
                isSyntaxValid: true,
                isDomainValid: true,
                isDisposable: false,
                isRoleBased: false,
                isCatchAll: false,
                isFree: this.isFreeEmailProvider(normalizedEmail),
                score: 50,
                processedAt: new Date(),
            };
        }
    }
    async validateVat(dto, forwardedFor, realIp) {
        const clientIp = this.getClientIp(forwardedFor, realIp);
        if (!this.checkRateLimit(clientIp)) {
            throw new common_1.HttpException('Rate limit exceeded. Maximum 10 requests per minute.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        if (!dto.vatNumber || typeof dto.vatNumber !== 'string') {
            throw new common_1.HttpException('VAT number is required', common_1.HttpStatus.BAD_REQUEST);
        }
        const vatNumber = this.normalizeVatNumber(dto.vatNumber);
        const countryCode = dto.countryCode?.toUpperCase() || this.extractCountryCode(vatNumber) || 'IT';
        const cleanVat = this.extractVatNumber(vatNumber, countryCode);
        const fullVat = `${countryCode}${cleanVat}`;
        const isValidFormat = this.isValidVatFormat(countryCode, cleanVat);
        const luhnValid = countryCode === 'IT' ? this.validateItalianLuhn(cleanVat) : true;
        if (!isValidFormat) {
            return {
                valid: false,
                countryCode,
                vatNumber: cleanVat,
                requestDate: new Date(),
                isValidFormat: false,
                luhnValid: false,
            };
        }
        const cacheKey = `validation:vat:${fullVat}`;
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                this.logger.debug(`Cache hit for VAT validation: ${fullVat}`);
                const parsed = JSON.parse(cached);
                return { ...parsed, isValidFormat, luhnValid };
            }
        }
        catch (error) {
            this.logger.warn('Cache read error:', error instanceof Error ? error.message : 'Unknown error');
        }
        try {
            const result = await this.viesApiService.verifyVatNumber(fullVat);
            const response = {
                ...result,
                isValidFormat,
                luhnValid,
            };
            try {
                await this.redis.setex(cacheKey, 24 * 3600, JSON.stringify(response));
            }
            catch (error) {
                this.logger.warn('Cache write error:', error instanceof Error ? error.message : 'Unknown error');
            }
            return response;
        }
        catch (error) {
            this.logger.error(`VAT validation error for ${fullVat}:`, error instanceof Error ? error.message : 'Unknown error');
            return {
                valid: luhnValid,
                countryCode,
                vatNumber: cleanVat,
                requestDate: new Date(),
                isValidFormat,
                luhnValid,
            };
        }
    }
    async autocompleteAddress(input, language = 'it', forwardedFor, realIp) {
        const clientIp = this.getClientIp(forwardedFor, realIp);
        if (!this.checkRateLimit(clientIp)) {
            throw new common_1.HttpException('Rate limit exceeded. Maximum 10 requests per minute.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        if (!input || input.length < 3) {
            return { predictions: [] };
        }
        const cacheKey = `validation:address:${language}:${Buffer.from(input).toString('base64')}`;
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                this.logger.debug(`Cache hit for address autocomplete: ${input}`);
                return JSON.parse(cached);
            }
        }
        catch (error) {
            this.logger.warn('Cache read error:', error instanceof Error ? error.message : 'Unknown error');
        }
        try {
            const result = await this.googlePlacesService.autocompleteAddress(input, {
                language,
                components: 'country:it',
            });
            try {
                await this.redis.setex(cacheKey, 24 * 3600, JSON.stringify(result));
            }
            catch (error) {
                this.logger.warn('Cache write error:', error instanceof Error ? error.message : 'Unknown error');
            }
            return result;
        }
        catch (error) {
            this.logger.error('Address autocomplete error:', error instanceof Error ? error.message : 'Unknown error');
            return { predictions: [] };
        }
    }
    async getAddressDetails(placeId, forwardedFor, realIp) {
        const clientIp = this.getClientIp(forwardedFor, realIp);
        if (!this.checkRateLimit(clientIp)) {
            throw new common_1.HttpException('Rate limit exceeded. Maximum 10 requests per minute.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        if (!placeId) {
            throw new common_1.HttpException('Place ID is required', common_1.HttpStatus.BAD_REQUEST);
        }
        const cacheKey = `validation:address:details:${placeId}`;
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                this.logger.debug(`Cache hit for address details: ${placeId}`);
                return JSON.parse(cached);
            }
        }
        catch (error) {
            this.logger.warn('Cache read error:', error instanceof Error ? error.message : 'Unknown error');
        }
        try {
            const result = await this.googlePlacesService.getPlaceDetails(placeId);
            try {
                await this.redis.setex(cacheKey, 30 * 24 * 3600, JSON.stringify(result));
            }
            catch (error) {
                this.logger.warn('Cache write error:', error instanceof Error ? error.message : 'Unknown error');
            }
            return result;
        }
        catch (error) {
            this.logger.error('Address details error:', error instanceof Error ? error.message : 'Unknown error');
            throw new common_1.HttpException('Failed to fetch address details', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async validatePostalCode(code, forwardedFor, realIp) {
        const clientIp = this.getClientIp(forwardedFor, realIp);
        if (!this.checkRateLimit(clientIp)) {
            throw new common_1.HttpException('Rate limit exceeded. Maximum 10 requests per minute.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        if (!code || !/^\d{5}$/.test(code)) {
            return { valid: false };
        }
        return this.googlePlacesService.validatePostalCode(code);
    }
    getClientIp(forwardedFor, realIp) {
        if (forwardedFor) {
            return forwardedFor.split(',')[0].trim();
        }
        if (realIp) {
            return realIp;
        }
        return 'unknown';
    }
    checkRateLimit(clientIp) {
        const now = Date.now();
        const entry = this.rateLimits.get(clientIp);
        if (!entry || now > entry.resetTime) {
            this.rateLimits.set(clientIp, {
                count: 1,
                resetTime: now + this.RATE_LIMIT_WINDOW,
            });
            return true;
        }
        if (entry.count >= this.RATE_LIMIT_MAX_REQUESTS) {
            return false;
        }
        entry.count++;
        return true;
    }
    getTypoSuggestion(email) {
        const commonTypos = {
            'gmial.com': 'gmail.com',
            'gmail.co': 'gmail.com',
            'gmail.con': 'gmail.com',
            'gmail.it': 'gmail.com',
            'gnail.com': 'gmail.com',
            'gmaill.com': 'gmail.com',
            'gamil.com': 'gmail.com',
            'gmal.com': 'gmail.com',
            'yahooo.com': 'yahoo.com',
            'yaho.com': 'yahoo.com',
            'yahoo.it': 'yahoo.com',
            'hotmial.com': 'hotmail.com',
            'hotmail.co': 'hotmail.com',
            'hotmail.con': 'hotmail.com',
            'hotmail.it': 'hotmail.com',
            'outlok.com': 'outlook.com',
            'outlook.co': 'outlook.com',
            'outlook.con': 'outlook.com',
            'outlook.it': 'outlook.com',
            'libero.co': 'libero.it',
            'libero.com': 'libero.it',
            'virgilio.co': 'virgilio.it',
            'virgilio.com': 'virgilio.it',
            'tiscali.co': 'tiscali.it',
            'tiscali.com': 'tiscali.it',
        };
        const parts = email.split('@');
        if (parts.length !== 2)
            return email;
        const domain = parts[1].toLowerCase();
        const correctedDomain = commonTypos[domain];
        if (correctedDomain) {
            return `${parts[0]}@${correctedDomain}`;
        }
        return email;
    }
    isFreeEmailProvider(email) {
        const freeDomains = [
            'gmail.com',
            'yahoo.com',
            'hotmail.com',
            'outlook.com',
            'libero.it',
            'virgilio.it',
            'tiscali.it',
            'alice.it',
            'live.com',
            'icloud.com',
            'me.com',
            'mac.com',
            'protonmail.com',
            'zoho.com',
            'yandex.com',
            'mail.com',
        ];
        const domain = email.split('@')[1]?.toLowerCase();
        return domain ? freeDomains.includes(domain) : false;
    }
    normalizeVatNumber(vat) {
        return vat.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    }
    extractCountryCode(vat) {
        if (vat.length < 2)
            return null;
        const code = vat.substring(0, 2);
        return /^[A-Z]{2}$/i.test(code) ? code.toUpperCase() : null;
    }
    extractVatNumber(vat, countryCode) {
        if (vat.startsWith(countryCode)) {
            return vat.substring(2);
        }
        return vat;
    }
    isValidVatFormat(countryCode, vatNumber) {
        const patterns = {
            IT: /^\d{11}$/,
            DE: /^\d{9}$/,
            FR: /^[A-Z0-9]{2}\d{9}$/,
            ES: /^[A-Z]\d{8}$|^\d{8}[A-Z]$/,
            GB: /^\d{9}$|^\d{12}$|^GD\d{3}$|^HA\d{3}$/,
        };
        const pattern = patterns[countryCode];
        if (!pattern)
            return /^[A-Z0-9]{8,12}$/.test(vatNumber);
        return pattern.test(vatNumber);
    }
    validateItalianLuhn(vatNumber) {
        if (!/^\d{11}$/.test(vatNumber))
            return false;
        let sum = 0;
        for (let i = 0; i < 10; i++) {
            let digit = parseInt(vatNumber.charAt(i), 10);
            if (i % 2 === 1) {
                digit *= 2;
                if (digit > 9)
                    digit -= 9;
            }
            sum += digit;
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit === parseInt(vatNumber.charAt(10), 10);
    }
    async onModuleDestroy() {
        await this.redis.quit();
    }
};
exports.ValidationController = ValidationController;
__decorate([
    (0, common_1.Get)('email'),
    __param(0, (0, common_1.Query)('email')),
    __param(1, (0, common_1.Headers)('x-forwarded-for')),
    __param(2, (0, common_1.Headers)('x-real-ip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ValidationController.prototype, "validateEmail", null);
__decorate([
    (0, common_1.Post)('vat'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-forwarded-for')),
    __param(2, (0, common_1.Headers)('x-real-ip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ValidationController.prototype, "validateVat", null);
__decorate([
    (0, common_1.Get)('address/autocomplete'),
    __param(0, (0, common_1.Query)('input')),
    __param(1, (0, common_1.Query)('language')),
    __param(2, (0, common_1.Headers)('x-forwarded-for')),
    __param(3, (0, common_1.Headers)('x-real-ip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], ValidationController.prototype, "autocompleteAddress", null);
__decorate([
    (0, common_1.Get)('address/details'),
    __param(0, (0, common_1.Query)('placeId')),
    __param(1, (0, common_1.Headers)('x-forwarded-for')),
    __param(2, (0, common_1.Headers)('x-real-ip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ValidationController.prototype, "getAddressDetails", null);
__decorate([
    (0, common_1.Get)('postalcode/validate'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Headers)('x-forwarded-for')),
    __param(2, (0, common_1.Headers)('x-real-ip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ValidationController.prototype, "validatePostalCode", null);
exports.ValidationController = ValidationController = ValidationController_1 = __decorate([
    (0, common_1.Controller)('api/validation'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        zerobounce_1.ZeroBounceService,
        viesApi_1.ViesApiService,
        googlePlaces_1.GooglePlacesService])
], ValidationController);
