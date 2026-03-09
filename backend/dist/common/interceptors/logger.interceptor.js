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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerInterceptor = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const operators_1 = require("rxjs/operators");
const logger_service_1 = require("../services/logger.service");
let LoggerInterceptor = class LoggerInterceptor {
    constructor(logger, configService) {
        this.logger = logger;
        this.configService = configService;
        this.isProduction = this.configService.get('NODE_ENV') === 'production';
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const { method, url } = request;
        const controller = context.getClass().name;
        const handler = context.getHandler().name;
        const startTime = Date.now();
        this.logger.log(`[REQUEST] ${method} ${url} - ${controller}.${handler}`, 'LoggerInterceptor');
        return next.handle().pipe((0, operators_1.tap)({
            next: () => {
                const duration = Date.now() - startTime;
                this.logger.log(`[RESPONSE] ${method} ${url} - ${duration}ms`, 'LoggerInterceptor');
            },
            error: (error) => {
                const duration = Date.now() - startTime;
                const errorDetail = this.isProduction
                    ? error.message
                    : `${error.message}\n${error.stack}`;
                this.logger.error(`[ERROR] ${method} ${url} - ${duration}ms - ${errorDetail}`, undefined, 'LoggerInterceptor');
            },
        }));
    }
    sanitizeBody(body) {
        if (!body || typeof body !== 'object') {
            return body;
        }
        const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'ssn'];
        const sanitized = { ...body };
        for (const field of sensitiveFields) {
            if (field in sanitized) {
                sanitized[field] = '***REDACTED***';
            }
        }
        return sanitized;
    }
};
exports.LoggerInterceptor = LoggerInterceptor;
exports.LoggerInterceptor = LoggerInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService,
        config_1.ConfigService])
], LoggerInterceptor);
