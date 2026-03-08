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
exports.VehicleLookupResponseDto = exports.LprStatsDto = exports.LprCameraDto = exports.ParkingSessionDto = exports.VehicleEntryExitDto = exports.LicensePlateDetectionDto = exports.LprStatsQueryDto = exports.LookupPlateDto = exports.RegisterCameraDto = exports.RecordEntryExitDto = exports.DetectLicensePlateDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const license_plate_interface_1 = require("../interfaces/license-plate.interface");
class DetectLicensePlateDto {
}
exports.DetectLicensePlateDto = DetectLicensePlateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: license_plate_interface_1.OcrProvider, required: false, description: 'OCR provider' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(license_plate_interface_1.OcrProvider),
    __metadata("design:type", String)
], DetectLicensePlateDto.prototype, "provider", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Camera ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DetectLicensePlateDto.prototype, "cameraId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Minimum confidence threshold (0-1)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DetectLicensePlateDto.prototype, "minConfidence", void 0);
class RecordEntryExitDto {
}
exports.RecordEntryExitDto = RecordEntryExitDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Detection ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordEntryExitDto.prototype, "detectionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: license_plate_interface_1.EntryExitType, description: 'Entry or exit' }),
    (0, class_validator_1.IsEnum)(license_plate_interface_1.EntryExitType),
    __metadata("design:type", String)
], RecordEntryExitDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Camera ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordEntryExitDto.prototype, "cameraId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Location' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordEntryExitDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Is authorized entry' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], RecordEntryExitDto.prototype, "isAuthorized", void 0);
class RegisterCameraDto {
}
exports.RegisterCameraDto = RegisterCameraDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Camera name' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterCameraDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Camera location' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterCameraDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: license_plate_interface_1.EntryExitType, description: 'Camera direction' }),
    (0, class_validator_1.IsEnum)(license_plate_interface_1.EntryExitType),
    __metadata("design:type", String)
], RegisterCameraDto.prototype, "direction", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: license_plate_interface_1.OcrProvider, description: 'OCR provider' }),
    (0, class_validator_1.IsEnum)(license_plate_interface_1.OcrProvider),
    __metadata("design:type", String)
], RegisterCameraDto.prototype, "provider", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Camera configuration' }),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], RegisterCameraDto.prototype, "config", void 0);
class LookupPlateDto {
}
exports.LookupPlateDto = LookupPlateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'License plate number' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LookupPlateDto.prototype, "licensePlate", void 0);
class LprStatsQueryDto {
}
exports.LprStatsQueryDto = LprStatsQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'From date (ISO 8601)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LprStatsQueryDto.prototype, "from", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'To date (ISO 8601)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LprStatsQueryDto.prototype, "to", void 0);
class LicensePlateDetectionDto {
}
exports.LicensePlateDetectionDto = LicensePlateDetectionDto;
class VehicleEntryExitDto {
}
exports.VehicleEntryExitDto = VehicleEntryExitDto;
class ParkingSessionDto {
}
exports.ParkingSessionDto = ParkingSessionDto;
class LprCameraDto {
}
exports.LprCameraDto = LprCameraDto;
class LprStatsDto {
}
exports.LprStatsDto = LprStatsDto;
class VehicleLookupResponseDto {
}
exports.VehicleLookupResponseDto = VehicleLookupResponseDto;
