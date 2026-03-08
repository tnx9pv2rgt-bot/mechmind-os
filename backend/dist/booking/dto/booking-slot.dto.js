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
exports.SlotAvailabilityResponseDto = exports.BookingSlotResponseDto = exports.CreateSlotDto = exports.FindAvailableSlotsDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class FindAvailableSlotsDto {
}
exports.FindAvailableSlotsDto = FindAvailableSlotsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Date to find slots for',
        example: '2024-01-15',
    }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], FindAvailableSlotsDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Service ID to check availability for',
        example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], FindAvailableSlotsDto.prototype, "serviceId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Required duration in minutes',
        example: 60,
        minimum: 15,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(15),
    __metadata("design:type", Number)
], FindAvailableSlotsDto.prototype, "duration", void 0);
class CreateSlotDto {
}
exports.CreateSlotDto = CreateSlotDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Slot start time',
        example: '2024-01-15T09:00:00Z',
    }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSlotDto.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Slot end time',
        example: '2024-01-15T10:00:00Z',
    }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSlotDto.prototype, "endTime", void 0);
class BookingSlotResponseDto {
}
exports.BookingSlotResponseDto = BookingSlotResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    __metadata("design:type", String)
], BookingSlotResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-15T09:00:00Z' }),
    __metadata("design:type", Date)
], BookingSlotResponseDto.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-15T10:00:00Z' }),
    __metadata("design:type", Date)
], BookingSlotResponseDto.prototype, "endTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'AVAILABLE', enum: ['AVAILABLE', 'BOOKED', 'BLOCKED', 'RESERVED'] }),
    __metadata("design:type", String)
], BookingSlotResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01T00:00:00Z' }),
    __metadata("design:type", Date)
], BookingSlotResponseDto.prototype, "createdAt", void 0);
class SlotAvailabilityResponseDto {
}
exports.SlotAvailabilityResponseDto = SlotAvailabilityResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-15' }),
    __metadata("design:type", String)
], SlotAvailabilityResponseDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Available time slots',
        type: [BookingSlotResponseDto],
    }),
    __metadata("design:type", Array)
], SlotAvailabilityResponseDto.prototype, "availableSlots", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 8 }),
    __metadata("design:type", Number)
], SlotAvailabilityResponseDto.prototype, "totalSlots", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5 }),
    __metadata("design:type", Number)
], SlotAvailabilityResponseDto.prototype, "availableCount", void 0);
