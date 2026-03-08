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
exports.TenantContextMiddleware = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
const logger_service_1 = require("../../common/services/logger.service");
let TenantContextMiddleware = class TenantContextMiddleware {
    constructor(prisma, logger) {
        this.prisma = prisma;
        this.logger = logger;
    }
    async use(req, res, next) {
        const tenantId = req.tenantId;
        if (tenantId) {
            try {
                await this.prisma.setTenantContext(tenantId);
                this.logger.debug(`Tenant context set: ${tenantId}`, 'TenantContextMiddleware');
                res.on('finish', async () => {
                    try {
                        await this.prisma.clearTenantContext();
                        this.logger.debug(`Tenant context cleared: ${tenantId}`, 'TenantContextMiddleware');
                    }
                    catch (error) {
                        this.logger.error('Failed to clear tenant context', error.stack);
                    }
                });
            }
            catch (error) {
                this.logger.error(`Failed to set tenant context: ${error.message}`);
            }
        }
        else {
            this.logger.debug('No tenant ID in request - RLS not applied');
        }
        next();
    }
};
exports.TenantContextMiddleware = TenantContextMiddleware;
exports.TenantContextMiddleware = TenantContextMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logger_service_1.LoggerService])
], TenantContextMiddleware);
