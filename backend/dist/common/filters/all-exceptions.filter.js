"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const Sentry = __importStar(require("@sentry/nestjs"));
const logger_service_1 = require("../services/logger.service");
let AllExceptionsFilter = class AllExceptionsFilter {
    constructor(logger, configService) {
        this.logger = logger;
        this.configService = configService;
        this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const { status, message, error } = this.resolveException(exception);
        this.logger.error(`[${request.method}] ${request.url} → ${status}: ${message}`, exception instanceof Error ? exception.stack : undefined);
        if (status >= 500) {
            Sentry.captureException(exception);
        }
        const errorResponse = {
            statusCode: status,
            message: this.isDevelopment ? message : this.sanitizeMessage(message, status),
            error,
            timestamp: new Date().toISOString(),
            path: request.url,
        };
        response.status(status).json(errorResponse);
    }
    resolveException(exception) {
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            const message = typeof exceptionResponse === 'string'
                ? exceptionResponse
                : (exceptionResponse.message?.toString() ??
                    exception.message);
            return { status, message, error: common_1.HttpStatus[status] ?? 'Error' };
        }
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            return this.handlePrismaError(exception);
        }
        if (exception instanceof client_1.Prisma.PrismaClientValidationError) {
            return {
                status: common_1.HttpStatus.BAD_REQUEST,
                message: 'Invalid data provided',
                error: 'Bad Request',
            };
        }
        if (exception instanceof Error) {
            return {
                status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: exception.message,
                error: 'Internal Server Error',
            };
        }
        return {
            status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred',
            error: 'Internal Server Error',
        };
    }
    handlePrismaError(error) {
        switch (error.code) {
            case 'P2002':
                return {
                    status: common_1.HttpStatus.CONFLICT,
                    message: 'A record with this data already exists',
                    error: 'Conflict',
                };
            case 'P2025':
                return {
                    status: common_1.HttpStatus.NOT_FOUND,
                    message: 'Record not found',
                    error: 'Not Found',
                };
            case 'P2003':
                return {
                    status: common_1.HttpStatus.BAD_REQUEST,
                    message: 'Invalid reference: related record not found',
                    error: 'Bad Request',
                };
            case 'P2034':
                return {
                    status: common_1.HttpStatus.CONFLICT,
                    message: 'Operation failed due to a concurrent update. Please retry.',
                    error: 'Conflict',
                };
            default:
                return {
                    status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'A database error occurred',
                    error: 'Internal Server Error',
                };
        }
    }
    sanitizeMessage(message, status) {
        if (status >= 400 && status < 500) {
            return message;
        }
        return 'An internal error occurred. Please try again later.';
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Injectable)(),
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService,
        config_1.ConfigService])
], AllExceptionsFilter);
