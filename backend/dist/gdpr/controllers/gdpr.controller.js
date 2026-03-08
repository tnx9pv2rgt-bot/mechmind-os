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
exports.GdprController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const gdpr_deletion_service_1 = require("../services/gdpr-deletion.service");
const data_retention_service_1 = require("../services/data-retention.service");
const gdpr_consent_service_1 = require("../services/gdpr-consent.service");
const gdpr_export_service_1 = require("../services/gdpr-export.service");
const roles_guard_2 = require("../../auth/guards/roles.guard");
const gdpr_request_service_1 = require("../services/gdpr-request.service");
const gdpr_dto_1 = require("../dto/gdpr.dto");
let GdprController = class GdprController {
    constructor(deletionService, retentionService, consentService, exportService, requestService) {
        this.deletionService = deletionService;
        this.retentionService = retentionService;
        this.consentService = consentService;
        this.exportService = exportService;
        this.requestService = requestService;
    }
    async createRequest(dto, tenantId) {
        return this.requestService.createRequest({
            ...dto,
            tenantId,
            source: 'WEB_FORM',
            requestType: dto.requestType,
            priority: dto.priority,
        });
    }
    async listRequests(tenantId, status, type) {
        return this.requestService.listRequests(tenantId, {
            status: status,
            type: type,
        });
    }
    async getPendingRequests(tenantId) {
        return this.requestService.getPendingRequests(tenantId);
    }
    async getRequest(requestId, tenantId) {
        return this.requestService.getRequest(requestId, tenantId);
    }
    async updateRequestStatus(requestId, tenantId, dto) {
        return this.requestService.updateStatus(requestId, tenantId, dto.status, dto.notes);
    }
    async verifyIdentity(requestId, tenantId, dto) {
        return this.requestService.verifyIdentity(requestId, tenantId, dto);
    }
    async assignRequest(requestId, tenantId, userId) {
        return this.requestService.assignRequest(requestId, tenantId, userId);
    }
    async rejectRequest(requestId, tenantId, body) {
        return this.requestService.rejectRequest(requestId, tenantId, body.reason, body.legalBasis);
    }
    async getRequestStats(tenantId) {
        return this.requestService.getStatistics(tenantId);
    }
    async exportCustomerData(customerId, tenantId, format = 'JSON', requestId) {
        return this.exportService.exportCustomerData(customerId, tenantId, format, requestId);
    }
    async exportPortableData(customerId, tenantId) {
        return this.exportService.exportPortableData(customerId, tenantId);
    }
    async generateExport(customerId, tenantId, format = 'JSON') {
        return this.exportService.generateExport(customerId, tenantId, format);
    }
    async queueDeletion(customerId, tenantId, body) {
        return this.deletionService.queueDeletion(customerId, tenantId, body.requestId, body.reason, {
            identityVerificationMethod: body.verificationMethod,
        });
    }
    async getDeletionJobStatus(jobId) {
        return this.deletionService.getJobStatus(jobId);
    }
    async cancelDeletion(jobId, reason) {
        return this.deletionService.cancelDeletion(jobId, reason);
    }
    async getDeletionQueueStats() {
        return this.deletionService.getQueueStats();
    }
    async recordConsent(customerId, tenantId, dto, forwardedFor, userAgent) {
        return this.consentService.recordConsent(customerId, tenantId, dto.consentType, dto.granted, {
            ipAddress: forwardedFor,
            userAgent,
            collectionMethod: dto.collectionMethod,
            collectionPoint: dto.collectionPoint,
            legalBasis: dto.legalBasis,
            verifiedIdentity: dto.verifiedIdentity,
            metadata: dto.metadata,
        });
    }
    async revokeConsent(customerId, tenantId, consentType, body) {
        return this.consentService.revokeConsent(customerId, tenantId, consentType, body.reason, body.revokedBy);
    }
    async getConsentStatus(customerId, tenantId) {
        return this.consentService.getCustomerConsentStatus(customerId, tenantId);
    }
    async getConsentHistory(customerId, tenantId) {
        return this.consentService.getConsentAuditTrail(customerId, tenantId);
    }
    async getRetentionPolicy() {
        return this.retentionService.getRetentionPolicy();
    }
    async getRetentionStats(tenantId) {
        return this.retentionService.getTenantRetentionStats(tenantId);
    }
    async updateRetentionPolicy(tenantId, days) {
        return this.retentionService.updateTenantRetentionPolicy(tenantId, days);
    }
    async enforceRetention(tenantId) {
        return this.retentionService.queueRetentionEnforcement(tenantId);
    }
};
exports.GdprController = GdprController;
__decorate([
    (0, common_1.Post)('requests'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [gdpr_dto_1.CreateDataSubjectRequestDto, String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Get)('requests'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Query)('tenantId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "listRequests", null);
__decorate([
    (0, common_1.Get)('requests/pending'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "getPendingRequests", null);
__decorate([
    (0, common_1.Get)('requests/:requestId'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Param)('requestId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "getRequest", null);
__decorate([
    (0, common_1.Patch)('requests/:requestId/status'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Param)('requestId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, gdpr_dto_1.UpdateRequestStatusDto]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "updateRequestStatus", null);
__decorate([
    (0, common_1.Post)('requests/:requestId/verify'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Param)('requestId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, gdpr_dto_1.VerifyIdentityDto]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "verifyIdentity", null);
__decorate([
    (0, common_1.Post)('requests/:requestId/assign'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('requestId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Body)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "assignRequest", null);
__decorate([
    (0, common_1.Post)('requests/:requestId/reject'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('requestId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "rejectRequest", null);
__decorate([
    (0, common_1.Get)('requests/stats'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "getRequestStats", null);
__decorate([
    (0, common_1.Get)('customers/:customerId/export'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Param)('customerId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Query)('requestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "exportCustomerData", null);
__decorate([
    (0, common_1.Get)('customers/:customerId/portability'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Param)('customerId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "exportPortableData", null);
__decorate([
    (0, common_1.Post)('customers/:customerId/export'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Param)('customerId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Body)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "generateExport", null);
__decorate([
    (0, common_1.Post)('customers/:customerId/delete'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('customerId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "queueDeletion", null);
__decorate([
    (0, common_1.Get)('deletion-jobs/:jobId'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "getDeletionJobStatus", null);
__decorate([
    (0, common_1.Post)('deletion-jobs/:jobId/cancel'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "cancelDeletion", null);
__decorate([
    (0, common_1.Get)('deletion-jobs/stats'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "getDeletionQueueStats", null);
__decorate([
    (0, common_1.Post)('customers/:customerId/consent'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Param)('customerId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Headers)('x-forwarded-for')),
    __param(4, (0, common_1.Headers)('user-agent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, gdpr_dto_1.CreateConsentDto, String, String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "recordConsent", null);
__decorate([
    (0, common_1.Delete)('customers/:customerId/consent/:consentType'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Param)('customerId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Param)('consentType')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "revokeConsent", null);
__decorate([
    (0, common_1.Get)('customers/:customerId/consent'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Param)('customerId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "getConsentStatus", null);
__decorate([
    (0, common_1.Get)('customers/:customerId/consent/history'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Param)('customerId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "getConsentHistory", null);
__decorate([
    (0, common_1.Get)('retention/policy'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "getRetentionPolicy", null);
__decorate([
    (0, common_1.Get)('retention/stats'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "getRetentionStats", null);
__decorate([
    (0, common_1.Patch)('retention/policy'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('tenantId')),
    __param(1, (0, common_1.Body)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "updateRetentionPolicy", null);
__decorate([
    (0, common_1.Post)('retention/enforce'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GdprController.prototype, "enforceRetention", null);
exports.GdprController = GdprController = __decorate([
    (0, common_1.Controller)('gdpr'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [gdpr_deletion_service_1.GdprDeletionService,
        data_retention_service_1.DataRetentionService,
        gdpr_consent_service_1.GdprConsentService,
        gdpr_export_service_1.GdprExportService,
        gdpr_request_service_1.GdprRequestService])
], GdprController);
