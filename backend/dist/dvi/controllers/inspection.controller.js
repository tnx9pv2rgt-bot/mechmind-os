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
exports.InspectionController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const inspection_service_1 = require("../services/inspection.service");
const throttler_1 = require("@nestjs/throttler");
const inspection_dto_1 = require("../dto/inspection.dto");
const roles_guard_2 = require("../../auth/guards/roles.guard");
let InspectionController = class InspectionController {
    constructor(inspectionService) {
        this.inspectionService = inspectionService;
    }
    async create(tenantId, dto) {
        return this.inspectionService.create(tenantId, dto);
    }
    async findAll(tenantId, query) {
        return this.inspectionService.findAll(tenantId, {
            vehicleId: query.vehicleId,
            customerId: query.customerId,
            status: query.status,
            mechanicId: query.mechanicId,
        });
    }
    async findById(tenantId, id) {
        return this.inspectionService.findById(tenantId, id);
    }
    async update(tenantId, userId, id, dto) {
        return this.inspectionService.update(tenantId, id, dto, userId);
    }
    async addFinding(tenantId, inspectionId, dto) {
        return this.inspectionService.addFinding(tenantId, inspectionId, dto);
    }
    async updateFinding(tenantId, findingId, dto) {
        return this.inspectionService.updateFinding(tenantId, findingId, dto);
    }
    async uploadPhoto(tenantId, userId, inspectionId, file, itemId, category, description) {
        if (!file) {
            throw new common_1.BadRequestException('Photo file is required');
        }
        return this.inspectionService.uploadPhoto(tenantId, inspectionId, file.buffer, file.mimetype, userId, itemId, category, description);
    }
    async submitApproval(tenantId, inspectionId, dto) {
        return this.inspectionService.submitCustomerApproval(tenantId, inspectionId, dto);
    }
    async generateReport(tenantId, id) {
        return this.inspectionService.generateReport(tenantId, id);
    }
};
exports.InspectionController = InspectionController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, swagger_1.ApiOperation)({ summary: 'Create new inspection' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: inspection_dto_1.InspectionResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, inspection_dto_1.CreateInspectionDto]),
    __metadata("design:returntype", Promise)
], InspectionController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List inspections' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [inspection_dto_1.InspectionSummaryDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, inspection_dto_1.InspectionQueryDto]),
    __metadata("design:returntype", Promise)
], InspectionController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get inspection by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: inspection_dto_1.InspectionResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InspectionController.prototype, "findById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, swagger_1.ApiOperation)({ summary: 'Update inspection' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: inspection_dto_1.InspectionResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, inspection_dto_1.UpdateInspectionDto]),
    __metadata("design:returntype", Promise)
], InspectionController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/findings'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, swagger_1.ApiOperation)({ summary: 'Add finding to inspection' }),
    (0, swagger_1.ApiResponse)({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, inspection_dto_1.CreateFindingDto]),
    __metadata("design:returntype", Promise)
], InspectionController.prototype, "addFinding", null);
__decorate([
    (0, common_1.Patch)('findings/:findingId'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, swagger_1.ApiOperation)({ summary: 'Update finding status' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('findingId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, inspection_dto_1.UpdateFindingDto]),
    __metadata("design:returntype", Promise)
], InspectionController.prototype, "updateFinding", null);
__decorate([
    (0, common_1.Post)(':id/photos'),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN, roles_guard_2.UserRole.MANAGER, roles_guard_2.UserRole.MECHANIC),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (file.mimetype.match(/image\/(jpg|jpeg|png|webp)/)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Only image files allowed'), false);
            }
        },
    })),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload inspection photo' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                itemId: { type: 'string' },
                category: { type: 'string' },
                description: { type: 'string' },
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.UploadedFile)()),
    __param(4, (0, common_1.Body)('itemId')),
    __param(5, (0, common_1.Body)('category')),
    __param(6, (0, common_1.Body)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], InspectionController.prototype, "uploadPhoto", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Customer approval of inspection findings' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, inspection_dto_1.CustomerApprovalDto]),
    __metadata("design:returntype", Promise)
], InspectionController.prototype, "submitApproval", null);
__decorate([
    (0, common_1.Get)(':id/report'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate PDF inspection report' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'PDF report' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InspectionController.prototype, "generateReport", null);
exports.InspectionController = InspectionController = __decorate([
    (0, swagger_1.ApiTags)('Digital Vehicle Inspection'),
    (0, common_1.Controller)('v1/inspections'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [inspection_service_1.InspectionService])
], InspectionController);
