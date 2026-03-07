/**
 * MechMind OS - Shop Floor DTOs
 */

import { IsString, IsOptional, IsEnum, IsInt, IsNumber, IsArray, IsUUID, IsJSON, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BayStatus, SensorType, JobStatus } from '../interfaces/shop-floor.interface';

export class InitializeShopFloorDto {
  @ApiProperty({ description: 'Shop floor name' })
  @IsString()
  name: string;

  @ApiProperty({ type: 'array', description: 'Service bays' })
  @IsArray()
  bays: {
    name: string;
    type: 'LIFT' | 'PIT' | 'HOIST' | 'DYNO' | 'ALIGNMENT' | 'DETAIL';
    location: { x: number; y: number; floor: number };
    capabilities: string[];
    maxVehicleWeight: number;
    liftCapacity?: number;
  }[];

  @ApiProperty({ type: 'array', required: false, description: 'Parking spots' })
  @IsOptional()
  @IsArray()
  parkingSpots?: {
    name: string;
    type: 'WAITING' | 'COMPLETED' | 'CUSTOMER' | 'STAFF';
    location: { x: number; y: number };
  }[];
}

export class AddBaySensorDto {
  @ApiProperty({ enum: SensorType, description: 'Sensor type' })
  @IsEnum(SensorType)
  type: SensorType;

  @ApiProperty({ description: 'Sensor name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Is sensor active', required: false })
  @IsOptional()
  @IsEnum(['true', 'false'])
  isActive?: 'true' | 'false';

  @ApiProperty({ description: 'Battery level (%)', required: false })
  @IsOptional()
  @IsNumber()
  batteryLevel?: number;

  @ApiProperty({ description: 'Sensor configuration', required: false })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class SensorReadingDto {
  @ApiProperty({ description: 'Sensor ID' })
  @IsString()
  sensorId: string;

  @ApiProperty({ description: 'Bay ID' })
  @IsString()
  bayId: string;

  @ApiProperty({ enum: SensorType, description: 'Sensor type' })
  @IsEnum(SensorType)
  type: SensorType;

  @ApiProperty({ description: 'Reading data' })
  @IsObject()
  data: {
    presence?: boolean;
    distance?: number;
    rfidTag?: string;
    beaconId?: string;
    pressure?: number;
    imageUrl?: string;
    licensePlate?: string;
    technicianId?: string;
    confidence?: number;
  };

  @ApiProperty({ description: 'Timestamp' })
  timestamp: Date;
}

export class AssignVehicleDto {
  @ApiProperty({ description: 'Vehicle ID' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ description: 'Work order ID' })
  @IsUUID()
  workOrderId: string;

  @ApiProperty({ type: [String], description: 'Technician IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  technicianIds: string[];
}

export class UpdateTechnicianLocationDto {
  @ApiProperty({ description: 'X coordinate' })
  @IsNumber()
  x: number;

  @ApiProperty({ description: 'Y coordinate' })
  @IsNumber()
  y: number;

  @ApiProperty({ description: 'Floor number' })
  @IsInt()
  floor: number;

  @ApiProperty({ description: 'Beacon ID' })
  @IsString()
  beaconId: string;
}

export class UpdateJobStatusDto {
  @ApiProperty({ enum: JobStatus, description: 'New status' })
  @IsEnum(JobStatus)
  status: JobStatus;
}

export class AnalyticsQueryDto {
  @ApiProperty({ description: 'From date (ISO 8601)' })
  @IsString()
  from: string;

  @ApiProperty({ description: 'To date (ISO 8601)' })
  @IsString()
  to: string;
}

export class BayResponseDto {
  id: string;
  name: string;
  type: string;
  status: BayStatus;
  currentVehicle?: {
    vehicleId: string;
    licensePlate: string;
    make: string;
    model: string;
    workOrderId: string;
    technicianIds: string[];
    checkInTime: Date;
    estimatedCompletion?: Date;
  };
  sensors: {
    id: string;
    type: SensorType;
    name: string;
    isActive: boolean;
    batteryLevel?: number;
  }[];
  location: { x: number; y: number; floor: number };
  capabilities: string[];
}

export class TechnicianLocationDto {
  technicianId: string;
  name: string;
  currentBayId?: string;
  lastSeenAt: Date;
  location: { x: number; y: number; floor: number };
  beaconId: string;
  status: 'AVAILABLE' | 'WORKING' | 'BREAK' | 'OFFLINE';
}

export class WorkOrderProgressDto {
  workOrderId: string;
  vehicleId: string;
  licensePlate: string;
  status: JobStatus;
  currentBayId?: string;
  assignedTechnicians: string[];
  services: {
    serviceId: string;
    name: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    estimatedMinutes: number;
    actualMinutes: number;
    technicianId?: string;
  }[];
  startTime?: Date;
  estimatedCompletion?: Date;
  actualCompletion?: Date;
  progressPercentage: number;
}

export class ShopFloorEventDto {
  id: string;
  type: 'VEHICLE_ENTRY' | 'VEHICLE_EXIT' | 'BAY_ASSIGNMENT' | 'STATUS_CHANGE' | 'TECHNICIAN_MOVE';
  timestamp: Date;
  bayId?: string;
  vehicleId?: string;
  technicianId?: string;
  workOrderId?: string;
  fromStatus?: string;
  toStatus?: string;
  metadata?: Record<string, any>;
}

export class ShopFloorAnalyticsDto {
  totalVehicles: number;
  averageServiceTime: number;
  bayUtilization: Record<string, number>;
  technicianEfficiency: Record<string, number>;
}
