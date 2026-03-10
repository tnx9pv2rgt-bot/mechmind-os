/**
 * MechMind OS - Tire Set DTOs
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TireSeason } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateTireSetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiProperty()
  @IsString()
  brand: string;

  @ApiProperty()
  @IsString()
  model: string;

  @ApiProperty({ example: '225/45 R17' })
  @IsString()
  size: string;

  @ApiProperty({ enum: TireSeason })
  @IsEnum(TireSeason)
  season: TireSeason;

  @ApiPropertyOptional({ description: 'Manufacturing date code (DOT)' })
  @IsOptional()
  @IsString()
  dot?: string;

  @ApiPropertyOptional({ description: 'Tread depth in mm' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  treadDepthMm?: number;

  @ApiPropertyOptional({ description: 'Wear level 0-100%' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  wearLevel?: number;

  @ApiPropertyOptional({ description: 'Storage location, e.g. RACK-A3' })
  @IsOptional()
  @IsString()
  storageLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTireSetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ enum: TireSeason })
  @IsOptional()
  @IsEnum(TireSeason)
  season?: TireSeason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dot?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  treadDepthMm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  wearLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class MountTireDto {
  @ApiProperty()
  @IsUUID()
  vehicleId: string;
}

export class StoreTireDto {
  @ApiProperty({ example: 'RACK-A3' })
  @IsString()
  storageLocation: string;
}

export class TireSetQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ enum: TireSeason })
  @IsOptional()
  @IsEnum(TireSeason)
  season?: TireSeason;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  @IsBoolean()
  isStored?: boolean;
}
