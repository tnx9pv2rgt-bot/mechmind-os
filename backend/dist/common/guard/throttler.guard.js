"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedThrottlerGuard = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
let AdvancedThrottlerGuard = class AdvancedThrottlerGuard extends throttler_1.ThrottlerGuard {
    throwThrottlingException() {
        throw new common_1.HttpException({
            statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
            message: 'Rate limit exceeded. Please try again later.',
            error: 'Too Many Requests',
            retryAfter: 60,
        }, common_1.HttpStatus.TOO_MANY_REQUESTS);
    }
    async getTracker(req) {
        const ip = this.getClientIp(req);
        const userId = req.user?.sub;
        if (userId) {
            return `user:${userId}`;
        }
        return `ip:${ip}`;
    }
    async getThrottlerOptions(context) {
        const request = context.switchToHttp().getRequest();
        const path = request.path;
        const method = request.method;
        const limits = this.getLimitsForPath(path, method);
        return {
            ttl: limits.ttl,
            limit: limits.limit,
        };
    }
    getLimitsForPath(path, _method) {
        if (path.includes('/auth/login') || path.includes('/auth/verify-2fa')) {
            return { ttl: 60, limit: 5 };
        }
        if (path.includes('/auth/reset-password') || path.includes('/auth/forgot-password')) {
            return { ttl: 3600, limit: 3 };
        }
        if (path.includes('/auth/2fa')) {
            return { ttl: 60, limit: 10 };
        }
        if (path.includes('/webhook')) {
            return { ttl: 60, limit: 100 };
        }
        if (path.includes('/voice')) {
            return { ttl: 60, limit: 200 };
        }
        if (path.startsWith('/api/v1/')) {
            return { ttl: 60, limit: 100 };
        }
        if (path.includes('/graphql') || path.includes('/ws')) {
            return { ttl: 60, limit: 500 };
        }
        return { ttl: 60, limit: 60 };
    }
    getClientIp(req) {
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            return ips.split(',')[0].trim();
        }
        const realIp = req.headers['x-real-ip'];
        if (realIp) {
            return Array.isArray(realIp) ? realIp[0] : realIp;
        }
        return req.ip || 'unknown';
    }
};
exports.AdvancedThrottlerGuard = AdvancedThrottlerGuard;
exports.AdvancedThrottlerGuard = AdvancedThrottlerGuard = __decorate([
    (0, common_1.Injectable)()
], AdvancedThrottlerGuard);
