/**
 * MechMind OS - Shop Floor DTOs
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsArray,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
    status?: BayStatus;
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
  config?: Record<string, unknown>;
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

  @ApiProperty({ type: [String], description: 'Technician IDs (cuid format)' })
  @IsArray()
  @IsString({ each: true })
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
  @ApiProperty({ description: 'ID della baia', example: 'bay_001' })
  id: string;

  @ApiProperty({ description: 'Nome della baia', example: 'Baia 1 - Ponte sollevatore' })
  name: string;

  @ApiProperty({ description: 'Tipo di baia', example: 'LIFT' })
  type: string;

  @ApiProperty({
    description: 'Stato della baia',
    enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_SERVICE'],
  })
  status: BayStatus;

  @ApiPropertyOptional({ description: 'Veicolo attualmente in baia' })
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

  @ApiProperty({ description: 'Sensori installati nella baia' })
  sensors: {
    id: string;
    type: SensorType;
    name: string;
    isActive: boolean;
    batteryLevel?: number;
  }[];

  @ApiProperty({ description: 'Posizione della baia' })
  location: { x: number; y: number; floor: number };

  @ApiProperty({
    description: 'Capacità della baia',
    example: ['oil_change', 'brake_service', 'alignment'],
  })
  capabilities: string[];
}

export class TechnicianLocationDto {
  @ApiProperty({ description: 'ID del tecnico', example: 'tech_001' })
  technicianId: string;

  @ApiProperty({ description: 'Nome del tecnico', example: 'Marco Bianchi' })
  name: string;

  @ApiPropertyOptional({ description: 'ID della baia corrente', example: 'bay_001' })
  currentBayId?: string;

  @ApiProperty({ description: 'Ultimo rilevamento', example: '2026-03-16T10:30:00Z' })
  lastSeenAt: Date;

  @ApiProperty({ description: 'Posizione corrente' })
  location: { x: number; y: number; floor: number };

  @ApiProperty({ description: 'ID del beacon BLE', example: 'beacon_A3' })
  beaconId: string;

  @ApiProperty({
    description: 'Stato del tecnico',
    enum: ['AVAILABLE', 'WORKING', 'BREAK', 'OFFLINE'],
    example: 'WORKING',
  })
  status: 'AVAILABLE' | 'WORKING' | 'BREAK' | 'OFFLINE';
}

export class WorkOrderProgressDto {
  @ApiProperty({ description: "ID dell'ordine di lavoro", example: 'wo_2026_001' })
  workOrderId: string;

  @ApiProperty({ description: 'ID del veicolo', example: 'veh_001' })
  vehicleId: string;

  @ApiProperty({ description: 'Targa del veicolo', example: 'AB123CD' })
  licensePlate: string;

  @ApiProperty({
    description: 'Stato del lavoro',
    enum: ['QUEUED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'],
  })
  status: JobStatus;

  @ApiPropertyOptional({ description: 'ID della baia corrente', example: 'bay_001' })
  currentBayId?: string;

  @ApiProperty({ description: 'Tecnici assegnati', example: ['tech_001', 'tech_002'] })
  assignedTechnicians: string[];

  @ApiProperty({ description: "Servizi dell'ordine" })
  services: {
    serviceId: string;
    name: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    estimatedMinutes: number;
    actualMinutes: number;
    technicianId?: string;
  }[];

  @ApiPropertyOptional({ description: 'Ora di inizio', example: '2026-03-16T08:00:00Z' })
  startTime?: Date;

  @ApiPropertyOptional({ description: 'Completamento stimato', example: '2026-03-16T12:00:00Z' })
  estimatedCompletion?: Date;

  @ApiPropertyOptional({ description: 'Completamento effettivo', example: '2026-03-16T11:45:00Z' })
  actualCompletion?: Date;

  @ApiProperty({ description: 'Percentuale di avanzamento', example: 65 })
  progressPercentage: number;
}

export class ShopFloorEventDto {
  @ApiProperty({ description: "ID dell'evento", example: 'evt_001' })
  id: string;

  @ApiProperty({
    description: 'Tipo di evento',
    enum: ['VEHICLE_ENTRY', 'VEHICLE_EXIT', 'BAY_ASSIGNMENT', 'STATUS_CHANGE', 'TECHNICIAN_MOVE'],
  })
  type: 'VEHICLE_ENTRY' | 'VEHICLE_EXIT' | 'BAY_ASSIGNMENT' | 'STATUS_CHANGE' | 'TECHNICIAN_MOVE';

  @ApiProperty({ description: "Timestamp dell'evento", example: '2026-03-16T10:30:00Z' })
  timestamp: Date;

  @ApiPropertyOptional({ description: 'ID della baia', example: 'bay_001' })
  bayId?: string;

  @ApiPropertyOptional({ description: 'ID del veicolo', example: 'veh_001' })
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'ID del tecnico', example: 'tech_001' })
  technicianId?: string;

  @ApiPropertyOptional({ description: "ID dell'ordine di lavoro", example: 'wo_2026_001' })
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Stato precedente', example: 'IN_PROGRESS' })
  fromStatus?: string;

  @ApiPropertyOptional({ description: 'Nuovo stato', example: 'COMPLETED' })
  toStatus?: string;

  @ApiPropertyOptional({ description: 'Metadati aggiuntivi' })
  metadata?: Record<string, unknown>;
}

export class ShopFloorAnalyticsDto {
  @ApiProperty({ description: 'Veicoli totali nel periodo', example: 42 })
  totalVehicles: number;

  @ApiProperty({ description: 'Tempo medio di servizio (minuti)', example: 95 })
  averageServiceTime: number;

  @ApiProperty({ description: 'Utilizzo baie (percentuale per baia)' })
  bayUtilization: Record<string, number>;

  @ApiProperty({ description: 'Efficienza tecnici (percentuale per tecnico)' })
  technicianEfficiency: Record<string, number>;
}
