/**
 * MechMind OS - OBD Data Transfer Objects
 */

import { IsString, IsOptional, IsEnum, IsInt, IsNumber, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TroubleCodeSeverity, Prisma } from '@prisma/client';

// ==========================================
// Device Management
// ==========================================

export class RegisterDeviceDto {
  @ApiProperty({ description: 'Device serial number' })
  @IsString()
  serialNumber: string;

  @ApiProperty({ description: 'Device name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Device model', required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ description: 'Vehicle ID to associate', required: false })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}

export class UpdateDeviceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ==========================================
// OBD Readings
// ==========================================

export class ObdReadingDto {
  @ApiProperty({ description: 'Device ID' })
  @IsUUID()
  deviceId: string;

  @ApiProperty({ description: 'Engine RPM', required: false })
  @IsOptional()
  @IsInt()
  rpm?: number;

  @ApiProperty({ description: 'Vehicle speed (km/h)', required: false })
  @IsOptional()
  @IsInt()
  speed?: number;

  @ApiProperty({ description: 'Coolant temperature (°C)', required: false })
  @IsOptional()
  @IsInt()
  coolantTemp?: number;

  @ApiProperty({ description: 'Engine load (%)', required: false })
  @IsOptional()
  @IsNumber()
  engineLoad?: number;

  @ApiProperty({ description: 'Fuel level (%)', required: false })
  @IsOptional()
  @IsNumber()
  fuelLevel?: number;

  @ApiProperty({ description: 'Fuel rate (L/h)', required: false })
  @IsOptional()
  @IsNumber()
  fuelRate?: number;

  @ApiProperty({ description: 'Intake temperature (°C)', required: false })
  @IsOptional()
  @IsInt()
  intakeTemp?: number;

  @ApiProperty({ description: 'Mass air flow (g/s)', required: false })
  @IsOptional()
  @IsNumber()
  maf?: number;

  @ApiProperty({ description: 'Barometric pressure (kPa)', required: false })
  @IsOptional()
  @IsNumber()
  barometric?: number;

  @ApiProperty({ description: 'Intake manifold pressure (kPa)', required: false })
  @IsOptional()
  @IsNumber()
  intakeMap?: number;

  @ApiProperty({ description: 'Throttle position (%)', required: false })
  @IsOptional()
  @IsNumber()
  throttlePos?: number;

  @ApiProperty({ description: 'Control module voltage (V)', required: false })
  @IsOptional()
  @IsNumber()
  voltage?: number;

  @ApiProperty({ description: 'Engine run time (seconds)', required: false })
  @IsOptional()
  @IsInt()
  runTime?: number;

  @ApiProperty({ description: 'Distance since codes cleared (km)', required: false })
  @IsOptional()
  @IsInt()
  distance?: number;

  @ApiProperty({ description: 'GPS latitude', required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ description: 'GPS longitude', required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ description: 'Raw OBD data', required: false })
  @IsOptional()
  rawData?: Prisma.InputJsonValue;
}

// ==========================================
// Trouble Codes
// ==========================================

export class TroubleCodeDto {
  @ApiProperty({ description: 'DTC code (e.g., P0301)' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Category', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ enum: TroubleCodeSeverity })
  @IsEnum(TroubleCodeSeverity)
  severity: TroubleCodeSeverity;

  @ApiProperty({ description: 'Code description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Symptoms', required: false })
  @IsOptional()
  @IsString()
  symptoms?: string;

  @ApiProperty({ description: 'Likely causes', required: false })
  @IsOptional()
  @IsString()
  causes?: string;

  @ApiProperty({ description: 'Is pending code', required: false })
  @IsOptional()
  @IsBoolean()
  isPending?: boolean;

  @ApiProperty({ description: 'Is permanent code', required: false })
  @IsOptional()
  @IsBoolean()
  isPermanent?: boolean;
}

export class ClearTroubleCodesDto {
  @ApiProperty({ description: 'User ID clearing the codes' })
  @IsUUID()
  clearedBy: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ==========================================
// Query Parameters
// ==========================================

export class ReadingQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiProperty({ required: false, description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ required: false, description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiProperty({ required: false, default: 1, description: 'Page number' })
  @IsOptional()
  @IsInt()
  page?: number;

  @ApiProperty({ required: false, default: 100 })
  @IsOptional()
  @IsInt()
  limit?: number;
}

// ==========================================
// Response DTOs
// ==========================================

export class ObdDeviceResponseDto {
  id: string;
  serialNumber: string;
  name?: string;
  model?: string;
  isActive: boolean;
  lastConnected?: Date;
  batteryLevel?: number;
  vehicle?: {
    id: string;
    make: string;
    model: string;
    licensePlate: string;
  };
}

export class ObdReadingResponseDto {
  id: string;
  recordedAt: Date;
  rpm?: number;
  speed?: number;
  coolantTemp?: number;
  engineLoad?: number;
  fuelLevel?: number;
  fuelRate?: number;
  throttlePos?: number;
  voltage?: number;
  latitude?: number;
  longitude?: number;
}

export class TroubleCodeResponseDto {
  id: string;
  code: string;
  category: string;
  severity: TroubleCodeSeverity;
  description: string;
  symptoms?: string;
  causes?: string;
  isActive: boolean;
  isPending: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
  clearedAt?: Date;
}

export class VehicleHealthReportDto {
  vehicleId: string;
  vehicleInfo: string;
  overallStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  score: number; // 0-100
  activeCodes: number;
  pendingCodes: number;
  lastReading?: ObdReadingResponseDto;
  recommendations: string[];
}
