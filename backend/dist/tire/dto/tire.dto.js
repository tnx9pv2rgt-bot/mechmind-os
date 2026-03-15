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
exports.TireSetQueryDto = exports.StoreTireDto = exports.MountTireDto = exports.UpdateTireSetDto = exports.CreateTireSetDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_transformer_1 = require("class-transformer");
class CreateTireSetDto {
}
exports.CreateTireSetDto = CreateTireSetDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTireSetDto.prototype, "vehicleId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTireSetDto.prototype, "brand", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTireSetDto.prototype, "model", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '225/45 R17' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTireSetDto.prototype, "size", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.TireSeason }),
    (0, class_validator_1.IsEnum)(client_1.TireSeason),
    __metadata("design:type", String)
], CreateTireSetDto.prototype, "season", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Manufacturing date code (DOT)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTireSetDto.prototype, "dot", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tread depth in mm' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateTireSetDto.prototype, "treadDepthMm", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Wear level 0-100%' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateTireSetDto.prototype, "wearLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Storage location, e.g. RACK-A3' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTireSetDto.prototype, "storageLocation", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTireSetDto.prototype, "notes", void 0);
class UpdateTireSetDto {
}
exports.UpdateTireSetDto = UpdateTireSetDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTireSetDto.prototype, "brand", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTireSetDto.prototype, "model", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTireSetDto.prototype, "size", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.TireSeason }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TireSeason),
    __metadata("design:type", String)
], UpdateTireSetDto.prototype, "season", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTireSetDto.prototype, "dot", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateTireSetDto.prototype, "treadDepthMm", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdateTireSetDto.prototype, "wearLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTireSetDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTireSetDto.prototype, "isActive", void 0);
class MountTireDto {
}
exports.MountTireDto = MountTireDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MountTireDto.prototype, "vehicleId", void 0);
class StoreTireDto {
}
exports.StoreTireDto = StoreTireDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'RACK-A3' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StoreTireDto.prototype, "storageLocation", void 0);
class TireSetQueryDto {
}
exports.TireSetQueryDto = TireSetQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], TireSetQueryDto.prototype, "vehicleId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.TireSeason }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TireSeason),
    __metadata("design:type", String)
], TireSetQueryDto.prototype, "season", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], TireSetQueryDto.prototype, "isStored", void 0);
