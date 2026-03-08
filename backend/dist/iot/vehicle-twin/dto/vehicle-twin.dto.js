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
exports.WearPredictionDto = exports.VehicleTwinStateDto = exports.PredictiveAlertDto = exports.ComponentResponseDto = exports.HealthTrendQueryDto = exports.UpdateVisualizationConfigDto = exports.RecordDamageDto = exports.RecordHistoryDto = exports.UpdateComponentDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateComponentDto {
}
exports.UpdateComponentDto = UpdateComponentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['HEALTHY', 'WARNING', 'CRITICAL', 'REPLACED', 'REPAIRING'], required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['HEALTHY', 'WARNING', 'CRITICAL', 'REPLACED', 'REPAIRING']),
    __metadata("design:type", String)
], UpdateComponentDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateComponentDto.prototype, "healthScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: 'object' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateComponentDto.prototype, "metadata", void 0);
class RecordHistoryDto {
}
exports.RecordHistoryDto = RecordHistoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Component ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordHistoryDto.prototype, "componentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['INSPECTION', 'REPAIR', 'REPLACEMENT', 'DAMAGE', 'MAINTENANCE'] }),
    (0, class_validator_1.IsEnum)(['INSPECTION', 'REPAIR', 'REPLACEMENT', 'DAMAGE', 'MAINTENANCE']),
    __metadata("design:type", String)
], RecordHistoryDto.prototype, "eventType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Event description' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordHistoryDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Event date (defaults to now)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordHistoryDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RecordHistoryDto.prototype, "technicianId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], RecordHistoryDto.prototype, "cost", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], RecordHistoryDto.prototype, "partsUsed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], RecordHistoryDto.prototype, "photos", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], RecordHistoryDto.prototype, "documents", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], RecordHistoryDto.prototype, "odometer", void 0);
class RecordDamageDto {
}
exports.RecordDamageDto = RecordDamageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Component ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordDamageDto.prototype, "componentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['DENT', 'SCRATCH', 'CRACK', 'CORROSION', 'WEAR', 'IMPACT'] }),
    (0, class_validator_1.IsEnum)(['DENT', 'SCRATCH', 'CRACK', 'CORROSION', 'WEAR', 'IMPACT']),
    __metadata("design:type", String)
], RecordDamageDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['MINOR', 'MODERATE', 'SEVERE'] }),
    (0, class_validator_1.IsEnum)(['MINOR', 'MODERATE', 'SEVERE']),
    __metadata("design:type", String)
], RecordDamageDto.prototype, "severity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Damage description' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordDamageDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: 'object', description: '3D location coordinates' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], RecordDamageDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], RecordDamageDto.prototype, "photos", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'When damage was reported (defaults to now)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordDamageDto.prototype, "reportedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], RecordDamageDto.prototype, "repairCost", void 0);
class UpdateVisualizationConfigDto {
}
exports.UpdateVisualizationConfigDto = UpdateVisualizationConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['GLTF', 'GLB', 'OBJ', 'FBX'], required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['GLTF', 'GLB', 'OBJ', 'FBX']),
    __metadata("design:type", String)
], UpdateVisualizationConfigDto.prototype, "modelFormat", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateVisualizationConfigDto.prototype, "modelUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: 'array' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdateVisualizationConfigDto.prototype, "componentMappings", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: 'object' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateVisualizationConfigDto.prototype, "defaultCameraPosition", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: 'array' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdateVisualizationConfigDto.prototype, "hotspots", void 0);
class HealthTrendQueryDto {
}
exports.HealthTrendQueryDto = HealthTrendQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'From date (ISO 8601)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HealthTrendQueryDto.prototype, "from", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'To date (ISO 8601)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HealthTrendQueryDto.prototype, "to", void 0);
class ComponentResponseDto {
}
exports.ComponentResponseDto = ComponentResponseDto;
class PredictiveAlertDto {
}
exports.PredictiveAlertDto = PredictiveAlertDto;
class VehicleTwinStateDto {
}
exports.VehicleTwinStateDto = VehicleTwinStateDto;
class WearPredictionDto {
}
exports.WearPredictionDto = WearPredictionDto;
