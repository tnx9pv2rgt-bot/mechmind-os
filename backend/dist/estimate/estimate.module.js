"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstimateModule = void 0;
const common_1 = require("@nestjs/common");
const estimate_controller_1 = require("./controllers/estimate.controller");
const estimate_service_1 = require("./services/estimate.service");
const common_module_1 = require("../common/common.module");
let EstimateModule = class EstimateModule {
};
exports.EstimateModule = EstimateModule;
exports.EstimateModule = EstimateModule = __decorate([
    (0, common_1.Module)({
        imports: [common_module_1.CommonModule],
        controllers: [estimate_controller_1.EstimateController],
        providers: [estimate_service_1.EstimateService],
        exports: [estimate_service_1.EstimateService],
    })
], EstimateModule);
