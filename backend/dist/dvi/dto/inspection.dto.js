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
exports.InspectionSummaryDto = exports.InspectionResponseDto = exports.InspectionFindingResponseDto = exports.InspectionItemResponseDto = exports.InspectionPhotoResponseDto = exports.InspectionQueryDto = exports.CustomerApprovalDto = exports.UploadPhotoDto = exports.UpdateFindingDto = exports.CreateFindingDto = exports.UpdateInspectionDto = exports.UpdateInspectionItemDto = exports.CreateInspectionDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateInspectionDto {
}
exports.CreateInspectionDto = CreateInspectionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Vehicle ID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateInspectionDto.prototype, "vehicleId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Customer ID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateInspectionDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Template ID to use' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateInspectionDto.prototype, "templateId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Mechanic ID performing inspection' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateInspectionDto.prototype, "mechanicId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current mileage', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateInspectionDto.prototype, "mileage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Fuel level', enum: client_1.FuelLevel, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.FuelLevel),
    __metadata("design:type", String)
], CreateInspectionDto.prototype, "fuelLevel", void 0);
class UpdateInspectionItemDto {
}
exports.UpdateInspectionItemDto = UpdateInspectionItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Template item ID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateInspectionItemDto.prototype, "templateItemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.InspectionItemStatus }),
    (0, class_validator_1.IsEnum)(client_1.InspectionItemStatus),
    __metadata("design:type", String)
], UpdateInspectionItemDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateInspectionItemDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.FindingSeverity, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.FindingSeverity),
    __metadata("design:type", String)
], UpdateInspectionItemDto.prototype, "severity", void 0);
class UpdateInspectionDto {
}
exports.UpdateInspectionDto = UpdateInspectionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.InspectionStatus, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.InspectionStatus),
    __metadata("design:type", String)
], UpdateInspectionDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current mileage', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateInspectionDto.prototype, "mileage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Inspection items', type: [UpdateInspectionItemDto], required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => UpdateInspectionItemDto),
    __metadata("design:type", Array)
], UpdateInspectionDto.prototype, "items", void 0);
class CreateFindingDto {
}
exports.CreateFindingDto = CreateFindingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Category of finding' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFindingDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Title of finding' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFindingDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Detailed description' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFindingDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.FindingSeverity }),
    (0, class_validator_1.IsEnum)(client_1.FindingSeverity),
    __metadata("design:type", String)
], CreateFindingDto.prototype, "severity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Recommended action', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFindingDto.prototype, "recommendation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Estimated repair cost', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateFindingDto.prototype, "estimatedCost", void 0);
class UpdateFindingDto {
}
exports.UpdateFindingDto = UpdateFindingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.FindingStatus, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.FindingStatus),
    __metadata("design:type", String)
], UpdateFindingDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateFindingDto.prototype, "approvedByCustomer", void 0);
class UploadPhotoDto {
}
exports.UploadPhotoDto = UploadPhotoDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Item ID if photo is for specific item', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UploadPhotoDto.prototype, "itemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Photo category', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadPhotoDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Photo description', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadPhotoDto.prototype, "description", void 0);
class CustomerApprovalDto {
}
exports.CustomerApprovalDto = CustomerApprovalDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Customer email for verification' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerApprovalDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Customer signature (base64)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerApprovalDto.prototype, "signature", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Approved findings', type: [String] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CustomerApprovalDto.prototype, "approvedFindingIds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Declined findings', type: [String] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CustomerApprovalDto.prototype, "declinedFindingIds", void 0);
class InspectionQueryDto {
}
exports.InspectionQueryDto = InspectionQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], InspectionQueryDto.prototype, "vehicleId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], InspectionQueryDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.InspectionStatus, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.InspectionStatus),
    __metadata("design:type", String)
], InspectionQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InspectionQueryDto.prototype, "mechanicId", void 0);
class InspectionPhotoResponseDto {
}
exports.InspectionPhotoResponseDto = InspectionPhotoResponseDto;
class InspectionItemResponseDto {
}
exports.InspectionItemResponseDto = InspectionItemResponseDto;
class InspectionFindingResponseDto {
}
exports.InspectionFindingResponseDto = InspectionFindingResponseDto;
class InspectionResponseDto {
}
exports.InspectionResponseDto = InspectionResponseDto;
class InspectionSummaryDto {
}
exports.InspectionSummaryDto = InspectionSummaryDto;
