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
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
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
  @IsUUID()
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mechanicId?: string;
}

// ==========================================
// Response DTOs
// ==========================================

export class InspectionPhotoResponseDto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  category?: string;
  description?: string;
  takenAt: Date;
}

export class InspectionItemResponseDto {
  id: string;
  category: string;
  name: string;
  status: InspectionItemStatus;
  notes?: string;
  severity?: FindingSeverity;
  photos: InspectionPhotoResponseDto[];
}

export class InspectionFindingResponseDto {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  recommendation?: string;
  estimatedCost?: number;
  status: FindingStatus;
  approvedByCustomer: boolean;
}

export class InspectionResponseDto {
  id: string;
  status: InspectionStatus;
  startedAt: Date;
  completedAt?: Date;
  mileage?: number;
  fuelLevel?: FuelLevel;
  vehicle: {
    id: string;
    make: string;
    model: string;
    licensePlate: string;
  };
  customer: {
    id: string;
    name: string;
  };
  mechanic: {
    id: string;
    name: string;
  };
  items: InspectionItemResponseDto[];
  findings: InspectionFindingResponseDto[];
  photos: InspectionPhotoResponseDto[];
  customerNotified: boolean;
  customerViewed: boolean;
  approvedAt?: Date;
}

export class InspectionSummaryDto {
  id: string;
  status: InspectionStatus;
  startedAt: Date;
  vehicleInfo: string;
  customerName: string;
  mechanicName: string;
  issuesFound: number;
  criticalIssues: number;
}
