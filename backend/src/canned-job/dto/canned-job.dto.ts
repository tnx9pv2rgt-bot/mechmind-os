import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCannedJobLineDto {
  @ApiProperty({ description: 'Tipo riga', enum: ['LABOR', 'PART'], example: 'LABOR' })
  @IsEnum(['LABOR', 'PART'] as const)
  type: 'LABOR' | 'PART';

  @ApiProperty({ description: 'Descrizione', example: 'Sostituzione filtro olio' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'ID ricambio', example: 'part-001' })
  @IsOptional()
  @IsString()
  partId?: string;

  @ApiProperty({ description: 'Quantita', example: 1 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Prezzo unitario in centesimi', example: 2500 })
  @IsNumber()
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Ore manodopera (solo LABOR)', example: 0.5 })
  @IsOptional()
  @IsNumber()
  laborHours?: number;

  @ApiPropertyOptional({ description: 'Posizione ordinamento', example: 0 })
  @IsOptional()
  @IsNumber()
  position?: number;
}

export class CreateCannedJobDto {
  @ApiProperty({ description: 'Nome template', example: 'Tagliando 30.000km Golf 7' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Descrizione',
    example: 'Tagliando completo con cambio olio, filtri e controllo livelli',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Categoria', example: 'Manutenzione' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ type: [CreateCannedJobLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCannedJobLineDto)
  lines?: CreateCannedJobLineDto[];
}

export class UpdateCannedJobDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [CreateCannedJobLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCannedJobLineDto)
  lines?: CreateCannedJobLineDto[];
}
