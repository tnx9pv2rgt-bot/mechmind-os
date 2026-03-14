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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_setup_service_1 = require("./admin-setup.service");
let AdminController = class AdminController {
    constructor(setupService) {
        this.setupService = setupService;
    }
    async setup(setupKey) {
        const expectedKey = process.env.SETUP_SECRET;
        if (!expectedKey) {
            throw new common_1.HttpException('Server misconfiguration', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (setupKey !== expectedKey) {
            throw new common_1.HttpException('Unauthorized', common_1.HttpStatus.UNAUTHORIZED);
        }
        const data = await this.setupService.seedDemoData();
        return {
            message: 'Demo data seeded successfully',
            data,
        };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Post)('setup'),
    __param(0, (0, common_1.Headers)('x-setup-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setup", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_setup_service_1.AdminSetupService])
], AdminController);
