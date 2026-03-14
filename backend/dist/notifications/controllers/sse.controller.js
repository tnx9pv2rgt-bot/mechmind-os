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
var SseController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SseController = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const sse_service_1 = require("../services/sse.service");
const uuid_1 = require("uuid");
let SseController = SseController_1 = class SseController {
    constructor(sseService) {
        this.sseService = sseService;
        this.logger = new common_1.Logger(SseController_1.name);
    }
    notificationsStream(req, lastEventId, userOnly) {
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;
        if (!userId || !tenantId) {
            throw new Error('User not authenticated');
        }
        const clientId = (0, uuid_1.v4)();
        this.logger.log(`SSE connection request from user ${userId} (tenant: ${tenantId}, lastEventId: ${lastEventId || 'none'})`);
        const targetUserId = userOnly === 'true' ? userId : undefined;
        return this.sseService.createEventStream(clientId, tenantId, targetUserId);
    }
    personalNotificationsStream(req, _lastEventId) {
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;
        if (!userId || !tenantId) {
            throw new Error('User not authenticated');
        }
        const clientId = (0, uuid_1.v4)();
        this.logger.log(`Personal SSE connection request from user ${userId} (tenant: ${tenantId})`);
        return this.sseService.createEventStream(clientId, tenantId, userId);
    }
};
exports.SseController = SseController;
__decorate([
    (0, common_1.Sse)('stream'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('last-event-id')),
    __param(2, (0, common_1.Query)('userOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", rxjs_1.Observable)
], SseController.prototype, "notificationsStream", null);
__decorate([
    (0, common_1.Sse)('stream/personal'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('last-event-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", rxjs_1.Observable)
], SseController.prototype, "personalNotificationsStream", null);
exports.SseController = SseController = SseController_1 = __decorate([
    (0, common_1.Controller)('notifications/sse'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [sse_service_1.SseService])
], SseController);
