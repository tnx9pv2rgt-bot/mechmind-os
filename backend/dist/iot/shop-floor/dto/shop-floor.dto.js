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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopFloorAnalyticsDto = exports.ShopFloorEventDto = exports.WorkOrderProgressDto = exports.TechnicianLocationDto = exports.BayResponseDto = exports.AnalyticsQueryDto = exports.UpdateJobStatusDto = exports.UpdateTechnicianLocationDto = exports.AssignVehicleDto = exports.SensorReadingDto = exports.AddBaySensorDto = exports.InitializeShopFloorDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const shop_floor_interface_1 = require("../interfaces/shop-floor.interface");
class InitializeShopFloorDto {
}
exports.InitializeShopFloorDto = InitializeShopFloorDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Shop floor name' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InitializeShopFloorDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: 'array', description: 'Service bays' }),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], InitializeShopFloorDto.prototype, "bays", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: 'array', required: false, description: 'Parking spots' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], InitializeShopFloorDto.prototype, "parkingSpots", void 0);
class AddBaySensorDto {
}
exports.AddBaySensorDto = AddBaySensorDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: shop_floor_interface_1.SensorType, description: 'Sensor type' }),
    (0, class_validator_1.IsEnum)(shop_floor_interface_1.SensorType),
    __metadata("design:type", String)
], AddBaySensorDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Sensor name' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddBaySensorDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Is sensor active', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['true', 'false']),
    __metadata("design:type", String)
], AddBaySensorDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Battery level (%)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], AddBaySensorDto.prototype, "batteryLevel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Sensor configuration', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], AddBaySensorDto.prototype, "config", void 0);
class SensorReadingDto {
}
exports.SensorReadingDto = SensorReadingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Sensor ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SensorReadingDto.prototype, "sensorId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Bay ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SensorReadingDto.prototype, "bayId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: shop_floor_interface_1.SensorType, description: 'Sensor type' }),
    (0, class_validator_1.IsEnum)(shop_floor_interface_1.SensorType),
    __metadata("design:type", String)
], SensorReadingDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Reading data' }),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], SensorReadingDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Timestamp' }),
    __metadata("design:type", Date)
], SensorReadingDto.prototype, "timestamp", void 0);
class AssignVehicleDto {
}
exports.AssignVehicleDto = AssignVehicleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Vehicle ID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AssignVehicleDto.prototype, "vehicleId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Work order ID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AssignVehicleDto.prototype, "workOrderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String], description: 'Technician IDs' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], AssignVehicleDto.prototype, "technicianIds", void 0);
class UpdateTechnicianLocationDto {
}
exports.UpdateTechnicianLocationDto = UpdateTechnicianLocationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'X coordinate' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTechnicianLocationDto.prototype, "x", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Y coordinate' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTechnicianLocationDto.prototype, "y", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Floor number' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateTechnicianLocationDto.prototype, "floor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Beacon ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTechnicianLocationDto.prototype, "beaconId", void 0);
class UpdateJobStatusDto {
}
exports.UpdateJobStatusDto = UpdateJobStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: shop_floor_interface_1.JobStatus, description: 'New status' }),
    (0, class_validator_1.IsEnum)(shop_floor_interface_1.JobStatus),
    __metadata("design:type", String)
], UpdateJobStatusDto.prototype, "status", void 0);
class AnalyticsQueryDto {
}
exports.AnalyticsQueryDto = AnalyticsQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'From date (ISO 8601)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalyticsQueryDto.prototype, "from", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'To date (ISO 8601)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalyticsQueryDto.prototype, "to", void 0);
class BayResponseDto {
}
exports.BayResponseDto = BayResponseDto;
class TechnicianLocationDto {
}
exports.TechnicianLocationDto = TechnicianLocationDto;
class WorkOrderProgressDto {
}
exports.WorkOrderProgressDto = WorkOrderProgressDto;
class ShopFloorEventDto {
}
exports.ShopFloorEventDto = ShopFloorEventDto;
class ShopFloorAnalyticsDto {
}
exports.ShopFloorAnalyticsDto = ShopFloorAnalyticsDto;
