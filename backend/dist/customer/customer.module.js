"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const customer_controller_1 = require("./controllers/customer.controller");
const customer_service_1 = require("./services/customer.service");
const vehicle_service_1 = require("./services/vehicle.service");
const common_module_1 = require("../common/common.module");
let CustomerModule = class CustomerModule {
};
exports.CustomerModule = CustomerModule;
exports.CustomerModule = CustomerModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, common_module_1.CommonModule],
        controllers: [customer_controller_1.CustomerController],
        providers: [customer_service_1.CustomerService, vehicle_service_1.VehicleService],
        exports: [customer_service_1.CustomerService, vehicle_service_1.VehicleService],
    })
], CustomerModule);
