import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsArray, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateWorkOrderDto } from './create-work-order.dto';

export class UpdateWorkOrderDto extends PartialType(CreateWorkOrderDto) {
  @ApiPropertyOptional({ description: 'Array of labor line items (JSON)' })
  @IsOptional()
  @IsArray()
  laborItems?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Array of parts used (JSON)' })
  @IsOptional()
  @IsArray()
  partsUsed?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  laborHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  laborCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  partsCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  mileageOut?: number;

  @ApiPropertyOptional({ description: 'Array of photo URLs (JSON)' })
  @IsOptional()
  @IsArray()
  photos?: string[];

  @ApiPropertyOptional({ description: 'Base64-encoded customer signature' })
  @IsOptional()
  @IsString()
  customerSignature?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedBayId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  estimatedCompletion?: Date;
}
