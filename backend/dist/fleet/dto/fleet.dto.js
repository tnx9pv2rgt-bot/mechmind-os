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
exports.FleetResponseDto = exports.FleetVehicleResponseDto = exports.AddFleetVehicleDto = exports.UpdateFleetDto = exports.CreateFleetDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateFleetDto {
}
exports.CreateFleetDto = CreateFleetDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Fleet name' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFleetDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Fleet description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFleetDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Company name associated with the fleet' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFleetDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Primary contact name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFleetDto.prototype, "contactName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Primary contact email' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateFleetDto.prototype, "contactEmail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Primary contact phone' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFleetDto.prototype, "contactPhone", void 0);
class UpdateFleetDto {
}
exports.UpdateFleetDto = UpdateFleetDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Fleet name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateFleetDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Fleet description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateFleetDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Company name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateFleetDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Primary contact name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateFleetDto.prototype, "contactName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Primary contact email' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UpdateFleetDto.prototype, "contactEmail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Primary contact phone' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateFleetDto.prototype, "contactPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Whether the fleet is active' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateFleetDto.prototype, "isActive", void 0);
class AddFleetVehicleDto {
}
exports.AddFleetVehicleDto = AddFleetVehicleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Vehicle ID to add to the fleet' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AddFleetVehicleDto.prototype, "vehicleId", void 0);
class FleetVehicleResponseDto {
}
exports.FleetVehicleResponseDto = FleetVehicleResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FleetVehicleResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FleetVehicleResponseDto.prototype, "fleetId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FleetVehicleResponseDto.prototype, "vehicleId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], FleetVehicleResponseDto.prototype, "assignedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], FleetVehicleResponseDto.prototype, "removedAt", void 0);
class FleetResponseDto {
}
exports.FleetResponseDto = FleetResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FleetResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FleetResponseDto.prototype, "tenantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FleetResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], FleetResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FleetResponseDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], FleetResponseDto.prototype, "contactName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], FleetResponseDto.prototype, "contactEmail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], FleetResponseDto.prototype, "contactPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], FleetResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: [FleetVehicleResponseDto] }),
    __metadata("design:type", Array)
], FleetResponseDto.prototype, "vehicles", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], FleetResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], FleetResponseDto.prototype, "updatedAt", void 0);
