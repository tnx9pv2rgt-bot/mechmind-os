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
var ZeroBounceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZeroBounceService = void 0;
exports.verifyEmail = verifyEmail;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
let ZeroBounceService = ZeroBounceService_1 = class ZeroBounceService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(ZeroBounceService_1.name);
        this.baseUrl = 'https://api.zerobounce.net/v2';
        this.bulkUrl = 'https://bulkapi.zerobounce.net/v2';
        this.cacheTtlSeconds = 7 * 24 * 60 * 60;
        this.requestTimestamps = [];
        this.rateLimitWindow = 60000;
        this.rateLimitMax = 20;
        this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
        this.apiKey = this.configService.get('ZEROBOUNCE_API_KEY') || '';
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
    async verifyEmail(email, ipAddress) {
        const normalizedEmail = this.normalizeEmail(email);
        if (!this.isValidEmailFormat(normalizedEmail)) {
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
            };
        }
        const cacheKey = `email:verification:${Buffer.from(normalizedEmail).toString('base64')}`;
        const cached = await this.getCached(cacheKey);
        if (cached) {
            this.logger.debug(`Cache hit for email: ${normalizedEmail}`);
            return cached;
        }
        if (!this.checkRateLimit()) {
            this.logger.warn('Email verification rate limit exceeded');
            if (this.isDevelopment) {
                return this.getMockResult(normalizedEmail);
            }
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (this.isDevelopment && !this.apiKey) {
            const mockResult = this.getMockResult(normalizedEmail);
            await this.setCached(cacheKey, mockResult);
            return mockResult;
        }
        try {
            const params = new URLSearchParams({
                api_key: this.apiKey,
                email: normalizedEmail,
            });
            if (ipAddress) {
                params.append('ip_address', ipAddress);
            }
            const response = await fetch(`${this.baseUrl}/validate?${params.toString()}`, {
                method: 'GET',
            });
            if (!response.ok) {
                throw new Error(`ZeroBounce API HTTP error: ${response.status}`);
            }
            const data = await response.json();
            const result = this.parseApiResponse(normalizedEmail, data);
            if (result.status !== 'unknown') {
                await this.setCached(cacheKey, result);
            }
            return result;
        }
        catch (error) {
            this.logger.error(`Email verification error for ${normalizedEmail}:`, error instanceof Error ? error.message : 'Unknown error');
            if (this.isDevelopment) {
                return this.getMockResult(normalizedEmail);
            }
            throw error;
        }
    }
    async verifyMultipleEmails(emails) {
        const results = new Map();
        const batchSize = 5;
        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(batch.map(email => this.verifyEmail(email)));
            batch.forEach((email, index) => {
                const result = batchResults[index];
                if (result.status === 'fulfilled') {
                    results.set(email, result.value);
                }
                else {
                    results.set(email, {
                        email,
                        status: 'unknown',
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
                    });
                }
            });
            if (i + batchSize < emails.length) {
                await this.delay(1000);
            }
        }
        return results;
    }
    async uploadBulkVerification(fileBuffer, fileName) {
        if (this.isDevelopment && !this.apiKey) {
            return {
                id: `mock-${Date.now()}`,
                fileName,
                status: 'completed',
                totalEmails: 100,
                validEmails: 85,
                invalidEmails: 15,
                completedAt: new Date(),
            };
        }
        try {
            const boundary = `----FormBoundary${Math.random().toString(36).substring(2)}`;
            const chunks = [];
            chunks.push(Buffer.from(`--${boundary}\r\n`));
            chunks.push(Buffer.from(`Content-Disposition: form-data; name="api_key"\r\n\r\n`));
            chunks.push(Buffer.from(`${this.apiKey}\r\n`));
            chunks.push(Buffer.from(`--${boundary}\r\n`));
            chunks.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`));
            chunks.push(Buffer.from(`Content-Type: text/csv\r\n\r\n`));
            chunks.push(fileBuffer);
            chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));
            const body = Buffer.concat(chunks);
            const response = await fetch(`${this.bulkUrl}/sendfile`, {
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': body.length.toString(),
                },
                body: body,
            });
            if (!response.ok) {
                throw new Error(`ZeroBounce Bulk API HTTP error: ${response.status}`);
            }
            const data = await response.json();
            if (data.success === false) {
                throw new Error(`ZeroBounce Bulk API error: ${data.message}`);
            }
            return {
                id: data.file_id,
                fileName,
                status: 'pending',
                totalEmails: data.total_emails || 0,
                validEmails: 0,
                invalidEmails: 0,
            };
        }
        catch (error) {
            this.logger.error('Bulk upload error:', error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }
    async getBulkStatus(fileId) {
        if (this.isDevelopment && fileId.startsWith('mock-')) {
            return {
                id: fileId,
                fileName: 'mock.csv',
                status: 'completed',
                totalEmails: 100,
                validEmails: 85,
                invalidEmails: 15,
                completedAt: new Date(),
            };
        }
        try {
            const params = new URLSearchParams({
                api_key: this.apiKey,
                file_id: fileId,
            });
            const response = await fetch(`${this.bulkUrl}/filestatus?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`ZeroBounce Status API HTTP error: ${response.status}`);
            }
            const data = await response.json();
            const statusMap = {
                Pending: 'pending',
                Processing: 'pending',
                Completed: 'completed',
                Error: 'error',
            };
            return {
                id: fileId,
                fileName: data.file_name || '',
                status: statusMap[data.status] || 'error',
                totalEmails: data.total_emails || 0,
                validEmails: data.complete_percentage || 0,
                invalidEmails: 0,
            };
        }
        catch (error) {
            this.logger.error('Bulk status error:', error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }
    async downloadBulkResults(fileId) {
        if (this.isDevelopment && fileId.startsWith('mock-')) {
            return Buffer.from('email,status\ntest@example.com,valid');
        }
        try {
            const params = new URLSearchParams({
                api_key: this.apiKey,
                file_id: fileId,
            });
            const response = await fetch(`${this.bulkUrl}/getfile?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`ZeroBounce Download API HTTP error: ${response.status}`);
            }
            return Buffer.from(await response.arrayBuffer());
        }
        catch (error) {
            this.logger.error('Bulk download error:', error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }
    async getCredits() {
        if (this.isDevelopment && !this.apiKey) {
            return { credits: 999999 };
        }
        try {
            const params = new URLSearchParams({
                api_key: this.apiKey,
            });
            const response = await fetch(`${this.baseUrl}/getcredits?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`ZeroBounce Credits API HTTP error: ${response.status}`);
            }
            const data = await response.json();
            return { credits: data.credits || 0 };
        }
        catch (error) {
            this.logger.error('Get credits error:', error instanceof Error ? error.message : 'Unknown error');
            return { credits: 0 };
        }
    }
    validateSyntax(email) {
        const errors = [];
        const normalizedEmail = this.normalizeEmail(email);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!normalizedEmail) {
            errors.push('Email is empty');
            return { valid: false, errors };
        }
        if (normalizedEmail.length > 254) {
            errors.push('Email exceeds maximum length of 254 characters');
        }
        if (!emailRegex.test(normalizedEmail)) {
            errors.push('Invalid email format');
        }
        const [localPart, domain] = normalizedEmail.split('@');
        if (!localPart || localPart.length > 64) {
            errors.push('Local part exceeds 64 characters or is empty');
        }
        if (!domain) {
            errors.push('Domain is missing');
        }
        else {
            const domainParts = domain.split('.');
            if (domainParts.length < 2) {
                errors.push('Domain must have a TLD');
            }
            const tld = domainParts[domainParts.length - 1];
            if (!/^[a-zA-Z]{2,}$/.test(tld)) {
                errors.push('Invalid TLD');
            }
        }
        const disposableDomains = [
            'tempmail.com',
            'throwaway.com',
            'mailinator.com',
            'guerrillamail.com',
            '10minutemail.com',
            'yopmail.com',
        ];
        if (domain && disposableDomains.includes(domain.toLowerCase())) {
            errors.push('Disposable email addresses are not allowed');
        }
        return { valid: errors.length === 0, errors };
    }
    parseApiResponse(email, data) {
        const statusMap = {
            valid: 'valid',
            invalid: 'invalid',
            'catch-all': 'catch-all',
            unknown: 'unknown',
            spamtrap: 'spamtrap',
            abuse: 'abuse',
            do_not_mail: 'do_not_mail',
        };
        const status = data.status;
        const subStatus = data.sub_status;
        return {
            email,
            status: statusMap[status] || 'unknown',
            subStatus,
            isValid: status === 'valid',
            isDeliverable: ['valid', 'catch-all'].includes(status),
            isSyntaxValid: true,
            isDomainValid: !['invalid_domain', 'invalid_email'].includes(subStatus || ''),
            isDisposable: data.disposable || false,
            isRoleBased: data.role || false,
            isCatchAll: status === 'catch-all',
            isFree: data.free || false,
            score: parseInt(data.zerobounce_score) || 0,
            mxRecord: data.mx_record,
            smtpProvider: data.smtp_provider,
            firstName: data.firstname,
            lastName: data.lastname,
            gender: data.gender,
            country: data.country,
            region: data.region,
            city: data.city,
            zipcode: data.zipcode,
            processedAt: new Date(),
        };
    }
    normalizeEmail(email) {
        return email.trim().toLowerCase();
    }
    isValidEmailFormat(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
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
    async setCached(key, value) {
        try {
            await this.redis.setex(key, this.cacheTtlSeconds, JSON.stringify(value));
        }
        catch (error) {
            this.logger.warn('Cache set error:', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    getMockResult(email) {
        const validDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'mechmind.io', 'company.com'];
        const disposableDomains = ['tempmail.com', 'throwaway.com', 'mailinator.com'];
        const roleBased = ['info@', 'admin@', 'support@', 'sales@', 'contact@'];
        const domain = email.split('@')[1] || '';
        const isDisposable = disposableDomains.includes(domain);
        const isRoleBased = roleBased.some(role => email.startsWith(role));
        const isValid = validDomains.includes(domain) && !isDisposable;
        return {
            email,
            status: isValid ? 'valid' : isDisposable ? 'do_not_mail' : 'invalid',
            isValid,
            isDeliverable: isValid,
            isSyntaxValid: true,
            isDomainValid: !isDisposable,
            isDisposable,
            isRoleBased,
            isCatchAll: false,
            isFree: ['gmail.com', 'yahoo.com', 'outlook.com'].includes(domain),
            score: isValid ? 95 : isDisposable ? 0 : 30,
            processedAt: new Date(),
        };
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async onModuleDestroy() {
        await this.redis.quit();
    }
};
exports.ZeroBounceService = ZeroBounceService;
exports.ZeroBounceService = ZeroBounceService = ZeroBounceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ZeroBounceService);
async function verifyEmail(email, config) {
    const service = new ZeroBounceService({
        get: (key) => {
            const configs = {
                ZEROBOUNCE_API_KEY: config?.apiKey || '',
                NODE_ENV: config?.apiKey ? 'production' : 'development',
                REDIS_URL: config?.redisUrl || 'redis://localhost:6379',
            };
            return configs[key];
        },
    });
    try {
        return await service.verifyEmail(email);
    }
    finally {
        await service.onModuleDestroy();
    }
}
