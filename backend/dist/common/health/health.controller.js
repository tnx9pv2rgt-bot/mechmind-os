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
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const prisma_service_1 = require("../services/prisma.service");
const redis_service_1 = require("../services/redis.service");
const logger_service_1 = require("../services/logger.service");
let HealthController = class HealthController {
    constructor(prisma, redis, logger) {
        this.prisma = prisma;
        this.redis = redis;
        this.logger = logger;
    }
    async health(res) {
        const checks = {};
        const [dbCheck, redisCheck] = await Promise.allSettled([
            this.checkDatabase(),
            this.checkRedis(),
        ]);
        checks.database =
            dbCheck.status === 'fulfilled' ? dbCheck.value : { status: 'down', error: 'Check failed' };
        checks.redis =
            redisCheck.status === 'fulfilled'
                ? redisCheck.value
                : { status: 'down', error: 'Check failed' };
        const allUp = Object.values(checks).every(c => c.status === 'up');
        const dbUp = checks.database?.status === 'up';
        const result = {
            status: allUp ? 'ok' : dbUp ? 'degraded' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            checks,
        };
        const statusCode = dbUp ? common_1.HttpStatus.OK : common_1.HttpStatus.SERVICE_UNAVAILABLE;
        res.status(statusCode).json(result);
    }
    liveness() {
        return { status: 'ok' };
    }
    async readiness(res) {
        const dbCheck = await this.checkDatabase();
        const statusCode = dbCheck.status === 'up' ? common_1.HttpStatus.OK : common_1.HttpStatus.SERVICE_UNAVAILABLE;
        res.status(statusCode).json({
            status: dbCheck.status === 'up' ? 'ready' : 'not_ready',
            timestamp: new Date().toISOString(),
            database: dbCheck,
        });
    }
    async checkDatabase() {
        const start = Date.now();
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            return { status: 'up', latency: Date.now() - start };
        }
        catch (error) {
            this.logger.error('Health check: database unreachable', error.message);
            return { status: 'down', latency: Date.now() - start, error: 'Database unreachable' };
        }
    }
    async checkRedis() {
        const start = Date.now();
        try {
            await this.redis.set('health:ping', 'pong', 10);
            const value = await this.redis.get('health:ping');
            if (value !== 'pong') {
                return { status: 'down', latency: Date.now() - start, error: 'Redis read/write mismatch' };
            }
            return { status: 'up', latency: Date.now() - start };
        }
        catch (error) {
            this.logger.error('Health check: redis unreachable', error.message);
            return { status: 'down', latency: Date.now() - start, error: 'Redis unreachable' };
        }
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)('health'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('liveness'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], HealthController.prototype, "liveness", null);
__decorate([
    (0, common_1.Get)('readiness'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "readiness", null);
exports.HealthController = HealthController = __decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        logger_service_1.LoggerService])
], HealthController);
