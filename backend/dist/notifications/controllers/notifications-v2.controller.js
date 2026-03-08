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
exports.NotificationsV2Controller = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const notification_v2_service_1 = require("../services/notification-v2.service");
const roles_guard_2 = require("../../auth/guards/roles.guard");
class SendNotificationDto {
}
class UpdatePreferenceDto {
}
let NotificationsV2Controller = class NotificationsV2Controller {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    async getHistory(customerId, type, limit, offset) {
        return this.notificationService.getHistory(customerId, {
            type: type,
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0,
        });
    }
    async send(dto) {
        return this.notificationService.sendImmediate(dto);
    }
    async queue(dto) {
        return this.notificationService.queueNotification(dto);
    }
    async sendBatch(dto) {
        return this.notificationService.sendBatch(dto.notifications);
    }
    async processPending() {
        return this.notificationService.processPending();
    }
    async getTemplates() {
        return {
            templates: this.notificationService.getAvailableTemplates(),
        };
    }
    async previewTemplate(dto) {
        const message = this.notificationService.generateMessage(dto.type, dto.language, dto.vars);
        return { message };
    }
    async getPreferences(customerId) {
        return this.notificationService.getPreferences(customerId);
    }
    async updatePreference(dto) {
        await this.notificationService.updatePreference(dto.customerId, dto.channel, dto.enabled);
        return { success: true };
    }
    async getStatus(id) {
        return { id, status: 'PENDING' };
    }
    async retry(id) {
        return this.notificationService.retryNotification(id);
    }
    async delete(id) {
        return { success: true };
    }
};
exports.NotificationsV2Controller = NotificationsV2Controller;
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Query)('customerId')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], NotificationsV2Controller.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)('send'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendNotificationDto]),
    __metadata("design:returntype", Promise)
], NotificationsV2Controller.prototype, "send", null);
__decorate([
    (0, common_1.Post)('queue'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsV2Controller.prototype, "queue", null);
__decorate([
    (0, common_1.Post)('batch'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsV2Controller.prototype, "sendBatch", null);
__decorate([
    (0, common_1.Post)('process-pending'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationsV2Controller.prototype, "processPending", null);
__decorate([
    (0, common_1.Get)('templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationsV2Controller.prototype, "getTemplates", null);
__decorate([
    (0, common_1.Post)('templates/preview'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsV2Controller.prototype, "previewTemplate", null);
__decorate([
    (0, common_1.Get)('preferences'),
    __param(0, (0, common_1.Query)('customerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsV2Controller.prototype, "getPreferences", null);
__decorate([
    (0, common_1.Post)('preferences'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UpdatePreferenceDto]),
    __metadata("design:returntype", Promise)
], NotificationsV2Controller.prototype, "updatePreference", null);
__decorate([
    (0, common_1.Get)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsV2Controller.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)(':id/retry'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.RECEPTIONIST),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsV2Controller.prototype, "retry", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsV2Controller.prototype, "delete", null);
exports.NotificationsV2Controller = NotificationsV2Controller = __decorate([
    (0, common_1.Controller)('api/notifications/v2'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [notification_v2_service_1.NotificationV2Service])
], NotificationsV2Controller);
