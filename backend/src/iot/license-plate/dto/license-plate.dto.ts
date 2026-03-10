/**
 * MechMind OS - License Plate DTOs
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
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
  id: string;
  imageUrl: string;
  detectedText: string;
  confidence: number;
  country?: string;
  region?: string;
  vehicleType?: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  processedAt: Date;
  provider: OcrProvider;
}

export class VehicleEntryExitDto {
  id: string;
  type: EntryExitType;
  licensePlate: string;
  detectionId: string;
  imageUrl: string;
  confidence: number;
  timestamp: Date;
  location?: string;
  cameraId?: string;
  vehicleId?: string;
  workOrderId?: string;
  bayId?: string;
  isAuthorized: boolean;
}

export class ParkingSessionDto {
  id: string;
  licensePlate: string;
  entry: VehicleEntryExitDto;
  exit?: VehicleEntryExitDto;
  vehicleId?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'OVERSTAY';
  entryTime: Date;
  exitTime?: Date;
  durationMinutes?: number;
  parkingSpotId?: string;
  fees?: number;
}

export class LprCameraDto {
  id: string;
  name: string;
  location: string;
  direction: EntryExitType;
  isActive: boolean;
  provider: OcrProvider;
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
  lastCapture?: Date;
}

export class LprStatsDto {
  totalDetections: number;
  avgConfidence: number;
  falsePositives: number;
  processingTimeMs: number;
  byProvider: Record<
    OcrProvider,
    {
      count: number;
      avgConfidence: number;
    }
  >;
  byHour: Record<number, number>;
}

export class VehicleLookupResponseDto {
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
  recentHistory: VehicleEntryExitDto[];
  activeSession?: ParkingSessionDto;
}
