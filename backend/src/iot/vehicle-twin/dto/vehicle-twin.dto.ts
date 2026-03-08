/**
 * MechMind OS - Vehicle Twin DTOs
 */

import { IsString, IsOptional, IsEnum, IsInt, IsNumber, IsArray, IsJSON, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateComponentDto {
  @ApiProperty({ enum: ['HEALTHY', 'WARNING', 'CRITICAL', 'REPLACED', 'REPAIRING'], required: false })
  @IsOptional()
  @IsEnum(['HEALTHY', 'WARNING', 'CRITICAL', 'REPLACED', 'REPAIRING'] as const)
  status?: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'REPLACED' | 'REPAIRING';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  healthScore?: number;

  @ApiProperty({ required: false, type: 'object' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class RecordHistoryDto {
  @ApiProperty({ description: 'Component ID' })
  @IsString()
  componentId: string;

  @ApiProperty({ enum: ['INSPECTION', 'REPAIR', 'REPLACEMENT', 'DAMAGE', 'MAINTENANCE'] })
  @IsEnum(['INSPECTION', 'REPAIR', 'REPLACEMENT', 'DAMAGE', 'MAINTENANCE'] as const)
  eventType: 'INSPECTION' | 'REPAIR' | 'REPLACEMENT' | 'DAMAGE' | 'MAINTENANCE';

  @ApiProperty({ description: 'Event description' })
  @IsString()
  description: string;

  @ApiProperty({ required: false, description: 'Event date (defaults to now)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  technicianId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  partsUsed?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  odometer?: number;
}

export class RecordDamageDto {
  @ApiProperty({ description: 'Component ID' })
  @IsString()
  componentId: string;

  @ApiProperty({ enum: ['DENT', 'SCRATCH', 'CRACK', 'CORROSION', 'WEAR', 'IMPACT'] })
  @IsEnum(['DENT', 'SCRATCH', 'CRACK', 'CORROSION', 'WEAR', 'IMPACT'] as const)
  type: 'DENT' | 'SCRATCH' | 'CRACK' | 'CORROSION' | 'WEAR' | 'IMPACT';

  @ApiProperty({ enum: ['MINOR', 'MODERATE', 'SEVERE'] })
  @IsEnum(['MINOR', 'MODERATE', 'SEVERE'] as const)
  severity: 'MINOR' | 'MODERATE' | 'SEVERE';

  @ApiProperty({ description: 'Damage description' })
  @IsString()
  description: string;

  @ApiProperty({ required: false, type: 'object', description: '3D location coordinates' })
  @IsOptional()
  location?: { x: number; y: number; z: number };

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiProperty({ required: false, description: 'When damage was reported (defaults to now)' })
  @IsOptional()
  @IsString()
  reportedAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  repairCost?: number;
}

export class UpdateVisualizationConfigDto {
  @ApiProperty({ enum: ['GLTF', 'GLB', 'OBJ', 'FBX'], required: false })
  @IsOptional()
  @IsEnum(['GLTF', 'GLB', 'OBJ', 'FBX'] as const)
  modelFormat?: 'GLTF' | 'GLB' | 'OBJ' | 'FBX';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  modelUrl?: string;

  @ApiProperty({ required: false, type: 'array' })
  @IsOptional()
  componentMappings?: {
    componentId: string;
    meshName: string;
    materialName?: string;
  }[];

  @ApiProperty({ required: false, type: 'object' })
  @IsOptional()
  defaultCameraPosition?: { x: number; y: number; z: number };

  @ApiProperty({ required: false, type: 'array' })
  @IsOptional()
  hotspots?: {
    id: string;
    componentId: string;
    position: { x: number; y: number; z: number };
    label: string;
  }[];
}

export class HealthTrendQueryDto {
  @ApiProperty({ description: 'From date (ISO 8601)' })
  @IsString()
  from: string;

  @ApiProperty({ description: 'To date (ISO 8601)' })
  @IsString()
  to: string;
}

export class ComponentResponseDto {
  id: string;
  name: string;
  category: string;
  status: string;
  healthScore: number;
  lastServiceDate?: Date;
  nextServiceDue?: Date;
  estimatedLifespan?: number;
  position: { x: number; y: number; z: number };
  modelPartId?: string;
}

export class PredictiveAlertDto {
  id: string;
  componentId: string;
  componentName: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  predictedFailureDate: Date;
  confidence: number;
  recommendedAction: string;
  estimatedCost: number;
  reasoning: string[];
}

export class VehicleTwinStateDto {
  vehicleId: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  overallHealth: number;
  lastUpdated: Date;
  components: ComponentResponseDto[];
  activeAlerts: PredictiveAlertDto[];
  recentHistory: any[];
  damageRecords: any[];
  mileage: number;
  engineHours: number;
}

export class WearPredictionDto {
  componentId: string;
  currentWear: number;
  predictedWear: { date: Date; wearPercentage: number }[];
  factors: {
    drivingStyle: number;
    mileage: number;
    age: number;
    maintenanceHistory: number;
    environment: number;
  };
}
