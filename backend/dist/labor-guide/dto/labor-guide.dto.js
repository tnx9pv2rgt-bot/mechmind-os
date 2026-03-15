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
exports.SearchLaborGuideDto = exports.UpdateLaborGuideEntryDto = exports.CreateLaborGuideEntryDto = exports.UpdateLaborGuideDto = exports.CreateLaborGuideDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class CreateLaborGuideDto {
}
exports.CreateLaborGuideDto = CreateLaborGuideDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Guide name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLaborGuideDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Guide description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLaborGuideDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Source (e.g. MANUFACTURER, CUSTOM, AUTODATA)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLaborGuideDto.prototype, "source", void 0);
class UpdateLaborGuideDto {
}
exports.UpdateLaborGuideDto = UpdateLaborGuideDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Guide name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateLaborGuideDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Guide description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLaborGuideDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Source' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLaborGuideDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Active status' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateLaborGuideDto.prototype, "isActive", void 0);
class CreateLaborGuideEntryDto {
}
exports.CreateLaborGuideEntryDto = CreateLaborGuideEntryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Vehicle make' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLaborGuideEntryDto.prototype, "make", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Vehicle model' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLaborGuideEntryDto.prototype, "model", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Year from' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateLaborGuideEntryDto.prototype, "yearFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Year to' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateLaborGuideEntryDto.prototype, "yearTo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Operation code' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLaborGuideEntryDto.prototype, "operationCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Operation name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLaborGuideEntryDto.prototype, "operationName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Category (e.g. ENGINE, BRAKES, ELECTRICAL)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLaborGuideEntryDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Labor time in minutes' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateLaborGuideEntryDto.prototype, "laborTimeMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Difficulty level (1-5)', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateLaborGuideEntryDto.prototype, "difficultyLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLaborGuideEntryDto.prototype, "notes", void 0);
class UpdateLaborGuideEntryDto {
}
exports.UpdateLaborGuideEntryDto = UpdateLaborGuideEntryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Vehicle make' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateLaborGuideEntryDto.prototype, "make", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Vehicle model' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLaborGuideEntryDto.prototype, "model", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Year from' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateLaborGuideEntryDto.prototype, "yearFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Year to' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateLaborGuideEntryDto.prototype, "yearTo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Operation code' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateLaborGuideEntryDto.prototype, "operationCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Operation name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateLaborGuideEntryDto.prototype, "operationName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateLaborGuideEntryDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Labor time in minutes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateLaborGuideEntryDto.prototype, "laborTimeMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Difficulty level (1-5)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateLaborGuideEntryDto.prototype, "difficultyLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLaborGuideEntryDto.prototype, "notes", void 0);
class SearchLaborGuideDto {
}
exports.SearchLaborGuideDto = SearchLaborGuideDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Vehicle make' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SearchLaborGuideDto.prototype, "make", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Vehicle model' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchLaborGuideDto.prototype, "model", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Operation category' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchLaborGuideDto.prototype, "category", void 0);
