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
var TwilioService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwilioService = void 0;
exports.validatePhoneNumber = validatePhoneNumber;
exports.formatE164 = formatE164;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const twilio_1 = __importDefault(require("twilio"));
let TwilioService = TwilioService_1 = class TwilioService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(TwilioService_1.name);
        this.otpTtlSeconds = 10 * 60;
        this.maxAttempts = 3;
        this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
        this.accountSid = this.configService.get('TWILIO_ACCOUNT_SID') || '';
        this.authToken = this.configService.get('TWILIO_AUTH_TOKEN') || '';
        this.fromNumber = this.configService.get('TWILIO_PHONE_NUMBER') || '';
        this.verifyServiceSid = this.configService.get('TWILIO_VERIFY_SERVICE_SID') || '';
        this.twilio = (0, twilio_1.default)(this.accountSid, this.authToken);
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
    formatE164(phoneNumber, defaultCountry = 'IT') {
        let cleaned = phoneNumber.replace(/[^\d+]/g, '');
        if (cleaned.startsWith('00')) {
            cleaned = '+' + cleaned.substring(2);
        }
        if (!cleaned.startsWith('+')) {
            const countryPrefix = this.getCountryPrefix(defaultCountry);
            cleaned = countryPrefix + cleaned;
        }
        return cleaned;
    }
    async validatePhoneNumber(phoneNumber, options) {
        const formattedNumber = this.formatE164(phoneNumber);
        const cacheKey = `phone:validation:${Buffer.from(formattedNumber).toString('base64')}`;
        const cached = await this.getCached(cacheKey);
        if (cached) {
            return cached;
        }
        if (this.isDevelopment && (!this.accountSid || !this.authToken)) {
            const mockResult = this.getMockValidationResult(formattedNumber);
            await this.setCached(cacheKey, mockResult, 24 * 60 * 60);
            return mockResult;
        }
        try {
            const lookup = await this.twilio.lookups.v2.phoneNumbers(formattedNumber).fetch({
                fields: [
                    ...(options?.includeCarrier ? ['carrier'] : []),
                    ...(options?.includeCallerName ? ['caller_name'] : []),
                    'line_type_intelligence',
                ].join(','),
            });
            const result = this.parseLookupResult(formattedNumber, lookup);
            if (result.isValid) {
                await this.setCached(cacheKey, result, 24 * 60 * 60);
            }
            return result;
        }
        catch (error) {
            this.logger.error(`Phone validation error for ${formattedNumber}:`, error instanceof Error ? error.message : 'Unknown error');
            if (error.code === 20404) {
                return {
                    phoneNumber: formattedNumber,
                    formattedNumber,
                    isValid: false,
                    isMobile: false,
                    isLandline: false,
                    isVoip: false,
                    countryCode: this.extractCountryCode(formattedNumber),
                };
            }
            if (this.isDevelopment) {
                return this.getMockValidationResult(formattedNumber);
            }
            throw error;
        }
    }
    async isMobileNumber(phoneNumber) {
        const validation = await this.validatePhoneNumber(phoneNumber);
        return validation.isMobile;
    }
    async sendOtp(phoneNumber, template) {
        const formattedNumber = this.formatE164(phoneNumber);
        const code = this.generateOtpCode();
        const session = {
            phoneNumber: formattedNumber,
            code,
            attempts: 0,
            expiresAt: new Date(Date.now() + this.otpTtlSeconds * 1000),
            verified: false,
        };
        await this.saveOtpSession(formattedNumber, session);
        if (this.verifyServiceSid && !this.isDevelopment) {
            try {
                const verification = await this.twilio.verify.v2
                    .services(this.verifyServiceSid)
                    .verifications.create({ to: formattedNumber, channel: 'sms' });
                return {
                    success: true,
                    sid: verification.sid,
                    status: 'pending',
                };
            }
            catch (error) {
                this.logger.error('Twilio Verify error:', error instanceof Error ? error.message : 'Unknown error');
            }
        }
        if (this.isDevelopment && (!this.accountSid || !this.authToken)) {
            this.logger.log(`[DEV] OTP for ${formattedNumber}: ${code}`);
            return {
                success: true,
                status: 'pending',
                message: 'OTP sent (check logs for development code)',
            };
        }
        try {
            const messageBody = template
                ? template.replace('{{code}}', code)
                : `Il tuo codice di verifica MechMind è: ${code}. Valido per 10 minuti.`;
            const message = await this.twilio.messages.create({
                body: messageBody,
                from: this.fromNumber,
                to: formattedNumber,
            });
            return {
                success: true,
                sid: message.sid,
                status: 'pending',
            };
        }
        catch (error) {
            this.logger.error('SMS sending error:', error instanceof Error ? error.message : 'Unknown error');
            return {
                success: false,
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async verifyOtp(phoneNumber, code) {
        const formattedNumber = this.formatE164(phoneNumber);
        if (this.verifyServiceSid && !this.isDevelopment) {
            try {
                const verification = await this.twilio.verify.v2
                    .services(this.verifyServiceSid)
                    .verificationChecks.create({ to: formattedNumber, code });
                return {
                    success: true,
                    valid: verification.status === 'approved',
                };
            }
            catch (error) {
                this.logger.error('Twilio Verify check error:', error instanceof Error ? error.message : 'Unknown error');
            }
        }
        const session = await this.getOtpSession(formattedNumber);
        if (!session) {
            return { success: false, valid: false, message: 'Session not found or expired' };
        }
        if (new Date() > new Date(session.expiresAt)) {
            await this.deleteOtpSession(formattedNumber);
            return { success: false, valid: false, message: 'Code expired' };
        }
        if (session.attempts >= this.maxAttempts) {
            await this.deleteOtpSession(formattedNumber);
            return { success: false, valid: false, message: 'Too many attempts' };
        }
        session.attempts++;
        await this.saveOtpSession(formattedNumber, session);
        if (session.code !== code) {
            return {
                success: false,
                valid: false,
                message: `Invalid code. ${this.maxAttempts - session.attempts} attempts remaining.`,
            };
        }
        session.verified = true;
        await this.saveOtpSession(formattedNumber, session);
        return { success: true, valid: true };
    }
    async resendOtp(phoneNumber) {
        const formattedNumber = this.formatE164(phoneNumber);
        const session = await this.getOtpSession(formattedNumber);
        if (!session) {
            return this.sendOtp(phoneNumber);
        }
        const timeSinceLastSend = Date.now() - (new Date(session.expiresAt).getTime() - this.otpTtlSeconds * 1000);
        if (timeSinceLastSend < 60000) {
            const waitSeconds = Math.ceil((60000 - timeSinceLastSend) / 1000);
            return {
                success: false,
                status: 'error',
                message: `Please wait ${waitSeconds} seconds before requesting a new code`,
            };
        }
        const newCode = this.generateOtpCode();
        session.code = newCode;
        session.attempts = 0;
        session.expiresAt = new Date(Date.now() + this.otpTtlSeconds * 1000);
        await this.saveOtpSession(formattedNumber, session);
        if (this.isDevelopment && (!this.accountSid || !this.authToken)) {
            this.logger.log(`[DEV] Resent OTP for ${formattedNumber}: ${newCode}`);
            return {
                success: true,
                status: 'pending',
                message: 'OTP resent (check logs for development code)',
            };
        }
        try {
            const message = await this.twilio.messages.create({
                body: `Il tuo nuovo codice di verifica MechMind è: ${newCode}. Valido per 10 minuti.`,
                from: this.fromNumber,
                to: formattedNumber,
            });
            return {
                success: true,
                sid: message.sid,
                status: 'pending',
            };
        }
        catch (error) {
            this.logger.error('SMS resend error:', error instanceof Error ? error.message : 'Unknown error');
            return {
                success: false,
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async sendSms(phoneNumber, message) {
        const formattedNumber = this.formatE164(phoneNumber);
        if (this.isDevelopment && (!this.accountSid || !this.authToken)) {
            this.logger.log(`[DEV] SMS to ${formattedNumber}: ${message}`);
            return {
                success: true,
                status: 'pending',
                message: 'SMS logged (development mode)',
            };
        }
        try {
            const result = await this.twilio.messages.create({
                body: message,
                from: this.fromNumber,
                to: formattedNumber,
            });
            return {
                success: true,
                sid: result.sid,
                status: 'pending',
            };
        }
        catch (error) {
            this.logger.error('SMS send error:', error instanceof Error ? error.message : 'Unknown error');
            return {
                success: false,
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async validateMultiplePhones(phoneNumbers) {
        const results = new Map();
        for (const phone of phoneNumbers) {
            try {
                const result = await this.validatePhoneNumber(phone);
                results.set(phone, result);
            }
            catch (error) {
                this.logger.error(`Validation error for ${phone}:`, error instanceof Error ? error.message : 'Unknown error');
                results.set(phone, {
                    phoneNumber: phone,
                    formattedNumber: this.formatE164(phone),
                    isValid: false,
                    isMobile: false,
                    isLandline: false,
                    isVoip: false,
                    countryCode: this.extractCountryCode(this.formatE164(phone)),
                });
            }
            await this.delay(100);
        }
        return results;
    }
    parseLookupResult(formattedNumber, lookup) {
        const lookupRecord = lookup;
        const lineType = lookupRecord.lineTypeIntelligence?.type;
        return {
            phoneNumber: lookup.phoneNumber,
            formattedNumber,
            isValid: lookup.valid || false,
            isMobile: lineType === 'mobile',
            isLandline: lineType === 'landline',
            isVoip: lineType === 'voip',
            carrier: lookupRecord.carrier?.name,
            countryCode: lookup.countryCode || '',
            countryName: lookup.countryCode || '',
            nationalFormat: lookup.nationalFormat || '',
            callerName: lookupRecord.callerName?.callerName,
        };
    }
    getCountryPrefix(countryCode) {
        const prefixes = {
            IT: '+39',
            US: '+1',
            GB: '+44',
            FR: '+33',
            DE: '+49',
            ES: '+34',
            CH: '+41',
            AT: '+43',
            NL: '+31',
            BE: '+32',
        };
        return prefixes[countryCode.toUpperCase()] || '+39';
    }
    extractCountryCode(phoneNumber) {
        if (phoneNumber.startsWith('+39'))
            return 'IT';
        if (phoneNumber.startsWith('+1'))
            return 'US';
        if (phoneNumber.startsWith('+44'))
            return 'GB';
        if (phoneNumber.startsWith('+33'))
            return 'FR';
        if (phoneNumber.startsWith('+49'))
            return 'DE';
        if (phoneNumber.startsWith('+34'))
            return 'ES';
        if (phoneNumber.startsWith('+41'))
            return 'CH';
        if (phoneNumber.startsWith('+43'))
            return 'AT';
        return 'IT';
    }
    generateOtpCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async saveOtpSession(phoneNumber, session) {
        const key = `otp:session:${Buffer.from(phoneNumber).toString('base64')}`;
        await this.redis.setex(key, this.otpTtlSeconds, JSON.stringify(session));
    }
    async getOtpSession(phoneNumber) {
        const key = `otp:session:${Buffer.from(phoneNumber).toString('base64')}`;
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    async deleteOtpSession(phoneNumber) {
        const key = `otp:session:${Buffer.from(phoneNumber).toString('base64')}`;
        await this.redis.del(key);
    }
    async getCached(key) {
        try {
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        }
        catch (error) {
            this.logger.warn('Cache get error:', error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }
    async setCached(key, value, ttl) {
        try {
            await this.redis.setex(key, ttl, JSON.stringify(value));
        }
        catch (error) {
            this.logger.warn('Cache set error:', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    getMockValidationResult(phoneNumber) {
        const countryCode = this.extractCountryCode(phoneNumber);
        const isItalianMobile = phoneNumber.startsWith('+393');
        return {
            phoneNumber,
            formattedNumber: phoneNumber,
            isValid: phoneNumber.length >= 10,
            isMobile: isItalianMobile,
            isLandline: !isItalianMobile && countryCode === 'IT',
            isVoip: false,
            carrier: isItalianMobile ? 'TIM' : 'Telecom Italia',
            countryCode,
            countryName: this.getCountryName(countryCode),
            nationalFormat: phoneNumber.replace(/^\+\d{2}/, ''),
        };
    }
    getCountryName(code) {
        const names = {
            IT: 'Italy',
            US: 'United States',
            GB: 'United Kingdom',
            FR: 'France',
            DE: 'Germany',
            ES: 'Spain',
        };
        return names[code] || code;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async onModuleDestroy() {
        await this.redis.quit();
    }
};
exports.TwilioService = TwilioService;
exports.TwilioService = TwilioService = TwilioService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TwilioService);
async function validatePhoneNumber(phoneNumber, config) {
    const service = new TwilioService({
        get: (key) => {
            const configs = {
                TWILIO_ACCOUNT_SID: config?.accountSid || '',
                TWILIO_AUTH_TOKEN: config?.authToken || '',
                NODE_ENV: config?.accountSid ? 'production' : 'development',
                REDIS_URL: 'redis://localhost:6379',
            };
            return configs[key];
        },
    });
    try {
        return await service.validatePhoneNumber(phoneNumber);
    }
    finally {
        await service.onModuleDestroy();
    }
}
function formatE164(phoneNumber, defaultCountry = 'IT') {
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('00')) {
        cleaned = '+' + cleaned.substring(2);
    }
    if (!cleaned.startsWith('+')) {
        const prefixes = {
            IT: '+39',
            US: '+1',
            GB: '+44',
            FR: '+33',
            DE: '+49',
            ES: '+34',
            CH: '+41',
            AT: '+43',
        };
        cleaned = (prefixes[defaultCountry.toUpperCase()] || '+39') + cleaned;
    }
    return cleaned;
}
