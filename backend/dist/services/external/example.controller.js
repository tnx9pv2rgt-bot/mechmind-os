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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalServicesExampleController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const index_1 = require("./index");
const middleware_1 = require("../../middleware");
let ExternalServicesExampleController = class ExternalServicesExampleController {
    constructor(viesService, placesService, emailService, phoneService) {
        this.viesService = viesService;
        this.placesService = placesService;
        this.emailService = emailService;
        this.phoneService = phoneService;
    }
    async verifyVat(vatNumber) {
        const result = await this.viesService.verifyVatNumber(vatNumber);
        return {
            success: true,
            data: result,
        };
    }
    async verifyVatBulk(vatNumbers) {
        const results = await this.viesService.verifyMultipleVatNumbers(vatNumbers);
        return {
            success: true,
            data: Object.fromEntries(results),
        };
    }
    async autocompleteAddress(query) {
        const results = await this.placesService.autocompleteAddress(query);
        return {
            success: true,
            data: results,
        };
    }
    async getPlaceDetails(placeId) {
        const details = await this.placesService.getPlaceDetails(placeId);
        return {
            success: true,
            data: details,
        };
    }
    async geocodeAddress(address) {
        const results = await this.placesService.geocodeAddress(address);
        return {
            success: true,
            data: results,
        };
    }
    async reverseGeocode(latitude, longitude) {
        const results = await this.placesService.reverseGeocode(parseFloat(latitude), parseFloat(longitude));
        return {
            success: true,
            data: results,
        };
    }
    async validatePostalCode(postalCode) {
        const result = await this.placesService.validatePostalCode(postalCode);
        return {
            success: true,
            data: result,
        };
    }
    async verifyEmail(email) {
        const result = await this.emailService.verifyEmail(email);
        return {
            success: true,
            data: result,
        };
    }
    validateEmailSyntax(email) {
        const result = this.emailService.validateSyntax(email);
        return {
            success: true,
            data: result,
        };
    }
    async validatePhone(phone) {
        const result = await this.phoneService.validatePhoneNumber(phone);
        return {
            success: true,
            data: result,
        };
    }
    formatPhoneE164(phone, country) {
        const formatted = this.phoneService.formatE164(phone, country || 'IT');
        return {
            success: true,
            data: { formatted },
        };
    }
    async sendOtp(phone) {
        const result = await this.phoneService.sendOtp(phone);
        return {
            success: result.success,
            data: result,
        };
    }
    async verifyOtp(phone, code) {
        const result = await this.phoneService.verifyOtp(phone, code);
        return {
            success: result.success,
            valid: result.valid,
            data: result,
        };
    }
    async resendOtp(phone) {
        const result = await this.phoneService.resendOtp(phone);
        return {
            success: result.success,
            data: result,
        };
    }
};
exports.ExternalServicesExampleController = ExternalServicesExampleController;
__decorate([
    (0, common_1.Post)('vat/verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, middleware_1.ApplyRateLimit)(middleware_1.RedisRateLimiterMiddleware.VAT_VERIFICATION_LIMIT),
    (0, swagger_1.ApiOperation)({ summary: 'Verify VAT number via VIES' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'VAT verification result' }),
    __param(0, (0, common_1.Body)('vatNumber')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExternalServicesExampleController.prototype, "verifyVat", null);
__decorate([
    (0, common_1.Post)('vat/verify-bulk'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify multiple VAT numbers' }),
    __param(0, (0, common_1.Body)('vatNumbers')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], ExternalServicesExampleController.prototype, "verifyVatBulk", null);
__decorate([
    (0, common_1.Get)('address/autocomplete'),
    (0, swagger_1.ApiOperation)({ summary: 'Autocomplete address search' }),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExternalServicesExampleController.prototype, "autocompleteAddress", null);
__decorate([
    (0, common_1.Get)('address/details'),
    (0, swagger_1.ApiOperation)({ summary: 'Get place details by Place ID' }),
    __param(0, (0, common_1.Query)('placeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExternalServicesExampleController.prototype, "getPlaceDetails", null);
__decorate([
    (0, common_1.Get)('address/geocode'),
    (0, swagger_1.ApiOperation)({ summary: 'Geocode address to coordinates' }),
    __param(0, (0, common_1.Query)('address')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExternalServicesExampleController.prototype, "geocodeAddress", null);
__decorate([
    (0, common_1.Get)('address/reverse-geocode'),
    (0, swagger_1.ApiOperation)({ summary: 'Reverse geocode coordinates to address' }),
    __param(0, (0, common_1.Query)('lat')),
    __param(1, (0, common_1.Query)('lng')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ExternalServicesExampleController.prototype, "reverseGeocode", null);
__decorate([
    (0, common_1.Get)('address/validate-postal-code'),
    (0, swagger_1.ApiOperation)({ summary: 'Validate postal code and get city/province' }),
    __param(0, (0, common_1.Query)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExternalServicesExampleController.prototype, "validatePostalCode", null);
__decorate([
    (0, common_1.Post)('email/verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, middleware_1.ApplyRateLimit)(middleware_1.RedisRateLimiterMiddleware.EMAIL_CHECK_LIMIT),
    (0, swagger_1.ApiOperation)({ summary: 'Verify email address' }),
    __param(0, (0, common_1.Body)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExternalServicesExampleController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('email/verify-syntax'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Validate email syntax only (no API call)' }),
    __param(0, (0, common_1.Body)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ExternalServicesExampleController.prototype, "validateEmailSyntax", null);
__decorate([
    (0, common_1.Post)('phone/validate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, middleware_1.ApplyRateLimit)(middleware_1.RedisRateLimiterMiddleware.PHONE_CHECK_LIMIT),
    (0, swagger_1.ApiOperation)({ summary: 'Validate phone number' }),
    __param(0, (0, common_1.Body)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExternalServicesExampleController.prototype, "validatePhone", null);
__decorate([
    (0, common_1.Post)('phone/format-e164'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Format phone to E.164' }),
    __param(0, (0, common_1.Body)('phone')),
    __param(1, (0, common_1.Body)('country')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ExternalServicesExampleController.prototype, "formatPhoneE164", null);
__decorate([
    (0, common_1.Post)('phone/send-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Send OTP via SMS' }),
    __param(0, (0, common_1.Body)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExternalServicesExampleController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('phone/verify-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify OTP code' }),
    __param(0, (0, common_1.Body)('phone')),
    __param(1, (0, common_1.Body)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ExternalServicesExampleController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)('phone/resend-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Resend OTP' }),
    __param(0, (0, common_1.Body)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExternalServicesExampleController.prototype, "resendOtp", null);
exports.ExternalServicesExampleController = ExternalServicesExampleController = __decorate([
    (0, swagger_1.ApiTags)('External Services'),
    (0, common_1.Controller)('external'),
    __metadata("design:paramtypes", [index_1.ViesApiService,
        index_1.GooglePlacesService,
        index_1.ZeroBounceService,
        index_1.TwilioService])
], ExternalServicesExampleController);
