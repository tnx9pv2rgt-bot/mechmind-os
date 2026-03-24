import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstimateStatus, EstimateLineType } from '@prisma/client';

export class CreateEstimateLineDto {
  @ApiProperty({ enum: EstimateLineType, example: 'LABOR' })
  @IsEnum(EstimateLineType)
  type: EstimateLineType;

  @ApiProperty({ example: 'Oil change labor' })
  @IsString()
  description: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit price in cents', example: 5000 })
  @IsInt()
  @Min(0)
  unitPriceCents: number;

  @ApiProperty({ description: 'VAT rate as decimal', example: 0.22 })
  @IsNumber()
  @Min(0)
  vatRate: number;

  @ApiPropertyOptional({ description: 'Part ID if type is PART' })
  @IsOptional()
  @IsUUID()
  partId?: string;

  @ApiPropertyOptional({ description: 'Display position', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateEstimateDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Valid until date', example: '2026-04-15T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Discount in cents', example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountCents?: number;

  @ApiPropertyOptional({ example: 'Preventive maintenance estimate' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'User ID who created this estimate' })
  @IsString()
  @IsNotEmpty()
  createdBy: string;

  @ApiPropertyOptional({ type: [CreateEstimateLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEstimateLineDto)
  lines?: CreateEstimateLineDto[];
}

export class UpdateEstimateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  discountCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class EstimateLineResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  estimateId: string;

  @ApiProperty({ enum: EstimateLineType })
  type: EstimateLineType;

  @ApiProperty()
  description: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPriceCents: string;

  @ApiProperty()
  totalCents: string;

  @ApiProperty()
  vatRate: number;

  @ApiPropertyOptional()
  partId?: string | null;

  @ApiProperty()
  position: number;
}

export class EstimateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  estimateNumber: string;

  @ApiProperty()
  customerId: string;

  @ApiPropertyOptional()
  vehicleId?: string | null;

  @ApiProperty({ enum: EstimateStatus })
  status: EstimateStatus;

  @ApiProperty()
  subtotalCents: string;

  @ApiProperty()
  vatCents: string;

  @ApiProperty()
  totalCents: string;

  @ApiProperty()
  discountCents: string;

  @ApiPropertyOptional()
  validUntil?: Date | null;

  @ApiPropertyOptional()
  sentAt?: Date | null;

  @ApiPropertyOptional()
  acceptedAt?: Date | null;

  @ApiPropertyOptional()
  rejectedAt?: Date | null;

  @ApiPropertyOptional()
  bookingId?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [EstimateLineResponseDto] })
  lines?: EstimateLineResponseDto[];
}
