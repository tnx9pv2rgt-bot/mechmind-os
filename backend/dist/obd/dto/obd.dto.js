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
exports.VehicleHealthReportDto = exports.TroubleCodeResponseDto = exports.ObdReadingResponseDto = exports.ObdDeviceResponseDto = exports.ReadingQueryDto = exports.ClearTroubleCodesDto = exports.TroubleCodeDto = exports.ObdReadingDto = exports.UpdateDeviceDto = exports.RegisterDeviceDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class RegisterDeviceDto {
}
exports.RegisterDeviceDto = RegisterDeviceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Device serial number' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "serialNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Device name', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Device model', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "model", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Vehicle ID to associate', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "vehicleId", void 0);
class UpdateDeviceDto {
}
exports.UpdateDeviceDto = UpdateDeviceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDeviceDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateDeviceDto.prototype, "vehicleId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateDeviceDto.prototype, "isActive", void 0);
class ObdReadingDto {
}
exports.ObdReadingDto = ObdReadingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Device ID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ObdReadingDto.prototype, "deviceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Engine RPM', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "rpm", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Vehicle speed (km/h)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "speed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Coolant temperature (°C)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "coolantTemp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Engine load (%)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "engineLoad", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Fuel level (%)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "fuelLevel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Fuel rate (L/h)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "fuelRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Intake temperature (°C)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "intakeTemp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Mass air flow (g/s)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "maf", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Barometric pressure (kPa)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "barometric", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Intake manifold pressure (kPa)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "intakeMap", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Throttle position (%)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "throttlePos", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Control module voltage (V)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "voltage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Engine run time (seconds)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "runTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Distance since codes cleared (km)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "distance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'GPS latitude', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'GPS longitude', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ObdReadingDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Raw OBD data', required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ObdReadingDto.prototype, "rawData", void 0);
class TroubleCodeDto {
}
exports.TroubleCodeDto = TroubleCodeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'DTC code (e.g., P0301)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TroubleCodeDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Category', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TroubleCodeDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.TroubleCodeSeverity }),
    (0, class_validator_1.IsEnum)(client_1.TroubleCodeSeverity),
    __metadata("design:type", String)
], TroubleCodeDto.prototype, "severity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Code description' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TroubleCodeDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Symptoms', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TroubleCodeDto.prototype, "symptoms", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Likely causes', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TroubleCodeDto.prototype, "causes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Is pending code', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], TroubleCodeDto.prototype, "isPending", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Is permanent code', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], TroubleCodeDto.prototype, "isPermanent", void 0);
class ClearTroubleCodesDto {
}
exports.ClearTroubleCodesDto = ClearTroubleCodesDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User ID clearing the codes' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ClearTroubleCodesDto.prototype, "clearedBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Notes', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ClearTroubleCodesDto.prototype, "notes", void 0);
class ReadingQueryDto {
}
exports.ReadingQueryDto = ReadingQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ReadingQueryDto.prototype, "deviceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ReadingQueryDto.prototype, "vehicleId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Start date (ISO 8601)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReadingQueryDto.prototype, "from", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'End date (ISO 8601)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReadingQueryDto.prototype, "to", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, default: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ReadingQueryDto.prototype, "limit", void 0);
class ObdDeviceResponseDto {
}
exports.ObdDeviceResponseDto = ObdDeviceResponseDto;
class ObdReadingResponseDto {
}
exports.ObdReadingResponseDto = ObdReadingResponseDto;
class TroubleCodeResponseDto {
}
exports.TroubleCodeResponseDto = TroubleCodeResponseDto;
class VehicleHealthReportDto {
}
exports.VehicleHealthReportDto = VehicleHealthReportDto;
