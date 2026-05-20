/**
 * MechMind OS - Vehicle Twin DTOs
 */

import { IsString, IsOptional, IsEnum, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateComponentDto {
  @ApiProperty({
    enum: ['HEALTHY', 'WARNING', 'CRITICAL', 'REPLACED', 'REPAIRING'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['HEALTHY', 'WARNING', 'CRITICAL', 'REPLACED', 'REPAIRING'] as const)
  status?: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'REPLACED' | 'REPAIRING';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  healthScore?: number;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  metadata?: Record<string, unknown>;
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
  @IsString()
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

  @ApiProperty({ required: false, type: Object, description: '3D location coordinates' })
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

  @ApiProperty({ required: false, type: Object })
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
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiProperty({ description: 'ID del componente', example: 'comp_001' })
  id: string;

  @ApiProperty({ description: 'Nome del componente', example: 'Pastiglie freno anteriori' })
  name: string;

  @ApiProperty({ description: 'Categoria', example: 'Freni' })
  category: string;

  @ApiProperty({ description: 'Stato del componente', example: 'HEALTHY' })
  status: string;

  @ApiProperty({ description: 'Punteggio di salute (0-100)', example: 85 })
  healthScore: number;

  @ApiPropertyOptional({ description: 'Data ultimo intervento', example: '2026-01-15T00:00:00Z' })
  lastServiceDate?: Date;

  @ApiPropertyOptional({
    description: 'Prossimo intervento previsto',
    example: '2026-07-15T00:00:00Z',
  })
  nextServiceDue?: Date;

  @ApiPropertyOptional({ description: 'Vita utile stimata (km)', example: 40000 })
  estimatedLifespan?: number;

  @ApiProperty({ description: 'Posizione 3D sul modello' })
  position: { x: number; y: number; z: number };

  @ApiPropertyOptional({ description: 'ID parte nel modello 3D', example: 'mesh_brake_front_left' })
  modelPartId?: string;
}

export class PredictiveAlertDto {
  @ApiProperty({ description: "ID dell'allarme", example: 'alert_001' })
  id: string;

  @ApiProperty({ description: 'ID del componente', example: 'comp_001' })
  componentId: string;

  @ApiProperty({ description: 'Nome del componente', example: 'Pastiglie freno anteriori' })
  componentName: string;

  @ApiProperty({
    description: 'Severità',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'HIGH',
  })
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiProperty({ description: 'Data prevista di guasto', example: '2026-05-20T00:00:00Z' })
  predictedFailureDate: Date;

  @ApiProperty({ description: 'Confidenza della previsione (0-1)', example: 0.87 })
  confidence: number;

  @ApiProperty({
    description: 'Azione raccomandata',
    example: 'Sostituire pastiglie freno entro 30 giorni',
  })
  recommendedAction: string;

  @ApiProperty({ description: 'Costo stimato della riparazione', example: 180.0 })
  estimatedCost: number;

  @ApiProperty({
    description: 'Motivazioni della previsione',
    example: ['Usura elevata', 'Chilometraggio alto', 'Storico manutenzione'],
  })
  reasoning: string[];
}

export class VehicleTwinStateDto {
  @ApiProperty({ description: 'ID del veicolo', example: 'veh_001' })
  vehicleId: string;

  @ApiProperty({ description: 'Numero di telaio (VIN)', example: 'WVWZZZ3CZWE123456' })
  vin: string;

  @ApiProperty({ description: 'Marca', example: 'Fiat' })
  make: string;

  @ApiProperty({ description: 'Modello', example: 'Panda' })
  model: string;

  @ApiProperty({ description: 'Anno di immatricolazione', example: 2023 })
  year: number;

  @ApiProperty({ description: 'Salute complessiva (0-100)', example: 78 })
  overallHealth: number;

  @ApiProperty({ description: 'Ultimo aggiornamento', example: '2026-03-16T10:30:00Z' })
  lastUpdated: Date;

  @ApiProperty({ description: 'Componenti del veicolo', type: [ComponentResponseDto] })
  components: ComponentResponseDto[];

  @ApiProperty({ description: 'Allarmi predittivi attivi', type: [PredictiveAlertDto] })
  activeAlerts: PredictiveAlertDto[];

  @ApiProperty({ description: 'Storico recente' })
  recentHistory: Record<string, unknown>[];

  @ApiProperty({ description: 'Registrazioni danni' })
  damageRecords: Record<string, unknown>[];

  @ApiProperty({ description: 'Chilometraggio attuale', example: 45200 })
  mileage: number;

  @ApiProperty({ description: 'Ore motore', example: 1250 })
  engineHours: number;
}

export class WearPredictionDto {
  @ApiProperty({ description: 'ID del componente', example: 'comp_001' })
  componentId: string;

  @ApiProperty({ description: 'Usura attuale (percentuale)', example: 65 })
  currentWear: number;

  @ApiProperty({ description: 'Previsione usura nel tempo' })
  predictedWear: { date: Date; wearPercentage: number }[];

  @ApiProperty({ description: "Fattori che influenzano l'usura" })
  factors: {
    drivingStyle: number;
    mileage: number;
    age: number;
    maintenanceHistory: number;
    environment: number;
  };
}
