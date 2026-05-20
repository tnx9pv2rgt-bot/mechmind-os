/**
 * MechMind OS - OBD Streaming DTOs
 */

import { IsString, IsOptional, IsEnum, IsInt, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  rawData?: Record<string, unknown>;
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
  @ApiProperty({ description: 'ID dello stream', example: 'stream_abc123' })
  streamId: string;

  @ApiProperty({ description: 'ID del dispositivo OBD', example: 'obd_device_001' })
  deviceId: string;

  @ApiProperty({ description: 'Tipo di adattatore OBD', enum: AdapterType })
  adapterType: AdapterType;

  @ApiProperty({ description: 'Protocollo OBD', enum: ObdProtocol })
  protocol: ObdProtocol;

  @ApiProperty({ description: 'Stream attivo', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Ora di inizio stream', example: '2026-03-16T10:00:00Z' })
  startTime: Date;

  @ApiProperty({ description: 'Configurazione dello stream' })
  config: {
    sensors: string[];
    interval: number;
  };
}

export class FreezeFrameResponseDto {
  @ApiProperty({ description: 'ID del freeze frame', example: 'ff_001' })
  id: string;

  @ApiProperty({ description: 'ID del dispositivo', example: 'obd_device_001' })
  deviceId: string;

  @ApiProperty({ description: 'Codice DTC', example: 'P0301' })
  dtcCode: string;

  @ApiProperty({ description: 'Data di cattura', example: '2026-03-16T10:05:00Z' })
  capturedAt: Date;

  @ApiProperty({ description: 'Dati del freeze frame' })
  data: Record<string, unknown>;
}

export class Mode06TestResponseDto {
  @ApiProperty({ description: 'ID del test', example: 1 })
  testId: number;

  @ApiProperty({ description: 'ID del componente', example: 32 })
  componentId: number;

  @ApiProperty({ description: 'Nome del test', example: 'Catalyst Monitor Bank 1' })
  testName: string;

  @ApiProperty({ description: 'Valore misurato', example: 0.85 })
  value: number;

  @ApiPropertyOptional({ description: 'Valore minimo', example: 0.0 })
  minValue?: number;

  @ApiPropertyOptional({ description: 'Valore massimo', example: 1.0 })
  maxValue?: number;

  @ApiProperty({
    description: 'Esito del test',
    enum: ['PASS', 'FAIL', 'INCOMPLETE'],
    example: 'PASS',
  })
  status: 'PASS' | 'FAIL' | 'INCOMPLETE';

  @ApiProperty({ description: 'Unità di misura', example: 'V' })
  unit: string;
}

export class EvapTestResponseDto {
  @ApiProperty({ description: 'ID del test EVAP', example: 'evap_001' })
  id: string;

  @ApiProperty({ description: 'ID del dispositivo', example: 'obd_device_001' })
  deviceId: string;

  @ApiProperty({
    description: 'Tipo di test',
    enum: ['LEAK', 'PRESSURE', 'VACUUM'],
    example: 'LEAK',
  })
  testType: 'LEAK' | 'PRESSURE' | 'VACUUM';

  @ApiProperty({ description: 'Inizio del test', example: '2026-03-16T10:00:00Z' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Fine del test', example: '2026-03-16T10:15:00Z' })
  completedAt?: Date;

  @ApiProperty({
    description: 'Stato del test',
    enum: ['RUNNING', 'COMPLETED', 'FAILED', 'ABORTED'],
    example: 'COMPLETED',
  })
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ABORTED';

  @ApiProperty({ description: 'Risultati del test' })
  results: Record<string, unknown>[];
}
