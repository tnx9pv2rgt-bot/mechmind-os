import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsArray, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateWorkOrderDto } from './create-work-order.dto';

export class UpdateWorkOrderDto extends PartialType(CreateWorkOrderDto) {
  @ApiPropertyOptional({ description: 'Versione corrente per optimistic locking', example: 0 })
  @IsOptional()
  @IsNumber()
  version?: number;

  @ApiPropertyOptional({ description: 'Array of labor line items (JSON)' })
  @IsOptional()
  @IsArray()
  laborItems?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Array of parts used (JSON)' })
  @IsOptional()
  @IsArray()
  partsUsed?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Ore di manodopera', example: 2.5 })
  @IsOptional()
  @IsNumber()
  laborHours?: number;

  @ApiPropertyOptional({ description: 'Costo manodopera', example: 125.0 })
  @IsOptional()
  @IsNumber()
  laborCost?: number;

  @ApiPropertyOptional({ description: 'Costo ricambi', example: 85.5 })
  @IsOptional()
  @IsNumber()
  partsCost?: number;

  @ApiPropertyOptional({ description: 'Costo totale', example: 210.5 })
  @IsOptional()
  @IsNumber()
  totalCost?: number;

  @ApiPropertyOptional({ description: 'Chilometraggio in uscita', example: 125430 })
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

  @ApiPropertyOptional({ description: 'ID della baia assegnata', example: 'bay-001' })
  @IsOptional()
  @IsString()
  assignedBayId?: string;

  @ApiPropertyOptional({
    description: 'Data stimata di completamento',
    example: '2026-03-17T16:00:00Z',
  })
  @IsOptional()
  @IsObject()
  estimatedCompletion?: Date;
}
