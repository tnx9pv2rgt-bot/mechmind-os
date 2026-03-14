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
exports.LockMonitorService = void 0;
const common_1 = require("@nestjs/common");
const logger_service_1 = require("./logger.service");
let LockMonitorService = class LockMonitorService {
    constructor(logger) {
        this.logger = logger;
        this.acquisitions = 0;
        this.failures = 0;
        this.totalWaitTimeMs = 0;
    }
    async recordLockAcquisition(waitTimeMs) {
        this.acquisitions++;
        this.totalWaitTimeMs += waitTimeMs;
        if (waitTimeMs > 5000) {
            this.logger.warn(`LockMonitor: slow lock acquisition (${waitTimeMs}ms). ` +
                `Total: ${this.acquisitions} acquired, ${this.failures} failed, ` +
                `avg wait: ${Math.round(this.totalWaitTimeMs / this.acquisitions)}ms`);
        }
    }
    async recordLockFailure() {
        this.failures++;
        this.logger.warn(`LockMonitor: lock acquisition failed. ` +
            `Total: ${this.acquisitions} acquired, ${this.failures} failed`);
    }
    getMetrics() {
        return {
            acquisitions: this.acquisitions,
            failures: this.failures,
            avgWaitTimeMs: this.acquisitions > 0 ? Math.round(this.totalWaitTimeMs / this.acquisitions) : 0,
        };
    }
};
exports.LockMonitorService = LockMonitorService;
exports.LockMonitorService = LockMonitorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService])
], LockMonitorService);
