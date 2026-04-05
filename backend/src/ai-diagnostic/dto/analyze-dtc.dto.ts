/**
 * MechMind OS - AI Diagnostic: Analyze DTC Codes DTO
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VehicleInfoDto {
  @ApiProperty({ description: 'Marca veicolo', example: 'Fiat' })
  @IsString()
  make: string;

  @ApiProperty({ description: 'Modello veicolo', example: 'Punto' })
  @IsString()
  model: string;

  @ApiProperty({ description: 'Anno immatricolazione', example: 2020 })
  @IsInt()
  @Min(1900)
  year: number;

  @ApiPropertyOptional({ description: 'Chilometraggio', example: 85000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;
}

export class AnalyzeDtcDto {
  @ApiProperty({
    description: 'Codici DTC da analizzare',
    example: ['P0300', 'P0301', 'P0420'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  codes: string[];

  @ApiProperty({ description: 'Informazioni veicolo', type: VehicleInfoDto })
  @ValidateNested()
  @Type(() => VehicleInfoDto)
  vehicleInfo: VehicleInfoDto;
}

export interface RecommendedRepair {
  description: string;
  estimatedPartsCents: number;
  estimatedLaborHours: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DtcDiagnosisResult {
  diagnosisId: string;
  diagnosis: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  probableCause: string;
  recommendedRepairs: RecommendedRepair[];
  additionalTests: string[];
  confidence: number;
  modelUsed: string;
}
