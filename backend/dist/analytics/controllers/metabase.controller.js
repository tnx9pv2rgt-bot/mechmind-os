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
var MetabaseController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetabaseController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const config_1 = require("@nestjs/config");
const jsonwebtoken_1 = require("jsonwebtoken");
let MetabaseController = MetabaseController_1 = class MetabaseController {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(MetabaseController_1.name);
        this.dashboardIds = {
            overview: 1,
            revenue: 2,
            customers: 3,
            mechanics: 4,
            vehicles: 5,
            executive: 6,
        };
        this.metabaseUrl = this.configService.get('METABASE_URL', 'http://localhost:3001');
        this.secretKey = this.configService.get('METABASE_SECRET_KEY', '');
        this.embeddingEnabled = this.configService.get('METABASE_EMBEDDING_ENABLED', true);
        if (!this.secretKey && this.embeddingEnabled) {
            this.logger.warn('METABASE_SECRET_KEY not configured. Embedding will fail.');
        }
    }
    async getDashboardUrl(tenantId, userId, dashboardType, expiryMinutes) {
        if (!this.embeddingEnabled) {
            throw new common_1.HttpException('Metabase embedding is disabled', common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        if (!this.secretKey) {
            this.logger.error('METABASE_SECRET_KEY not configured');
            throw new common_1.HttpException('Metabase embedding not properly configured', common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        const dashboardId = this.dashboardIds[dashboardType];
        if (!dashboardId) {
            const validTypes = Object.keys(this.dashboardIds).join(', ');
            throw new common_1.HttpException(`Invalid dashboard type. Valid types: ${validTypes}`, common_1.HttpStatus.BAD_REQUEST);
        }
        const expiry = Math.min(parseInt(expiryMinutes || '10', 10), 60);
        if (isNaN(expiry) || expiry < 1) {
            throw new common_1.HttpException('Invalid expiryMinutes parameter', common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const payload = {
                resource: { dashboard: dashboardId },
                params: {
                    tenant_id: tenantId,
                    user_id: userId,
                },
                exp: Math.round(Date.now() / 1000) + expiry * 60,
            };
            const token = (0, jsonwebtoken_1.sign)(payload, this.secretKey, { algorithm: 'HS256' });
            const embedUrl = `${this.metabaseUrl}/embed/dashboard/${token}#bordered=true&titled=true`;
            this.logger.debug(`Generated embed URL for tenant ${tenantId}, dashboard ${dashboardType}`);
            return {
                success: true,
                data: {
                    url: embedUrl,
                    expiresAt: new Date(Date.now() + expiry * 60 * 1000).toISOString(),
                    dashboardId,
                },
            };
        }
        catch (error) {
            this.logger.error('Failed to generate embed URL:', error);
            throw new common_1.HttpException('Failed to generate dashboard URL', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getQuestionUrl(tenantId, questionId, expiryMinutes) {
        if (!this.embeddingEnabled || !this.secretKey) {
            throw new common_1.HttpException('Metabase embedding not configured', common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        const qId = parseInt(questionId, 10);
        if (isNaN(qId) || qId < 1) {
            throw new common_1.HttpException('Invalid questionId', common_1.HttpStatus.BAD_REQUEST);
        }
        const expiry = Math.min(parseInt(expiryMinutes || '10', 10), 60);
        try {
            const payload = {
                resource: { question: qId },
                params: { tenant_id: tenantId },
                exp: Math.round(Date.now() / 1000) + expiry * 60,
            };
            const token = (0, jsonwebtoken_1.sign)(payload, this.secretKey, { algorithm: 'HS256' });
            const embedUrl = `${this.metabaseUrl}/embed/question/${token}#bordered=true`;
            return {
                success: true,
                data: {
                    url: embedUrl,
                    expiresAt: new Date(Date.now() + expiry * 60 * 1000).toISOString(),
                    dashboardId: qId,
                },
            };
        }
        catch (error) {
            this.logger.error('Failed to generate question URL:', error);
            throw new common_1.HttpException('Failed to generate question URL', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getConfig() {
        return {
            success: true,
            data: {
                enabled: this.embeddingEnabled && !!this.secretKey,
                url: this.metabaseUrl,
                dashboards: this.dashboardIds,
            },
        };
    }
    async healthCheck() {
        const configured = !!this.secretKey && !!this.metabaseUrl;
        return {
            success: true,
            data: {
                configured,
                embeddingEnabled: this.embeddingEnabled,
                url: this.metabaseUrl,
                status: configured ? 'healthy' : 'unconfigured',
            },
        };
    }
};
exports.MetabaseController = MetabaseController;
__decorate([
    (0, common_1.Get)('dashboard-url'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get signed Metabase dashboard embed URL',
        description: `
Generates a JWT-signed URL for embedding a Metabase dashboard.
The URL includes tenant isolation parameters for row-level security.

Available dashboards:
- overview: Booking metrics and completion rates
- revenue: Revenue analytics and trends
- customers: Customer insights and retention
- mechanics: Mechanic performance metrics
- vehicles: Vehicle service analytics
- executive: Executive summary KPIs

The returned URL expires in 10 minutes by default.
    `,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'dashboard',
        required: true,
        description: 'Dashboard type (overview, revenue, customers, mechanics, vehicles, executive)',
        example: 'overview',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'expiryMinutes',
        required: false,
        description: 'URL expiry time in minutes (default: 10, max: 60)',
        example: 10,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Signed embed URL generated successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', example: 'http://localhost:3001/embed/dashboard/eyJhbGciOiJIUzI1NiIs...' },
                        expiresAt: { type: 'string', format: 'date-time' },
                        dashboardId: { type: 'number', example: 1 },
                    },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid dashboard type' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Embedding not enabled or access denied' }),
    (0, swagger_1.ApiResponse)({ status: 503, description: 'Metabase not configured' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(2, (0, common_1.Query)('dashboard')),
    __param(3, (0, common_1.Query)('expiryMinutes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], MetabaseController.prototype, "getDashboardUrl", null);
__decorate([
    (0, common_1.Get)('question-url'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get signed Metabase question embed URL',
        description: 'Generates a JWT-signed URL for embedding a single Metabase question/card',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'questionId',
        required: true,
        description: 'Metabase question/card ID',
        example: 1,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'expiryMinutes',
        required: false,
        description: 'URL expiry time in minutes',
        example: 10,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Signed embed URL generated' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid question ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)('questionId')),
    __param(2, (0, common_1.Query)('expiryMinutes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MetabaseController.prototype, "getQuestionUrl", null);
__decorate([
    (0, common_1.Get)('config'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get Metabase configuration',
        description: 'Returns Metabase configuration settings for frontend integration',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Configuration retrieved',
        schema: {
            type: 'object',
            properties: {
                enabled: { type: 'boolean' },
                url: { type: 'string' },
                dashboards: {
                    type: 'object',
                    properties: {
                        overview: { type: 'number' },
                        revenue: { type: 'number' },
                        customers: { type: 'number' },
                        mechanics: { type: 'number' },
                        vehicles: { type: 'number' },
                        executive: { type: 'number' },
                    },
                },
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MetabaseController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({
        summary: 'Check Metabase health',
        description: 'Verifies Metabase connectivity and configuration',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Health check result' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MetabaseController.prototype, "healthCheck", null);
exports.MetabaseController = MetabaseController = MetabaseController_1 = __decorate([
    (0, swagger_1.ApiTags)('Analytics - Metabase BI'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('analytics/metabase'),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MetabaseController);
