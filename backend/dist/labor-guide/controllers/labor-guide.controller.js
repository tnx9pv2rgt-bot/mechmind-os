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
exports.LaborGuideController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const labor_guide_service_1 = require("../services/labor-guide.service");
const labor_guide_dto_1 = require("../dto/labor-guide.dto");
let LaborGuideController = class LaborGuideController {
    constructor(laborGuideService) {
        this.laborGuideService = laborGuideService;
    }
    async createGuide(tenantId, dto) {
        return this.laborGuideService.createGuide(tenantId, dto);
    }
    async findAllGuides(tenantId) {
        return this.laborGuideService.findAllGuides(tenantId);
    }
    async searchEntries(tenantId, query) {
        return this.laborGuideService.searchEntries(tenantId, query.make, query.model, query.category);
    }
    async findGuideById(tenantId, id) {
        return this.laborGuideService.findGuideById(tenantId, id);
    }
    async updateGuide(tenantId, id, dto) {
        return this.laborGuideService.updateGuide(tenantId, id, dto);
    }
    async deleteGuide(tenantId, id) {
        return this.laborGuideService.deleteGuide(tenantId, id);
    }
    async addEntry(tenantId, guideId, dto) {
        return this.laborGuideService.addEntry(tenantId, guideId, dto);
    }
    async updateEntry(tenantId, entryId, dto) {
        return this.laborGuideService.updateEntry(tenantId, entryId, dto);
    }
    async deleteEntry(tenantId, entryId) {
        return this.laborGuideService.deleteEntry(tenantId, entryId);
    }
};
exports.LaborGuideController = LaborGuideController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.ADMIN, roles_guard_1.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Create labor guide' }),
    (0, swagger_1.ApiResponse)({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, labor_guide_dto_1.CreateLaborGuideDto]),
    __metadata("design:returntype", Promise)
], LaborGuideController.prototype, "createGuide", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all labor guides' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LaborGuideController.prototype, "findAllGuides", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, swagger_1.ApiOperation)({ summary: 'Search labor guide entries by vehicle' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, labor_guide_dto_1.SearchLaborGuideDto]),
    __metadata("design:returntype", Promise)
], LaborGuideController.prototype, "searchEntries", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get labor guide with entries' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LaborGuideController.prototype, "findGuideById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.ADMIN, roles_guard_1.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Update labor guide' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, labor_guide_dto_1.UpdateLaborGuideDto]),
    __metadata("design:returntype", Promise)
], LaborGuideController.prototype, "updateGuide", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.ADMIN, roles_guard_1.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Soft delete labor guide' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LaborGuideController.prototype, "deleteGuide", null);
__decorate([
    (0, common_1.Post)(':guideId/entries'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.ADMIN, roles_guard_1.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Add entry to labor guide' }),
    (0, swagger_1.ApiResponse)({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('guideId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, labor_guide_dto_1.CreateLaborGuideEntryDto]),
    __metadata("design:returntype", Promise)
], LaborGuideController.prototype, "addEntry", null);
__decorate([
    (0, common_1.Patch)('entries/:entryId'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.ADMIN, roles_guard_1.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Update labor guide entry' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('entryId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, labor_guide_dto_1.UpdateLaborGuideEntryDto]),
    __metadata("design:returntype", Promise)
], LaborGuideController.prototype, "updateEntry", null);
__decorate([
    (0, common_1.Delete)('entries/:entryId'),
    (0, roles_decorator_1.Roles)(roles_guard_1.UserRole.ADMIN, roles_guard_1.UserRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Delete labor guide entry' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('entryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LaborGuideController.prototype, "deleteEntry", null);
exports.LaborGuideController = LaborGuideController = __decorate([
    (0, swagger_1.ApiTags)('Labor Guide'),
    (0, common_1.Controller)('labor-guides'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [labor_guide_service_1.LaborGuideService])
], LaborGuideController);
