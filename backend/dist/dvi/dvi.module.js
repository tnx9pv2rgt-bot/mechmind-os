"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DviModule = void 0;
const common_1 = require("@nestjs/common");
const inspection_controller_1 = require("./controllers/inspection.controller");
const inspection_service_1 = require("./services/inspection.service");
const prisma_service_1 = require("../common/services/prisma.service");
const s3_service_1 = require("../common/services/s3.service");
const notifications_module_1 = require("../notifications/notifications.module");
let DviModule = class DviModule {
};
exports.DviModule = DviModule;
exports.DviModule = DviModule = __decorate([
    (0, common_1.Module)({
        imports: [notifications_module_1.NotificationsModule],
        controllers: [inspection_controller_1.InspectionController],
        providers: [
            inspection_service_1.InspectionService,
            prisma_service_1.PrismaService,
            s3_service_1.S3Service,
        ],
        exports: [inspection_service_1.InspectionService],
    })
], DviModule);
