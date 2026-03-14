"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IotModule = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("@nestjs-modules/ioredis");
const obd_streaming_service_1 = require("./obd/services/obd-streaming.service");
const obd_streaming_controller_1 = require("./obd/controllers/obd-streaming.controller");
const obd_streaming_gateway_1 = require("./obd/gateways/obd-streaming.gateway");
const vehicle_twin_service_1 = require("./vehicle-twin/services/vehicle-twin.service");
const vehicle_twin_controller_1 = require("./vehicle-twin/controllers/vehicle-twin.controller");
const shop_floor_service_1 = require("./shop-floor/services/shop-floor.service");
const shop_floor_controller_1 = require("./shop-floor/controllers/shop-floor.controller");
const shop_floor_gateway_1 = require("./shop-floor/gateways/shop-floor.gateway");
const license_plate_service_1 = require("./license-plate/services/license-plate.service");
const license_plate_controller_1 = require("./license-plate/controllers/license-plate.controller");
const common_module_1 = require("../common/common.module");
const notifications_module_1 = require("../notifications/notifications.module");
const auth_module_1 = require("../auth/auth.module");
let IotModule = class IotModule {
};
exports.IotModule = IotModule;
exports.IotModule = IotModule = __decorate([
    (0, common_1.Module)({
        imports: [
            common_module_1.CommonModule,
            auth_module_1.AuthModule,
            notifications_module_1.NotificationsModule,
            ioredis_1.RedisModule.forRoot({
                type: 'single',
                url: process.env.REDIS_URL || 'redis://localhost:6379',
            }),
        ],
        controllers: [
            obd_streaming_controller_1.ObdStreamingController,
            vehicle_twin_controller_1.VehicleTwinController,
            shop_floor_controller_1.ShopFloorController,
            license_plate_controller_1.LicensePlateController,
        ],
        providers: [
            obd_streaming_service_1.ObdStreamingService,
            obd_streaming_gateway_1.ObdStreamingGateway,
            vehicle_twin_service_1.VehicleTwinService,
            shop_floor_service_1.ShopFloorService,
            shop_floor_gateway_1.ShopFloorGateway,
            license_plate_service_1.LicensePlateService,
        ],
        exports: [obd_streaming_service_1.ObdStreamingService, vehicle_twin_service_1.VehicleTwinService, shop_floor_service_1.ShopFloorService, license_plate_service_1.LicensePlateService],
    })
], IotModule);
