"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaborGuideModule = void 0;
const common_1 = require("@nestjs/common");
const common_module_1 = require("../common/common.module");
const labor_guide_controller_1 = require("./controllers/labor-guide.controller");
const labor_guide_service_1 = require("./services/labor-guide.service");
let LaborGuideModule = class LaborGuideModule {
};
exports.LaborGuideModule = LaborGuideModule;
exports.LaborGuideModule = LaborGuideModule = __decorate([
    (0, common_1.Module)({
        imports: [common_module_1.CommonModule],
        controllers: [labor_guide_controller_1.LaborGuideController],
        providers: [labor_guide_service_1.LaborGuideService],
        exports: [labor_guide_service_1.LaborGuideService],
    })
], LaborGuideModule);
