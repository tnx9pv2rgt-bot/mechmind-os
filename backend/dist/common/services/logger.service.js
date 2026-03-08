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
exports.LoggerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let LoggerService = class LoggerService {
    constructor(configService) {
        this.configService = configService;
    }
    setContext(context) {
        this.context = context;
    }
    log(message, context) {
        this.printMessage('log', message, context);
    }
    error(message, trace, context) {
        this.printMessage('error', message, context);
        if (trace) {
            console.error(trace);
        }
    }
    warn(message, context) {
        this.printMessage('warn', message, context);
    }
    debug(message, context) {
        const logLevel = this.configService?.get('LOG_LEVEL') || 'info';
        if (logLevel === 'debug') {
            this.printMessage('debug', message, context);
        }
    }
    verbose(message, context) {
        const logLevel = this.configService?.get('LOG_LEVEL') || 'info';
        if (logLevel === 'verbose' || logLevel === 'debug') {
            this.printMessage('verbose', message, context);
        }
    }
    printMessage(level, message, context) {
        const timestamp = new Date().toISOString();
        const ctx = context || this.context || 'Application';
        const logFormat = this.configService?.get('LOG_FORMAT') || 'simple';
        if (logFormat === 'json') {
            const logEntry = {
                timestamp,
                level: level.toUpperCase(),
                context: ctx,
                message,
            };
            console.log(JSON.stringify(logEntry));
        }
        else {
            const colorMap = {
                log: '\x1b[32m',
                error: '\x1b[31m',
                warn: '\x1b[33m',
                debug: '\x1b[34m',
                verbose: '\x1b[35m',
            };
            const resetColor = '\x1b[0m';
            const color = colorMap[level];
            console.log(`${color}[${level.toUpperCase()}]${resetColor} ${timestamp} [${ctx}] ${message}`);
        }
    }
};
exports.LoggerService = LoggerService;
exports.LoggerService = LoggerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LoggerService);
