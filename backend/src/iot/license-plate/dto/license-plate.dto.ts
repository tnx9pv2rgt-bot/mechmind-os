/**
 * MechMind OS - License Plate DTOs
 */

import { IsString, IsOptional, IsEnum, IsNumber, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OcrProvider, EntryExitType } from '../interfaces/license-plate.interface';

export class DetectLicensePlateDto {
  @ApiProperty({ enum: OcrProvider, required: false, description: 'OCR provider' })
  @IsOptional()
  @IsEnum(OcrProvider)
  provider?: OcrProvider;

  @ApiProperty({ required: false, description: 'Camera ID' })
  @IsOptional()
  @IsString()
  cameraId?: string;

  @ApiProperty({ required: false, description: 'Minimum confidence threshold (0-1)' })
  @IsOptional()
  @IsNumber()
  minConfidence?: number;
}

export class RecordEntryExitDto {
  @ApiProperty({ description: 'Detection ID' })
  @IsString()
  detectionId: string;

  @ApiProperty({ enum: EntryExitType, description: 'Entry or exit' })
  @IsEnum(EntryExitType)
  type: EntryExitType;

  @ApiProperty({ required: false, description: 'Camera ID' })
  @IsOptional()
  @IsString()
  cameraId?: string;

  @ApiProperty({ required: false, description: 'Location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false, description: 'Is authorized entry' })
  @IsOptional()
  @IsBoolean()
  isAuthorized?: boolean;
}

export class RegisterCameraDto {
  @ApiProperty({ description: 'Camera name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Camera location' })
  @IsString()
  location: string;

  @ApiProperty({ enum: EntryExitType, description: 'Camera direction' })
  @IsEnum(EntryExitType)
  direction: EntryExitType;

  @ApiProperty({ enum: OcrProvider, description: 'OCR provider' })
  @IsEnum(OcrProvider)
  provider: OcrProvider;

  @ApiProperty({ description: 'Camera configuration' })
  @IsObject()
  config: {
    minConfidence: number;
    imageQuality: 'LOW' | 'MEDIUM' | 'HIGH';
    captureTrigger: 'ALWAYS' | 'MOTION' | 'LOOP';
    loopInterval?: number;
    cropRegion?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export class LookupPlateDto {
  @ApiProperty({ description: 'License plate number' })
  @IsString()
  licensePlate: string;
}

export class LprStatsQueryDto {
  @ApiProperty({ description: 'From date (ISO 8601)' })
  @IsString()
  from: string;

  @ApiProperty({ description: 'To date (ISO 8601)' })
  @IsString()
  to: string;
}

export class LicensePlateDetectionDto {
  @ApiProperty({ description: 'ID del rilevamento', example: 'det_001' })
  id: string;

  @ApiProperty({
    description: "URL dell'immagine catturata",
    example: 'https://s3.example.com/captures/det_001.jpg',
  })
  imageUrl: string;

  @ApiProperty({ description: 'Testo rilevato', example: 'AB123CD' })
  detectedText: string;

  @ApiProperty({ description: 'Confidenza del rilevamento (0-1)', example: 0.95 })
  confidence: number;

  @ApiPropertyOptional({ description: 'Paese', example: 'IT' })
  country?: string;

  @ApiPropertyOptional({ description: 'Regione', example: 'Lombardia' })
  region?: string;

  @ApiPropertyOptional({ description: 'Tipo di veicolo', example: 'car' })
  vehicleType?: string;

  @ApiProperty({ description: "Bounding box della targa nell'immagine" })
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  @ApiProperty({ description: 'Data di elaborazione', example: '2026-03-16T10:30:00Z' })
  processedAt: Date;

  @ApiProperty({ description: 'Provider OCR utilizzato', enum: OcrProvider })
  provider: OcrProvider;
}

export class VehicleEntryExitDto {
  @ApiProperty({ description: 'ID del record', example: 'ee_001' })
  id: string;

  @ApiProperty({ description: 'Tipo (entrata/uscita)', enum: EntryExitType })
  type: EntryExitType;

  @ApiProperty({ description: 'Targa del veicolo', example: 'AB123CD' })
  licensePlate: string;

  @ApiProperty({ description: 'ID del rilevamento associato', example: 'det_001' })
  detectionId: string;

  @ApiProperty({
    description: "URL dell'immagine",
    example: 'https://s3.example.com/captures/ee_001.jpg',
  })
  imageUrl: string;

  @ApiProperty({ description: 'Confidenza del rilevamento', example: 0.95 })
  confidence: number;

  @ApiProperty({ description: 'Timestamp', example: '2026-03-16T08:30:00Z' })
  timestamp: Date;

  @ApiPropertyOptional({ description: 'Posizione', example: 'Ingresso principale' })
  location?: string;

  @ApiPropertyOptional({ description: 'ID della telecamera', example: 'cam_001' })
  cameraId?: string;

  @ApiPropertyOptional({ description: 'ID del veicolo (se riconosciuto)', example: 'veh_001' })
  vehicleId?: string;

  @ApiPropertyOptional({
    description: "ID dell'ordine di lavoro associato",
    example: 'wo_2026_001',
  })
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'ID della baia assegnata', example: 'bay_001' })
  bayId?: string;

  @ApiProperty({ description: 'Accesso autorizzato', example: true })
  isAuthorized: boolean;
}

export class ParkingSessionDto {
  @ApiProperty({ description: 'ID della sessione', example: 'park_001' })
  id: string;

  @ApiProperty({ description: 'Targa del veicolo', example: 'AB123CD' })
  licensePlate: string;

  @ApiProperty({ description: 'Dati di ingresso', type: VehicleEntryExitDto })
  entry: VehicleEntryExitDto;

  @ApiPropertyOptional({ description: 'Dati di uscita', type: VehicleEntryExitDto })
  exit?: VehicleEntryExitDto;

  @ApiPropertyOptional({ description: 'ID del veicolo', example: 'veh_001' })
  vehicleId?: string;

  @ApiProperty({
    description: 'Stato della sessione',
    enum: ['ACTIVE', 'COMPLETED', 'OVERSTAY'],
    example: 'ACTIVE',
  })
  status: 'ACTIVE' | 'COMPLETED' | 'OVERSTAY';

  @ApiProperty({ description: 'Ora di ingresso', example: '2026-03-16T08:30:00Z' })
  entryTime: Date;

  @ApiPropertyOptional({ description: 'Ora di uscita', example: '2026-03-16T17:00:00Z' })
  exitTime?: Date;

  @ApiPropertyOptional({ description: 'Durata in minuti', example: 510 })
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'ID del posto auto', example: 'spot_A3' })
  parkingSpotId?: string;

  @ApiPropertyOptional({ description: 'Costo parcheggio', example: 0 })
  fees?: number;
}

export class LprCameraDto {
  @ApiProperty({ description: 'ID della telecamera', example: 'cam_001' })
  id: string;

  @ApiProperty({ description: 'Nome della telecamera', example: 'Telecamera ingresso' })
  name: string;

  @ApiProperty({ description: 'Posizione', example: 'Ingresso principale' })
  location: string;

  @ApiProperty({ description: 'Direzione (entrata/uscita)', enum: EntryExitType })
  direction: EntryExitType;

  @ApiProperty({ description: 'Telecamera attiva', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Provider OCR', enum: OcrProvider })
  provider: OcrProvider;

  @ApiProperty({ description: 'Configurazione della telecamera' })
  config: {
    minConfidence: number;
    imageQuality: 'LOW' | 'MEDIUM' | 'HIGH';
    captureTrigger: 'ALWAYS' | 'MOTION' | 'LOOP';
    loopInterval?: number;
    cropRegion?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };

  @ApiPropertyOptional({ description: 'Ultima cattura', example: '2026-03-16T10:30:00Z' })
  lastCapture?: Date;
}

export class LprStatsDto {
  @ApiProperty({ description: 'Rilevamenti totali', example: 1250 })
  totalDetections: number;

  @ApiProperty({ description: 'Confidenza media', example: 0.92 })
  avgConfidence: number;

  @ApiProperty({ description: 'Falsi positivi', example: 15 })
  falsePositives: number;

  @ApiProperty({ description: 'Tempo medio di elaborazione (ms)', example: 120 })
  processingTimeMs: number;

  @ApiProperty({ description: 'Statistiche per provider OCR' })
  byProvider: Record<
    OcrProvider,
    {
      count: number;
      avgConfidence: number;
    }
  >;

  @ApiProperty({ description: 'Rilevamenti per ora del giorno' })
  byHour: Record<number, number>;
}

export class VehicleLookupResponseDto {
  @ApiPropertyOptional({ description: 'Veicolo trovato' })
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    customer: {
      id: string;
      name: string;
      phone?: string;
    };
    workOrders: {
      id: string;
      status: string;
      createdAt: Date;
    }[];
  };

  @ApiProperty({ description: 'Storico recente ingressi/uscite', type: [VehicleEntryExitDto] })
  recentHistory: VehicleEntryExitDto[];

  @ApiPropertyOptional({ description: 'Sessione di parcheggio attiva', type: ParkingSessionDto })
  activeSession?: ParkingSessionDto;
}
