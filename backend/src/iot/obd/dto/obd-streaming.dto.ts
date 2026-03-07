/**
 * MechMind OS - OBD Streaming DTOs
 */

import { IsString, IsOptional, IsEnum, IsInt, IsNumber, IsArray, IsJSON } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AdapterType, ObdProtocol } from '../interfaces/obd-streaming.interface';

export class StartStreamingDto {
  @ApiProperty({ description: 'Device ID' })
  @IsString()
  deviceId: string;

  @ApiProperty({ enum: AdapterType, description: 'OBD adapter type' })
  @IsEnum(AdapterType)
  adapterType: AdapterType;

  @ApiProperty({ enum: ObdProtocol, required: false })
  @IsOptional()
  @IsEnum(ObdProtocol)
  protocol?: ObdProtocol;

  @ApiProperty({ description: 'Sensors to stream', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sensors?: string[];

  @ApiProperty({ description: 'Polling interval (ms)', required: false })
  @IsOptional()
  @IsInt()
  interval?: number;
}

export class SensorDataDto {
  @ApiProperty({ description: 'Timestamp' })
  timestamp: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  rpm?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  coolantTemp?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  throttlePos?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  engineLoad?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  fuelLevel?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  voltage?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  rawData?: Record<string, any>;
}

export class FreezeFrameRequestDto {
  @ApiProperty({ description: 'Device ID' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'DTC code to capture freeze frame for' })
  @IsString()
  dtcCode: string;
}

export class EvapTestRequestDto {
  @ApiProperty({ description: 'Device ID' })
  @IsString()
  deviceId: string;

  @ApiProperty({ enum: ['LEAK', 'PRESSURE', 'VACUUM'], description: 'Test type' })
  @IsEnum(['LEAK', 'PRESSURE', 'VACUUM'] as const)
  testType: 'LEAK' | 'PRESSURE' | 'VACUUM';
}

export class SensorHistoryQueryDto {
  @ApiProperty({ description: 'Device ID' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'Sensor name' })
  @IsString()
  sensor: string;

  @ApiProperty({ description: 'From date (ISO 8601)' })
  @IsString()
  from: string;

  @ApiProperty({ description: 'To date (ISO 8601)' })
  @IsString()
  to: string;

  @ApiProperty({ enum: ['avg', 'min', 'max', 'count'], required: false })
  @IsOptional()
  @IsEnum(['avg', 'min', 'max', 'count'] as const)
  aggregation?: 'avg' | 'min' | 'max' | 'count';
}

export class StreamResponseDto {
  streamId: string;
  deviceId: string;
  adapterType: AdapterType;
  protocol: ObdProtocol;
  isActive: boolean;
  startTime: Date;
  config: {
    sensors: string[];
    interval: number;
  };
}

export class FreezeFrameResponseDto {
  id: string;
  deviceId: string;
  dtcCode: string;
  capturedAt: Date;
  data: Record<string, any>;
}

export class Mode06TestResponseDto {
  testId: number;
  componentId: number;
  testName: string;
  value: number;
  minValue?: number;
  maxValue?: number;
  status: 'PASS' | 'FAIL' | 'INCOMPLETE';
  unit: string;
}

export class EvapTestResponseDto {
  id: string;
  deviceId: string;
  testType: 'LEAK' | 'PRESSURE' | 'VACUUM';
  startedAt: Date;
  completedAt?: Date;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ABORTED';
  results: any[];
}
