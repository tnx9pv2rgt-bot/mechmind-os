"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TireModule = void 0;
const common_1 = require("@nestjs/common");
const tire_controller_1 = require("./controllers/tire.controller");
const tire_service_1 = require("./services/tire.service");
const common_module_1 = require("../common/common.module");
const auth_module_1 = require("../auth/auth.module");
let TireModule = class TireModule {
};
exports.TireModule = TireModule;
exports.TireModule = TireModule = __decorate([
    (0, common_1.Module)({
        imports: [common_module_1.CommonModule, auth_module_1.AuthModule],
        controllers: [tire_controller_1.TireController],
        providers: [tire_service_1.TireService],
        exports: [tire_service_1.TireService],
    })
], TireModule);
