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
exports.EvapTestResponseDto = exports.Mode06TestResponseDto = exports.FreezeFrameResponseDto = exports.StreamResponseDto = exports.SensorHistoryQueryDto = exports.EvapTestRequestDto = exports.FreezeFrameRequestDto = exports.SensorDataDto = exports.StartStreamingDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const obd_streaming_interface_1 = require("../interfaces/obd-streaming.interface");
class StartStreamingDto {
}
exports.StartStreamingDto = StartStreamingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Device ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StartStreamingDto.prototype, "deviceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: obd_streaming_interface_1.AdapterType, description: 'OBD adapter type' }),
    (0, class_validator_1.IsEnum)(obd_streaming_interface_1.AdapterType),
    __metadata("design:type", String)
], StartStreamingDto.prototype, "adapterType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: obd_streaming_interface_1.ObdProtocol, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(obd_streaming_interface_1.ObdProtocol),
    __metadata("design:type", String)
], StartStreamingDto.prototype, "protocol", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Sensors to stream', required: false, type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], StartStreamingDto.prototype, "sensors", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Polling interval (ms)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], StartStreamingDto.prototype, "interval", void 0);
class SensorDataDto {
}
exports.SensorDataDto = SensorDataDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Timestamp' }),
    __metadata("design:type", Date)
], SensorDataDto.prototype, "timestamp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SensorDataDto.prototype, "rpm", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SensorDataDto.prototype, "speed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SensorDataDto.prototype, "coolantTemp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SensorDataDto.prototype, "throttlePos", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SensorDataDto.prototype, "engineLoad", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SensorDataDto.prototype, "fuelLevel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SensorDataDto.prototype, "voltage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], SensorDataDto.prototype, "rawData", void 0);
class FreezeFrameRequestDto {
}
exports.FreezeFrameRequestDto = FreezeFrameRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Device ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FreezeFrameRequestDto.prototype, "deviceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'DTC code to capture freeze frame for' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FreezeFrameRequestDto.prototype, "dtcCode", void 0);
class EvapTestRequestDto {
}
exports.EvapTestRequestDto = EvapTestRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Device ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EvapTestRequestDto.prototype, "deviceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['LEAK', 'PRESSURE', 'VACUUM'], description: 'Test type' }),
    (0, class_validator_1.IsEnum)(['LEAK', 'PRESSURE', 'VACUUM']),
    __metadata("design:type", String)
], EvapTestRequestDto.prototype, "testType", void 0);
class SensorHistoryQueryDto {
}
exports.SensorHistoryQueryDto = SensorHistoryQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Device ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SensorHistoryQueryDto.prototype, "deviceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Sensor name' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SensorHistoryQueryDto.prototype, "sensor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'From date (ISO 8601)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SensorHistoryQueryDto.prototype, "from", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'To date (ISO 8601)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SensorHistoryQueryDto.prototype, "to", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['avg', 'min', 'max', 'count'], required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['avg', 'min', 'max', 'count']),
    __metadata("design:type", String)
], SensorHistoryQueryDto.prototype, "aggregation", void 0);
class StreamResponseDto {
}
exports.StreamResponseDto = StreamResponseDto;
class FreezeFrameResponseDto {
}
exports.FreezeFrameResponseDto = FreezeFrameResponseDto;
class Mode06TestResponseDto {
}
exports.Mode06TestResponseDto = Mode06TestResponseDto;
class EvapTestResponseDto {
}
exports.EvapTestResponseDto = EvapTestResponseDto;
