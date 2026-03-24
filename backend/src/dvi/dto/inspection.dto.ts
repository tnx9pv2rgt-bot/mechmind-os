/**
 * MechMind OS - Digital Vehicle Inspection DTOs
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InspectionStatus,
  InspectionItemStatus,
  FindingSeverity,
  FindingStatus,
  FuelLevel,
} from '@prisma/client';

// ==========================================
// Create Inspection
// ==========================================

export class CreateInspectionDto {
  @ApiProperty({ description: 'Vehicle ID' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ description: 'Customer ID' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ description: 'Template ID to use' })
  @IsUUID()
  templateId: string;

  @ApiProperty({ description: 'Mechanic ID performing inspection' })
  @IsString()
  mechanicId: string;

  @ApiProperty({ description: 'Current mileage', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @ApiProperty({ description: 'Fuel level', enum: FuelLevel, required: false })
  @IsOptional()
  @IsEnum(FuelLevel)
  fuelLevel?: FuelLevel;
}

// ==========================================
// Update Inspection
// ==========================================

export class UpdateInspectionItemDto {
  @ApiProperty({ description: 'Template item ID' })
  @IsUUID()
  templateItemId: string;

  @ApiProperty({ enum: InspectionItemStatus })
  @IsEnum(InspectionItemStatus)
  status: InspectionItemStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ enum: FindingSeverity, required: false })
  @IsOptional()
  @IsEnum(FindingSeverity)
  severity?: FindingSeverity;
}

export class UpdateInspectionDto {
  @ApiProperty({ enum: InspectionStatus, required: false })
  @IsOptional()
  @IsEnum(InspectionStatus)
  status?: InspectionStatus;

  @ApiProperty({ description: 'Current mileage', required: false })
  @IsOptional()
  @IsInt()
  mileage?: number;

  @ApiProperty({
    description: 'Inspection items',
    type: [UpdateInspectionItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateInspectionItemDto)
  items?: UpdateInspectionItemDto[];
}

// ==========================================
// Add Finding
// ==========================================

export class CreateFindingDto {
  @ApiProperty({ description: 'Category of finding' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Title of finding' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed description' })
  @IsString()
  description: string;

  @ApiProperty({ enum: FindingSeverity })
  @IsEnum(FindingSeverity)
  severity: FindingSeverity;

  @ApiProperty({ description: 'Recommended action', required: false })
  @IsOptional()
  @IsString()
  recommendation?: string;

  @ApiProperty({ description: 'Estimated repair cost', required: false })
  @IsOptional()
  @IsNumber()
  estimatedCost?: number;
}

export class UpdateFindingDto {
  @ApiProperty({ enum: FindingStatus, required: false })
  @IsOptional()
  @IsEnum(FindingStatus)
  status?: FindingStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  approvedByCustomer?: boolean;
}

// ==========================================
// Upload Photo
// ==========================================

export class UploadPhotoDto {
  @ApiProperty({ description: 'Item ID if photo is for specific item', required: false })
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiProperty({ description: 'Photo category', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Photo description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

// ==========================================
// Customer Approval
// ==========================================

export class CustomerApprovalDto {
  @ApiProperty({ description: 'Customer email for verification' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Customer signature (base64)', required: false })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiProperty({ description: 'Approved findings', type: [String] })
  @IsArray()
  @IsString({ each: true })
  approvedFindingIds: string[];

  @ApiProperty({ description: 'Declined findings', type: [String] })
  @IsArray()
  @IsString({ each: true })
  declinedFindingIds: string[];
}

// ==========================================
// Query Parameters
// ==========================================

export class InspectionQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ enum: InspectionStatus, required: false })
  @IsOptional()
  @IsEnum(InspectionStatus)
  status?: InspectionStatus;

  @ApiPropertyOptional({
    description: 'ID del meccanico',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  mechanicId?: string;

  @ApiPropertyOptional({ description: 'Numero di pagina', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Risultati per pagina', example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

// ==========================================
// Response DTOs
// ==========================================

export class InspectionPhotoResponseDto {
  @ApiProperty({ description: 'ID della foto', example: 'photo_001' })
  id: string;

  @ApiProperty({
    description: 'URL della foto',
    example: 'https://s3.example.com/inspections/photo_001.jpg',
  })
  url: string;

  @ApiPropertyOptional({
    description: 'URL della miniatura',
    example: 'https://s3.example.com/inspections/photo_001_thumb.jpg',
  })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Categoria della foto', example: 'Freni' })
  category?: string;

  @ApiPropertyOptional({ description: 'Descrizione', example: 'Usura pastiglie freno anteriori' })
  description?: string;

  @ApiProperty({ description: 'Data di scatto', example: '2026-03-16T10:15:00Z' })
  takenAt: Date;
}

export class InspectionItemResponseDto {
  @ApiProperty({ description: "ID dell'elemento", example: 'item_001' })
  id: string;

  @ApiProperty({ description: 'Categoria', example: 'Freni' })
  category: string;

  @ApiProperty({ description: "Nome dell'elemento", example: 'Pastiglie freno anteriori' })
  name: string;

  @ApiProperty({ description: "Stato dell'ispezione", enum: InspectionItemStatus })
  status: InspectionItemStatus;

  @ApiPropertyOptional({ description: 'Note', example: 'Usura al 70%, sostituzione consigliata' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Severità', enum: FindingSeverity })
  severity?: FindingSeverity;

  @ApiProperty({ description: 'Foto associate', type: [InspectionPhotoResponseDto] })
  photos: InspectionPhotoResponseDto[];
}

export class InspectionFindingResponseDto {
  @ApiProperty({ description: 'ID del riscontro', example: 'find_001' })
  id: string;

  @ApiProperty({ description: 'Categoria', example: 'Freni' })
  category: string;

  @ApiProperty({ description: 'Titolo', example: 'Pastiglie freno usurate' })
  title: string;

  @ApiProperty({
    description: 'Descrizione dettagliata',
    example: 'Le pastiglie freno anteriori presentano usura al 70%',
  })
  description: string;

  @ApiProperty({ description: 'Severità', enum: FindingSeverity })
  severity: FindingSeverity;

  @ApiPropertyOptional({
    description: 'Azione raccomandata',
    example: 'Sostituire pastiglie freno entro 5000 km',
  })
  recommendation?: string;

  @ApiPropertyOptional({ description: 'Costo stimato della riparazione', example: 180.0 })
  estimatedCost?: number;

  @ApiProperty({ description: 'Stato del riscontro', enum: FindingStatus })
  status: FindingStatus;

  @ApiProperty({ description: 'Approvato dal cliente', example: true })
  approvedByCustomer: boolean;
}

export class InspectionResponseDto {
  @ApiProperty({ description: "ID dell'ispezione", example: 'insp_001' })
  id: string;

  @ApiProperty({ description: "Stato dell'ispezione", enum: InspectionStatus })
  status: InspectionStatus;

  @ApiProperty({ description: 'Data di inizio', example: '2026-03-16T09:00:00Z' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Data di completamento', example: '2026-03-16T10:30:00Z' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Chilometraggio', example: 45200 })
  mileage?: number;

  @ApiPropertyOptional({ description: 'Livello carburante', enum: FuelLevel })
  fuelLevel?: FuelLevel;

  @ApiProperty({ description: 'Dati del veicolo' })
  vehicle: {
    id: string;
    make: string;
    model: string;
    licensePlate: string;
  };

  @ApiProperty({ description: 'Dati del cliente' })
  customer: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: 'Dati del meccanico' })
  mechanic: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: 'Elementi ispezionati', type: [InspectionItemResponseDto] })
  items: InspectionItemResponseDto[];

  @ApiProperty({ description: 'Riscontri trovati', type: [InspectionFindingResponseDto] })
  findings: InspectionFindingResponseDto[];

  @ApiProperty({ description: "Foto dell'ispezione", type: [InspectionPhotoResponseDto] })
  photos: InspectionPhotoResponseDto[];

  @ApiProperty({ description: 'Cliente notificato', example: true })
  customerNotified: boolean;

  @ApiProperty({ description: 'Cliente ha visualizzato', example: false })
  customerViewed: boolean;

  @ApiPropertyOptional({ description: 'Data di approvazione', example: '2026-03-16T14:00:00Z' })
  approvedAt?: Date;
}

export class InspectionSummaryDto {
  @ApiProperty({ description: "ID dell'ispezione", example: 'insp_001' })
  id: string;

  @ApiProperty({ description: 'Stato', enum: InspectionStatus })
  status: InspectionStatus;

  @ApiProperty({ description: 'Data di inizio', example: '2026-03-16T09:00:00Z' })
  startedAt: Date;

  @ApiProperty({ description: 'Info veicolo', example: 'Fiat Panda 2023 - AB123CD' })
  vehicleInfo: string;

  @ApiProperty({ description: 'Nome del cliente', example: 'Mario Rossi' })
  customerName: string;

  @ApiProperty({ description: 'Nome del meccanico', example: 'Marco Bianchi' })
  mechanicName: string;

  @ApiProperty({ description: 'Problemi riscontrati', example: 3 })
  issuesFound: number;

  @ApiProperty({ description: 'Problemi critici', example: 1 })
  criticalIssues: number;
}
